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

const bucketName = "cloud-project-partners-14-s3";
const queueName = "cloud-project-partners-14-sqs";

const pageTitle = "CAB432 Cloud Project Partners 14";
const fileSize = 2; // * file size limit: 2MB
const maxWidth = 800;
const maxHeight = 800;

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
(async () => {
  await createS3bucket();
})();

// * Create SQS queue
const createQueue = async (queueName) => {
  const params = {
    QueueName: queueName,
  };

  // List existing queues to check for duplicates
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

  // Create the new queue if no duplicate found
  try {
    const result = await sqs.createQueue(params).promise();
    console.log(`🟢 Queue URL: ${result.QueueUrl}`);
  } catch (error) {
    console.error("🔴 Error creating queue:", error);
  }
};

createQueue(queueName);

// * Setup Multer configuration
const storage = multer.memoryStorage(); // Store the image in memory for processing

// Set up Multer file filter configuration
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error("Only JPEG, GIF, and WEBP types are allowed!"), false);
  } else {
    cb(null, true);
  }
};

// Set up Multer upload configuration
const upload = multer({
  storage: storage,
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

// * Function to handle image conversion
const handleConvert = async (req, res) => {
  // check if the file is uploaded
  console.log("🟢 req.file:", req.file);
  console.log("🟢 req.body:", req.body);

  // Get the desired image width and height from the user
  const desiredWidth = parseInt(req.body.width, 10);
  const desiredHeight = parseInt(req.body.height, 10);
  const desiredFormat = req.body.format.toLowerCase();
  const imageBuffer = req.file.buffer;
  const originalFilename = req.file.originalname;

  // Generate a unique filename
  const newFilename = uuidv4() + "." + desiredFormat;

  // upload an original image file to s3
  try {
    await s3
      .upload({
        Bucket: bucketName,
        Key: newFilename,
        Body: imageBuffer,
        ContentType: `image/${desiredFormat}`,
      })
      .promise();
    console.log("🟢 uploaded successfully");
  } catch (error) {
    console.error("🔴 S3 upload error:", error);
    return res.status(500).send("Failed to upload to S3");
  }

  // Create a message to send to the SQS queue with relevant information
  const messageParams = {
    QueueUrl: process.env.AWS_SQS_URL, // Replace with your actual SQS queue URL
    MessageBody: JSON.stringify({
      filename: newFilename,
      width: desiredWidth,
      height: desiredHeight,
      format: desiredFormat,
      bucketName: bucketName,
    }),
  };
  console.log("🟢 messageParams:", messageParams);

  try {
    // Send the message to the SQS queue
    console.log("🟢 Sending message to queue...");
    await sqs.sendMessage(messageParams).promise();

    // Wait for the SQS job to complete
    console.log("🟢 Waiting for message from queue...");
    const { Messages } = await sqs
      .receiveMessage({
        QueueUrl: process.env.AWS_SQS_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 5,
      })
      .promise();

    if (Messages && Messages.length > 0) {
      console.log("🟢 Message received. Processing...");
      await processMessage(Messages[0]);
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

        // Apply sharp operations to raise CPU utilisation
        const enhancedImageBuffer = await sharp(retrievedImage.Body)
          .blur(10) // Applies a blur filter to the image
          .sharpen() // Applies a sharpening filter to the image
          .normalize() // Normalizes the image's channel values
          .rotate(90) // Rotates the image 90 degrees
          .flip() // Flips the image vertically
          .flop() // Flips the image horizontally
          .resize({
            // Resizes the image to higher dimensions
            width: 2000,
            height: 2000,
            withoutEnlargement: false, // Allows the image to be enlarged
          })
          .jpeg({
            quality: 100, // Sets the quality of the image to 100%
          })
          .toBuffer(); // Converts the processed image to a Buffer object

        // Render the result
        res.render("index", {
          pageTitle,
          result: `A converted file name is ${newFilename}. Dimension is ${desiredWidth}x${desiredHeight}.`,
          newFilename,
          convertedImage: imageBase64, // Pass the image data to the view
          originalFilename,
          fileSize,
          maxWidth,
          maxHeight,
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

// * SQS: Process the message and convert the image
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

// * Poll the SQS queue for new messages
const pollSQSQueue = async () => {
  while (true) {
    const params = {
      QueueUrl: process.env.AWS_SQS_URL, // Use the environment variable
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 20,
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

// * Export functions for external use
module.exports = { upload, handleHome, handleConvert };
