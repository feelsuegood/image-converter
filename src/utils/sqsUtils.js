const dotenv = require("dotenv");
dotenv.config();

const AWS = require("aws-sdk");
const sqs = new AWS.SQS({ region: process.env.AWS_REGION });

// Function to send a message to SQS queue
const sendMessageToSQS = async (queueUrl, messageBody) => {
  const messageParams = {
    QueueUrl: queueUrl,
    MessageBody: messageBody,
  };

  try {
    console.log("🟢 Sending message to queue...");
    await sqs.sendMessage(messageParams).promise();
    console.log("🟢 Message sent.");
    return { success: true };
  } catch (error) {
    console.error("🔴 SQS send message error:", error);
    return { success: false, error: error };
  }
};

module.exports = { sendMessageToSQS };
