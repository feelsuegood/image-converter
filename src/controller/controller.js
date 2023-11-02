// * Import necessary modules
const dotenv = require("dotenv");
dotenv.config();

// * Load AWS SDK and other modules
const AWS = require("aws-sdk");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const multerS3 = require("multer-s3"); // Must use multer-s3@2.10.0
const { v4: uuidv4 } = require("uuid");

// * Initialize AWS services
const s3 = new AWS.S3();
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

// * Global variables to hold processed files
const completedFiles = new Map();

const bucketName = process.env.AWS_S3_BUCKET_NAME;
const queueName = process.env.AWS_SQS_QUEUE_NAME;
const pageTitle = "Image Converter";
const fileSize = 10; // * file size limit: 10MB
const maxWidth = 1920;
const maxHeight = 1080;

// * Create the S3 bucket
async function createS3bucket() {
  try {
    await s3.createBucket({ Bucket: bucketName }).promise();
    console.log(`🟢 Created bucket: ${bucketName}`);
  } catch (err) {
    if (err.statusCode === 409) {
      console.log(`🟡 Bucket already exists: ${bucketName}`);
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
        `🟡 Queue with name ${queueName} already exists at URL: ${duplicateQueue}`
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

// * Set up Multer file filter configuration
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error("Only JPEG, GIF, and WEBP types are allowed!"), false);
  } else {
    cb(null, true);
  }
};

// * Setup Multer with S3 configuration
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: bucketName,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, uuidv4() + path.extname(file.originalname));
    },
  }),
  fileFilter: fileFilter,
  limits: { fileSize: fileSize * 1024 * 1024 },
});

// * Handle main page rendering
const handleHome = (req, res) => {
  res.render("index", {
    pageTitle,
    fileSize,
    maxWidth,
    maxHeight,
  });
};

// ! Function to handle image conversion
const handleConvert = async (req, res) => {
  // Get the desired image width and height from the user
  const desiredWidth = parseInt(req.body.width, 10);
  const desiredHeight = parseInt(req.body.height, 10);
  const desiredFormat = req.body.format.toLowerCase();
  const originalFilename = req.file.key;
  const newFilename = req.file.key.split(".")[0] + "." + desiredFormat; // S3 Object Key

  // * Create a message to send to the SQS queue with relevant information
  const messageParams = {
    QueueUrl: process.env.AWS_SQS_URL, // Replace with your actual SQS queue URL
    MessageBody: JSON.stringify({
      filename: originalFilename,
      width: desiredWidth,
      height: desiredHeight,
      format: desiredFormat,
      bucketName: bucketName,
    }),
  };

  // ! Related to SQS queue
  try {
    // Send the message to the SQS queue
    console.log("🟢 Sending message to queue...");
    await sqs.sendMessage(messageParams).promise();

    // Wait for the SQS job to complete
    console.log("🟢 Waiting for message from queue...");
    const { Messages } = await sqs
      .receiveMessage({
        QueueUrl: process.env.AWS_SQS_URL,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 5,
      })
      .promise();
    if (Messages && Messages.length > 0) {
      // Process multiple messages in parallel
      await Promise.all(
        Messages.map(async (message) => {
          await processMessage(message); // Process each message
        })
      );
    } else {
      // connect image and sqs message
      if (completedFiles.has(newFilename)) {
        // Since the image processing operation is finished, import the image back from S3.
        const retrievedImage = await s3
          .getObject({
            Bucket: bucketName,
            Key: newFilename,
          })
          .promise();
        const imageBase64 = retrievedImage.Body.toString("base64");

        // Render the result
        res.render("result", {
          pageTitle,
          resultFilename: newFilename,
          resultDimensions: `${desiredWidth}x${desiredHeight}`,
          convertedImage: imageBase64, // Pass the image data to the view
          fileSize,
        });
      }
    }
  } catch (error) {
    console.error(`🔴 Error: ${error.message}`);
    res.render("error", {
      pageTitle,
      result: `Error uploading to S3: ${error.message}`,
    });
  }
};

// ! Handle SQS Part: Process the message and convert the image
const processMessage = async (message) => {
  // Check the message body by logging it
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

  console.log("🟢 original image S3 getObject Params:", params);

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

    const newFilename = filename.split(".")[0] + "." + format;

    // Upload the converted image to S3
    await s3
      .upload({
        Bucket: bucketName,
        Key: newFilename,
        Body: processedBuffer,
        ContentType: `image/${format}`,
      })
      .promise();

    // Add processed file names to Map
    completedFiles.set(newFilename, true);
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
  }
};

// * Poll the SQS queue for new messages
const pollSQSQueue = async () => {
  while (true) {
    const params = {
      QueueUrl: process.env.AWS_SQS_URL, // Use the environment variable
      MaxNumberOfMessages: 10, // get multiple messages at the same time(maximum: 10)
      WaitTimeSeconds: 5,
    };

    try {
      const { Messages } = await sqs.receiveMessage(params).promise();

      if (Messages && Messages.length > 0) {
        // Process multiple messages in parallel
        await Promise.all(
          Messages.map(async (message) => {
            await processMessage(message);
          })
        );
      }
    } catch (error) {
      console.error("🔴 SQS receiveMessage error:", error);
    }
  }
};

pollSQSQueue().catch((error) => {
  console.error("🔴 SQS polling error:", error);
});

// Export functions for routes
module.exports = { upload, handleHome, handleConvert };
