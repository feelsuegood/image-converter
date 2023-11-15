const dotenv = require("dotenv");
dotenv.config();

const AWS = require("aws-sdk");
// module for image conversion
const sharp = require("sharp");
const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

const bucketName = process.env.AWS_S3_BUCKET_NAME;
const queueName = process.env.AWS_SQS_QUEUE_NAME;
const sqsQueueUrl = process.env.AWS_SQS_URL;

// Create the S3 bucket
const createS3bucket = async () => {
  // CORS configuration
  const addCorsConfiguration = async () => {
    const client = new S3Client({ region: process.env.AWS_REGION });

    const corsCommand = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "POST", "PUT", "HEAD"],
            AllowedOrigins: ["*"],
          },
        ],
      },
    });

    try {
      await client.send(corsCommand);
      console.log(`🔹 CORS configuration added to the bucket: ${bucketName}`);
    } catch (error) {
      console.error(`Error adding CORS configuration: ${error}`);
    }
  };

  try {
    await s3.createBucket({ Bucket: bucketName }).promise();
    console.log(`🟢 Created bucket: ${bucketName}`);
  } catch (err) {
    if (err.statusCode === 409) {
      console.log(
        `🔹 Bucket "${bucketName}" already exists. Updating CORS configuration.`
      );
    } else {
      console.log(`🔴 Error creating bucket: ${err}`);
      return; // Stop further execution in case of errors other than bucket already exists
    }
  }

  // Apply or update CORS configuration
  await addCorsConfiguration();
};

// Call createS3bucket function
(async () => {
  await createS3bucket();
})();

// Create SQS queue
const createQueue = async (queueName) => {
  const params = {
    QueueName: queueName,
  };

  // List existing queues to check for same queue name
  try {
    const listQueuesResponse = await sqs.listQueues().promise();
    const existingQueues = listQueuesResponse.QueueUrls || [];

    // Check if queue with the same name already exists
    const duplicateQueue = existingQueues.find((url) =>
      url.endsWith(`/${queueName}`)
    );
    if (duplicateQueue) {
      console.log(
        `🔹 Queue "${queueName}" already exists at URL: ${duplicateQueue}`
      );
      return;
    }
  } catch (error) {
    console.error("🔴 Error listing queues:", error);
  }

  // Create the new queue if no same queue found
  try {
    const result = await sqs.createQueue(params).promise();
    console.log(`🔹 Queue URL: ${result.QueueUrl}`);
  } catch (error) {
    console.error("🔴 Error creating queue:", error);
  }
};

// Call createQueue function
createQueue(queueName);

// Process the message and convert the image
const processImage = async (message) => {
  // Check the message body by logging it
  console.log("🟢 SQS message body:", message.Body);
  // get the info from sqs message
  const { filename, width, height, format, bucketName } = JSON.parse(
    message.Body
  );

  // get the original image from s3
  try {
    const getObjectResponse = await s3
      .getObject({
        Bucket: bucketName,
        Key: filename,
      })
      .promise();

    if (!getObjectResponse.Body) {
      throw new Error(`Failed to get object from S3: ${filename}`);
    }

    const imageBuffer = getObjectResponse.Body;
    const processedBuffer = await sharp(imageBuffer)
      .resize(width, height)
      .toFormat(format)
      .toBuffer();

    const convertedFilename = "converted_" + filename;

    // Upload the converted image to s3
    await s3
      .upload({
        Bucket: bucketName,
        Key: convertedFilename,
        Body: processedBuffer,
        ContentType: `image/${format}`,
        ContentDisposition: `attachment; filename="${convertedFilename}"`,
      })
      .promise();

    console.log("🟢 Conversion completed:", convertedFilename);
  } catch (error) {
    console.error("🔴 Error in image processing:", error.message.slice(0, 50));
    throw error; // Rethrow error to handle it in the calling function
  }
};

const deleteMessage = async (ReceiptHandle) => {
  try {
    await sqs
      .deleteMessage({
        QueueUrl: sqsQueueUrl,
        ReceiptHandle: ReceiptHandle,
      })
      .promise();
    console.log("🟢 Message Deleted Successfully");
  } catch (error) {
    console.error("🔴 Error deleting SQS message:", error.message(0, 50));
  }
};

// Poll the SQS queue for new messages
const pollSQSQueue = async () => {
  while (true) {
    try {
      const { Messages } = await sqs
        .receiveMessage({
          QueueUrl: sqsQueueUrl, // Use the environment variable
          MaxNumberOfMessages: 10, // get multiple messages at the same time(maximum: 10)
          WaitTimeSeconds: 5,
        })
        .promise();
      if (Messages && Messages.length > 0) {
        const processingPromises = Messages.map(async (message) => {
          try {
            await processImage(message);
          } catch (error) {
            console.error("🔴 Error processing a message:", error);
            // Handle specific message error here (e.g., logging or retrying)
          } finally {
            // Attempt to delete message whether or not processing was successful
            await deleteMessage(message.ReceiptHandle);
          }
        });

        await Promise.allSettled(processingPromises);
      }
    } catch (error) {
      console.error("🔴 SQS receiveMessage error:", error);
    }
  }
};

// Call pollSQSQueue function
pollSQSQueue().catch((error) => {
  console.error("🔴 SQS polling error:", error);
});
