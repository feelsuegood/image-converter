const dotenv = require("dotenv");
const AWS = require("aws-sdk");
const sharp = require("sharp");

dotenv.config();

const s3 = new AWS.S3();
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

// * Save processed file names with global variables
const completedFiles = new Map();

// * process the message: convert image
const processMessage = async (message) => {
  console.log("🟢 SQS message body:", message.Body);
  // get the info from sqs message
  const { filename, width, height, format, bucketName } = JSON.parse(
    message.Body
  );

  // get the original image from s3
  const params = {
    Bucket: bucketName,
    Key: filename,
  };

  //*
  console.log("🟢 S3 getObject Params:", params);

  try {
    const getObjectResponse = await s3.getObject(params).promise();

    // Check for empty or null response
    if (!getObjectResponse.Body) {
      throw new Error(`Failed to get object from S3: ${filename}`);
    }

    const imageBuffer = getObjectResponse.Body;

    // Perform image converting
    const processedBuffer = await sharp(imageBuffer)
      .resize(width, height) // change the size
      .toFormat(format) // Change the format
      .toBuffer();

    // Upload the converted image to S3
    await s3
      .upload({
        Bucket: bucketName,
        Key: filename,
        Body: processedBuffer,
        ContentType: `image/${format}`,
      })
      .promise();

    // Add processed file names to Map
    completedFiles.set(filename, true);
    try {
      // Delete the processed message from the SQS queue
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
