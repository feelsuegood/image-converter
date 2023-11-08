const express = require("express");
const Router = express.Router();
const {
  handleHome,
  generatePresignedUrl,
  handleConvert,
} = require("../controller/controller");

/* GET home page. */
Router.get("/", handleHome);

/* Pre-signed URL Request Route for Image Upload */
Router.get("/upload-url", generatePresignedUrl);

/* POST upload and convert image */
Router.post("/result", upload.single("image"), handleConvert);

module.exports = Router;
