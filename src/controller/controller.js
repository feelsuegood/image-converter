const dotenv = require("dotenv");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const AWS = require("aws-sdk");
const multerS3 = require("multer-s3"); // Must use multer-s3@2.10.0 not use @3~
const { v4: uuidv4 } = require("uuid");

const dir = "./uploads";

// Create 'uploads' directory if not exists
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

dotenv.config();

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// Create the S3 bucket
const bucketName = "cloud-project-partners-14-s3";

async function createS3bucket() {
  try {
    await s3.createBucket({ Bucket: bucketName }).promise();
    console.log(`Created bucket: ${bucketName}`);
  } catch (err) {
    if (err.statusCode === 409) {
      console.log(`Bucket already exists: ${bucketName}`);
    } else {
      console.log(`Error creating bucket: ${err}`);
    }
  }
}

(async () => {
  await createS3bucket();
})();

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
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

const pageTitle = "CAB432 Cloud Project Partners 14";

const handleHome = (req, res) => {
  res.render("index", { pageTitle });
};

const handleUpload = async (req, res) => {
  // Get the desired image width and height from the user
  const desiredWidth = parseInt(req.body.width, 10);
  const desiredHeight = parseInt(req.body.height, 10);
  const desiredFormat = req.body.format.toLowerCase();

  // Resize and convert the image using sharp
  const processedBuffer = await sharp(req.file.buffer)
    .resize(desiredWidth, desiredHeight)
    .toFormat(desiredFormat) // Change the format here, e.g., "png" or "webp"
    .toBuffer();

  // Upload the converted image to S3
  const newFilename = uuidv4() + "." + desiredFormat;
  try {
    await s3
      .upload({
        Bucket: bucketName,
        Key: newFilename,
        Body: processedBuffer,
        ContentType: `image/${desiredFormat}`, // Set the content type based on the desired format,
      })
      .promise();

    // Retrieve the uploaded image from S3
    const retrievedImage = await s3
      .getObject({
        Bucket: bucketName,
        Key: newFilename,
      })
      .promise();
    const imageBase64 = retrievedImage.Body.toString("base64");

    res.render("index", {
      pageTitle,
      result: `File uploaded to S3. A converted file name is ${newFilename}. Dimension is ${desiredWidth}x${desiredHeight}.`,
      newFilename,
      convertedImage: imageBase64, // Pass the image data to the view
    });
  } catch (error) {
    res.render("index", {
      pageTitle,
      result: `Error uploading to S3: ${error.message}`,
    });
  }
};

module.exports = { upload, handleHome, handleUpload };
