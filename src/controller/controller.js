const dotenv = require("dotenv");
dotenv.config();

const AWS = require("aws-sdk");
const multer = require("multer");
const path = require("path");
const multerS3 = require("multer-s3"); // Must use multer-s3@2.10.0
const { v4: uuidv4 } = require("uuid");

// * Initialize AWS services
const s3 = new AWS.S3();
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

const bucketName = process.env.AWS_S3_BUCKET_NAME;

const pageTitle = "Image Converter";
const fileSize = 10; // * file size limit: 10MB
const maxWidth = 1920;
const maxHeight = 1080;

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

// * handle image conversion rendering
const handleConvert = async (req, res) => {
  // Get the desired image width, height, and format from a user
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

  // ! Related to SQS queue processing
  try {
    // Send the message to the SQS queue
    console.log("🟢 Sending message to queue...");
    await sqs.sendMessage(messageParams).promise();
    console.log("📤 SQS message body:", messageParams.MessageBody);

    // Wait for the SQS job to complete
    console.log("🟢 Waiting for message from queue...");
    const maxWaitTime = 10000; // Maximum wait time (10 seconds)
    const pollInterval = 1000; // Polling interval (1 second)
    let elapsedTime = 0;

    // Function to check if the processed image file exists in S3
    const checkComplete = async () => {
      try {
        await s3
          .getObject({
            Bucket: bucketName,
            Key: newFilename,
          })
          .promise();

        return true; // Return true if file exists
      } catch (error) {
        // Return false if file does not exist or other errors occur
        return false;
      }
    };

    while (elapsedTime < maxWaitTime) {
      const conditionMet = await checkComplete();
      if (conditionMet) {
        break; // Exit the loop if the condition is met
      }

      // If the condition is not met, wait for the specified interval
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      elapsedTime += pollInterval;
    }

    // Get the converted image from S3
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
      convertedImage: imageBase64, // Pass the image data to the view template
      fileSize,
    });
  } catch (error) {
    console.error(`🔴 Error(controller): ${error.message}`);
    res.render("error", {
      pageTitle,
      result: `Error uploading to S3: ${error.message}`,
    });
  }
};

// Export callback function to router
module.exports = { handleHome, upload, handleConvert };
