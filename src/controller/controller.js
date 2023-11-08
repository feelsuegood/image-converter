const dotenv = require("dotenv");
dotenv.config();

const AWS = require("aws-sdk");
// const path = require("path");
const { v4: uuidv4 } = require("uuid");

// * Initialize AWS services
const s3 = new AWS.S3();
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

const bucketName = process.env.AWS_S3_BUCKET_NAME;

const pageTitle = "Image Converter";
const fileSize = 10; // * file size limit: 10MB
const maxWidth = 1920;
const maxHeight = 1080;

// * Handle main page rendering
const handleHome = (req, res) => {
  res.render("index", {
    pageTitle,
    fileSize,
    maxWidth,
    maxHeight,
  });
};

// * call-back function that generates pre-signed URL
const handleGetPresignedUrl = async (req, res) => {
  console.log("req.body:", req.body);
  const format = req.body.format || "jpg";
  const key = `${uuidv4()}.${format}`;

  const params = {
    Bucket: bucketName,
    Key: key,
    Expires: 60, // expires in 60 seconds
  };

  try {
    const url = await s3.getSignedUrlPromise("putObject", params);
    res.json({ key, url });
  } catch (error) {
    res.status(500).send(error);
  }
};

const handleConvert = async (req, res) => {
  console.log("req.body:", req.body);
  console.log("req.file:", req.file);
  console.log("req.query:", req.query);
  console.log("req.params:", req.params);
  // Get the desired image width, height, and format from a user
  const desiredWidth = parseInt(req.body.width, 10);
  const desiredHeight = parseInt(req.body.height, 10);
  const desiredFormat = req.body.format.toLowerCase();
  const originalFilename = req.body.imageKey.key;
  const newFilename = req.body.imageKey.key.split(".")[0] + "." + desiredFormat; // S3 Object Key

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
    // * change function name more suitable for this application
    const checkConversionEned = async () => {
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
      const conditionMet = await checkConversionEned();
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

// * handle image conversion rendering - call sqsWorker
const handleSendSQS = async (req, res) => {
  const { key, width, height, format } = req.body;

  const messageBody = {
    key,
    width,
    height,
    format,
    bucketName,
  };

  const params = {
    QueueUrl: sqsQueueUrl,
    MessageBody: JSON.stringify(messageBody),
  };

  sqs.sendMessage(params, (err, data) => {
    if (err) {
      console.error("Error sending message to SQS:", err);
      res.status(500).send(err);
    } else {
      console.log("Message sent to SQS:", data.MessageId);
      res.send({ message: "Conversion request sent" });
    }
  });
};

// Export callback function to router
module.exports = { handleHome, handleGetPresignedUrl, handleConvert };
