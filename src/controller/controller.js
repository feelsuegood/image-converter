const dotenv = require("dotenv");
dotenv.config();

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// * Initialize AWS services
const s3 = new AWS.S3();
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

const bucketName = process.env.AWS_S3_BUCKET_NAME;

const pageTitle = "Image Converter";
const fileSize = 10; // * file size limit: 10MB
const maxWidth = 1920; // * image width limit: 1920px
const maxHeight = 1080; //  * image height limit: 1080px

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
  const format = req.query.format;
  const client = new S3Client({ region: process.env.AWS_REGION });
  const key = `${uuidv4()}.${format}`;
  console.log("🔹 PresignedUrl key:", key);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  try {
    const url = await getSignedUrl(client, command, { expiresIn: 300 }); // expires in 5 minutes
    console.log("🔹 Pre-signed URL generated:", url.slice(0, 100));
    console.log("🔹 Key:", key);
    res.json({ key, url });
  } catch (error) {
    res.status(500).send(error);
  }
};

const handlePostResult = async (req, res) => {
  console.log("🔹 handleResult req.body:", req.body);
  // Get the desired image width, height, and format from a user
  const width = parseInt(req.body.width, 10);
  const height = parseInt(req.body.height, 10);
  const format = req.body.format;
  const filename = req.body.key;
  const url = req.body.url;

  // * Create a message to send to the SQS queue with relevant information
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
  // * handle image conversion rendering - sening message to SQS
  try {
    // Send the message to the SQS queue
    await sqs.sendMessage(messageParams).promise();
    console.log("🔹 Sending SQS message body:", messageParams.MessageBody);

    // Wait for the SQS job to complete
    console.log("🔹 Waiting for message from queue...");
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
            Key: filename,
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
    // const retrievedImage = await s3
    //   .getObject({
    //     Bucket: bucketName,
    //     Key: filename,
    //   })
    //   .promise();

    // const imageBase64 = retrievedImage.Body.toString("base64");

    // * Render the result
    res.json({
      key: filename,
      url,
      width,
      height,
      format,
    });
    // res.render("result", {
    //   pageTitle,
    //   resultFilename: filename,
    //   resultDimensions: `${width}x${height}`,
    //   convertedImage: imageBase64, // Pass the image data to the view template
    // });
  } catch (error) {
    console.error(`🔴 Post Result Error: ${error.message}`);
    res.render("error", {
      pageTitle,
      result: `Error uploading to S3: ${error.message}`,
    });
  }
};

const handleGetResult = async (req, res) => {
  console.log("🔹 handleGetResult req.query:", req.query);
  // Get the desired image width, height, and format from a user
  const filename = req.query.key; // S3 Object Key
  const url = req.query.url; // S3 Object URL
  // const newFilename = req.query.key.split(".")[0] + "." + req.query.format; // S3 Object Key
  const width = req.query.width;
  const height = req.query.height;
  console.log("🔹 filename:", filename);
  // Get the converted image from S3
  try {
    const retrievedImage = await s3
      .getObject({
        Bucket: bucketName,
        Key: filename,
      })
      .promise();

    const imageBase64 = retrievedImage.Body.toString("base64");

    // * Render the result
    res.render("result", {
      pageTitle,
      resultFilename: filename,
      resultUrl: url,
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
