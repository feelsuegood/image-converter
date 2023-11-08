const dotenv = require("dotenv");
dotenv.config();

const AWS = require("aws-sdk");
// module for image conversion
const sharp = require("sharp");

// * Set up AWS configuration
const s3 = new AWS.S3();
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

const bucketName = process.env.AWS_S3_BUCKET_NAME;
const queueName = process.env.AWS_SQS_QUEUE_NAME;

// * Create the S3 bucket in SQS queue
async function createS3bucket() {
  try {
    await s3.createBucket({ Bucket: bucketName }).promise();
    console.log(`🟢 Created bucket: ${bucketName}`);
  } catch (err) {
    if (err.statusCode === 409) {
      console.log(`🟡 Bucket "${bucketName}" already exists`);
    } else {
      console.log(`🔴 Error creating bucket: ${err}`);
    }
  }
}

// * Call createS3bucket function
(async () => {
  await createS3bucket();
})();

// * Create SQS queue
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
        `🟡 Queue "${queueName}" already exists at URL: ${duplicateQueue}`
      );
      return;
    }
  } catch (error) {
    console.error("🔴 Error listing queues:", error);
  }

  // Create the new queue if no same queue found
  try {
    const result = await sqs.createQueue(params).promise();
    console.log(`🟢 Queue URL: ${result.QueueUrl}`);
  } catch (error) {
    console.error("🔴 Error creating queue:", error);
  }
};

// * call createQueue function
createQueue(queueName);

// * Poll the SQS queue for new messages
const pollSQSQueue = async () => {
  const params = {
    QueueUrl: sqsQueueUrl,
    MaxNumberOfMessages: 1, // The number of messages to get for a one time
    WaitTimeSeconds: 20, // Long Polling setting
  };

  while (true) {
    try {
      const data = await sqs.receiveMessage(params).promise();

      if (data.Messages) {
        for (const message of data.Messages) {
          const body = JSON.parse(message.Body);
          await processImage(body);

          // Delete completed message from the queue
          const deleteParams = {
            QueueUrl: sqsQueueUrl,
            ReceiptHandle: message.ReceiptHandle,
          };
          await sqs.deleteMessage(deleteParams).promise();
        }
      }
    } catch (err) {
      console.error("Error processing message:", err);
    }
  }
};

// * Handle SQS Part: Process the message and convert the image
const processImage = async ({ key, width, height, format }) => {
  try {
    // Get image from S3
    const originalImage = await s3
      .getObject({ Bucket: bucketName, Key: key })
      .promise();

    // Image Conversion
    const convertedImage = await sharp(originalImage.Body)
      .resize(parseInt(width), parseInt(height))
      .toFormat(format)
      .toBuffer();

    // Save the converted image back to S3
    const newKey = key.split(".")[0] + `.${format}`;
    await s3
      .upload({
        Bucket: bucketName,
        Key: newKey,
        Body: convertedImage,
      })
      .promise();

    // 변환된 이미지의 URL 반환
    const url = s3.getSignedUrl("getObject", {
      Bucket: bucketName,
      Key: newKey,
      Expires: 60,
    });
    res.json({ url });
  } catch (err) {
    console.error("Error processing image:", err);
  }
};

// ** Call "pollSQSQueue" function **
pollSQSQueue();
