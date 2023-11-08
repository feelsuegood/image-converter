const dotenv = require("dotenv");
dotenv.config();

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
// const multer = require("multer");
const path = require("path");
// const https = require("https");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
// const upload = multer();
// const { fromIni } = require("@aws-sdk/credential-providers");
// const { HttpRequest } = require("@smithy/protocol-http");
// const path = require("path");
// const {
//   getSignedUrl,
//   S3RequestPresigner,
// } = require("@aws-sdk/s3-request-presigner");
// const { parseUrl } = require("@smithy/url-parser");
// const { formatUrl } = require("@aws-sdk/util-format-url");
// const { Hash } = require("@smithy/hash-node");

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
  const client = new S3Client({ region: process.env.AWS_REGION });
  const key = `${uuidv4()}.jpeg`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  try {
    const url = await getSignedUrl(client, command, { expiresIn: 60 }); // URL이 60초 후에 만료됩니다.
    console.log("🟢 Pre-signed URL generated:", url);
    console.log("🟢 Key:", key);
    res.json({ key, url });
  } catch (error) {
    res.status(500).send(error);
  }
};

// function put(url, data) {
//   return new Promise((resolve, reject) => {
//     const dataBuffer = Buffer.from(data);
//     const req = https.request(
//       url,
//       { method: "PUT", headers: { "Content-Length": dataBuffer.length } },
//       (res) => {
//         let responseBody = "";
//         res.on("data", (chunk) => {
//           responseBody += chunk;
//         });
//         res.on("end", () => {
//           resolve(responseBody);
//         });
//       }
//     );
//     req.on("error", (err) => {
//       reject(err);
//     });
//     req.write(dataBuffer);
//     req.end();
//   });
// }
const handlePostResult = async (req, res) => {
  console.log("🟢handleResult req.body:", req.body);
  // Get the desired image width, height, and format from a user
  const desiredWidth = parseInt(req.body.width, 10);
  const desiredHeight = parseInt(req.body.height, 10);
  const desiredFormat = req.body.format;
  const originalFilename = req.body.key;
  const newFilename = req.body.key.split(".")[0] + "." + desiredFormat; // S3 Object Key
  console.log("🟢newFilename:", newFilename);
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
  // * handle image conversion rendering - call sqsWorker
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
    // * Render the result
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

const handleGetResult = async (req, res) => {
  console.log("🟢handleGetResult req.query:", req.query);
  // Get the desired image width, height, and format from a user
  const newFilename = req.query.key.split(".")[0] + "." + req.query.format; // S3 Object Key
  const width = req.query.width;
  const height = req.query.height;
  console.log("🟢newFilename:", newFilename);
  // Get the converted image from S3
  try {
    const retrievedImage = await s3
      .getObject({
        Bucket: bucketName,
        Key: newFilename,
      })
      .promise();

    const imageBase64 = retrievedImage.Body.toString("base64");
    // * Render the result
    res.render("result", {
      pageTitle,
      resultFilename: newFilename,
      resultDimensions: `${width}x${height}`,
      convertedImage: imageBase64, // Pass the image data to the view template
    });
  } catch (error) {
    console.error(`🔴 Error: ${error.message}`);
    res.render("error", {
      pageTitle: "Error",
      message: `Error retrieving converted image: ${error.message}`,
    });
  }
};

// Export callback function to router
module.exports = {
  handleHome,
  handleGetPresignedUrl,
  handlePostResult,
  handleGetResult,
};
