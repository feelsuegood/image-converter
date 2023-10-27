const dotenv = require("dotenv");
const AWS = require("aws-sdk");
const sharp = require("sharp");
const { uploadToS3 } = require("../utils/s3Utils");

dotenv.config();

const s3 = new AWS.S3();
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

const processMessage = async (message) => {
  console.log("🟢 SQS message body:", message.Body);

  // get the info from sqs message
  const messageParams = JSON.parse(JSON.parse(message.Body).MessageBody);
  const { filename, width, height, format, bucketName } = messageParams;
  console.log("Parsed SQS message:", JSON.parse(message.Body));
  console.log("Message Parameters:", messageParams);

  // get the original image from s3
  const params = {
    Bucket: bucketName,
    Key: filename,
  };

  //*
  console.log("🟢 S3 getObject Params:", params);

  try {
    console.log(`🟢 Bucket: ${bucketName}, Filename: ${filename}`);

    const getObjectResponse = await s3.getObject(params).promise();

    // Check for empty or null response
    if (!getObjectResponse.Body) {
      throw new Error(`Failed to get object from S3: ${filename}`);
    }

    const imageBuffer = getObjectResponse.Body;

    // Perform image converting
    const processedBuffer = await sharp(imageBuffer)
      .resize(width, height)
      .toFormat(format) // Change the format here, e.g., "png" or "webp"
      .toBuffer();

    // Upload the converted image to S3
    await uploadToS3(bucketName, filename, processedBuffer, `image/${format}`);

    // Delete the processed message from the SQS queue
    try {
      await sqs
        .deleteMessage({
          QueueUrl: process.env.AWS_SQS_URL,
          ReceiptHandle: message.ReceiptHandle,
        })
        .promise();
      console.log("🟢 Message Deleted Successfully");
    } catch (error) {
      console.log("🔴 Delete Error", error);
    }
  } catch (error) {
    console.error("🔴 Error processing message:", error);
    // Handle the error, possibly by sending a notification or logging it
  }
};

const pollSQSQueue = async () => {
  while (true) {
    const params = {
      QueueUrl: process.env.AWS_SQS_URL, // Use the environment variable
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20, // Adjust as needed
    };

    try {
      const { Messages } = await sqs.receiveMessage(params).promise();
      if (Messages && Messages.length > 0) {
        await processMessage(Messages[0]);
      }
    } catch (error) {
      console.error("🔴 SQS receiveMessage error:", error);
      // Handle the error, possibly by sending a notification or logging it
    }
  }
};

pollSQSQueue().catch((error) => {
  console.error("🔴 SQS polling error:", error);
});
