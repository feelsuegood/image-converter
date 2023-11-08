const express = require("express");
const multer = require("multer");
const upload = multer();

const Router = express.Router();
const {
  handleHome,
  handleConvert,
  handleGetPresignedUrl,
} = require("../controller/controller");

/* GET home page. */
Router.get("/", handleHome);

/* Pre-signed URL Request Route for Image Upload */
Router.get("/presigned-url", handleGetPresignedUrl);

/* POST upload and convert image */
Router.post("/result", upload.none(), handleConvert);

module.exports = Router;
