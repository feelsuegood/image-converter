const dotenv = require("dotenv");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const AWS = require("aws-sdk");
const multerS3 = require("multer-s3"); // Must use multer-s3@2.10.0
const { v4: uuidv4 } = require("uuid");

dotenv.config();

const s3 = new AWS.S3();
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

// * Create the S3 bucket
const bucketName = "cloud-project-partners-14-s3";
const queueName = "cloud-project-partners-14-sqs";

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

// * create sqs queue
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

// Set up Multer storage configuration
const storage = multer.memoryStorage(); // Store the image in memory for processing

// Set up Multer file filter configuration
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error("Only JPEG, PNG, and GIF types are allowed!"), false);
  } else {
    cb(null, true);
  }
};

// Set up Multer upload configuration
const fileSize = 2; // * file size limit: 5MB
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: fileSize * 1024 * 1024 },
});

const pageTitle = "CAB432 Cloud Project Partners 14";
const maxWidth = 1920;
const maxHeight = 1080;

// * load main page template
const handleHome = (req, res) => {
  res.render("index", {
    pageTitle,
    fileSize,
    maxWidth,
    maxHeight,
  });
};

// * convert an image by using sqs queue
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
      // Retrieve the uploaded image from S3
      const retrievedImage = await s3
        .getObject({
          Bucket: bucketName,
          Key: newFilename,
        })
        .promise();

      const imageBase64 = retrievedImage.Body.toString("base64");

      // Render the result
      res.render("index", {
        pageTitle,
        result: `File uploaded to S3. A converted file name is ${newFilename}. Dimension is ${desiredWidth}x${desiredHeight}.`,
        newFilename,
        convertedImage: imageBase64, // Pass the image data to the view
        originalFilename,
        fileSize,
        maxWidth,
        maxHeight,
      });
    }
  } catch (error) {
    console.error(`🔴 Error: ${error.message}`);
    res.render("index", {
      pageTitle,
      result: `Error uploading to S3: ${error.message}`,
    });
  }
};

module.exports = { upload, handleHome, handleConvert };
