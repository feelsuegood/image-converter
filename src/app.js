// * Import modules
const dotenv = require("dotenv");
dotenv.config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

const AWS = require("aws-sdk");
// const fs = require("fs");
const sharp = require("sharp");
// const { v4: uuidv4 } = require("uuid");

const Router = require("../src/routes/router");

const app = express();

// * Global variables to hold processed files
const completedFiles = new Map();

// * Set up AWS configuration
const s3 = new AWS.S3();
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

const bucketName = process.env.AWS_S3_BUCKET_NAME;
const queueName = process.env.AWS_SQS_QUEUE_NAME;

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", Router);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

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
    try {
      const { Messages } = await sqs
        .receiveMessage({
          QueueUrl: process.env.AWS_SQS_URL, // Use the environment variable
          MaxNumberOfMessages: 10, // get multiple messages at the same time(maximum: 10)
          WaitTimeSeconds: 5,
        })
        .promise();

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

module.exports = app;
