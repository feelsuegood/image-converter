const dotenv = require("dotenv");
dotenv.config();

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const {
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Initialize AWS services
const bucketName = process.env.AWS_S3_BUCKET_NAME;
const region = process.env.AWS_REGION;

const s3 = new AWS.S3();
const sqs = new AWS.SQS({ region });

const pageTitle = "Image Converter";
const fileSize = 10; // file size limit: 10MB
const maxWidth = 1920; // image width limit: 1920px
const maxHeight = 1080; // image height limit: 1080px

// "/" route callback function
const handleHome = (req, res) => {
  res.render("index", {
    pageTitle,
    fileSize,
    maxWidth,
    maxHeight,
  });
};

// "/presigned-url" route callback function that generates pre-signed URL for uploading original images
const handleGetUploadUrl = async (req, res) => {
  const format = req.query.format;
  const client = new S3Client({ region });
  const key = `${uuidv4()}.${format}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  try {
    const url = await getSignedUrl(client, command, { expiresIn: 300 }); // expires in 5 minutes
    console.log("🔹 Pre-signed URL generated:", url.slice(0, 100));
    console.log("🔹 Key(filename):", key);
    res.json({ key, url });
  } catch (error) {
    res.status(500).send(error);
  }
};

// "/result" route post callback function
const handlePostResult = async (req, res) => {
  // Get the desired image width, height, and format from a user
  const width = parseInt(req.body.width, 10);
  const height = parseInt(req.body.height, 10);
  const format = req.body.format;
  const filename = req.body.key;
  const convertedFilename = "converted_" + filename;

  // Create a message to send to the SQS queue with the imageinformation
  const messageParams = {
    QueueUrl: process.env.AWS_SQS_URL,
    MessageBody: JSON.stringify({
      filename,
      width,
      height,
      format,
      bucketName,
    }),
  };
  // sending the message to SQS Queue
  try {
    await sqs.sendMessage(messageParams).promise();
    console.log("🔹 Sending SQS message body:", messageParams.MessageBody);

    // Wait for the SQS job to complete
    console.log("🔹 Waiting for message from queue...");
    const maxWaitTime = 10000; // Maximum wait time (e.g. 10000 = 10 seconds)
    const pollInterval = 3000; // Polling interval (1 second)
    let elapsedTime = 0;

    // Function to check if the processed image file exists in S3
    const checkConversionEned = async () => {
      try {
        await s3
          .getObject({
            Bucket: bucketName,
            Key: convertedFilename,
          })
          .promise();
        return true; // Return true if file exists
      } catch (error) {
        console.error(
          "Error checking file existence:",
          error.message.slice(0, 50)
        );
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
    // Generate download URL for the converted image
    const client = new S3Client({ region });
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: convertedFilename,
    });

    // const downloadUrl = await getSignedUrl(client, command, {
    //   expiresIn: 604800, // !! expires in 7 days (for scaling test)
    //   ContentDisposition: "attachment",
    // });

    const downloadUrl = await getSignedUrl(client, command, {
      expiresIn: 300, // * expires in 5 mins
      ContentDisposition: "attachment",
    });

    console.log("🔹 Download URL:", downloadUrl.slice(0, 100));
    console.log("🔹 Key(filename):", convertedFilename);

    // Pass the converted image information to the "result" view template
    res.json({
      key: convertedFilename,
      url: downloadUrl,
      width,
      height,
      format,
    });
  } catch (error) {
    console.error(`🔴 Post Result Error: ${error.message}`);
    res.render("error", {
      pageTitle,
      message: `Error uploading to S3: ${error.message}`,
    });
  }
};

// "/result" get callback function
const handleGetResult = async (req, res) => {
  const convertedFilename = req.query.key; // S3 Object Key
  const url = req.query.url; // S3 Object download pre-asigned URL
  const width = req.query.width;
  const height = req.query.height;

  // Get the converted image from S3
  try {
    const retrievedImage = await s3
      .getObject({
        Bucket: bucketName,
        Key: convertedFilename,
      })
      .promise();

    const imageBase64 = retrievedImage.Body.toString("base64");

    // Render the result page
    res.render("result", {
      pageTitle,
      resultFilename: convertedFilename,
      resultUrl: url,
      resultDimensions: `${width}x${height}`,
      convertedImage: imageBase64, // Pass the image data to the "result" view template
    });
  } catch (error) {
    console.error(`🔴 Error: ${error.message}`);
    res.render("error", {
      pageTitle,
      message: `Error retrieving converted image: ${error.message}`,
    });
  }
};

// Export callback function to router
module.exports = {
  handleHome,
  handleGetUploadUrl,
  handlePostResult,
  handleGetResult,
};
