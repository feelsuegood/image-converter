const AWS = require("aws-sdk");
const s3 = new AWS.S3();

// Upload a file to S3
const uploadToS3 = async (bucketName, key, body, contentType) => {
  try {
    await s3
      .upload({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
      .promise();
    console.log(`🟢 File uploaded successfully to ${bucketName}/${key}`);
  } catch (error) {
    console.error("🔴 S3 upload error:", error);
    throw new Error("Failed to upload to S3");
  }
};

module.exports = { uploadToS3 };
