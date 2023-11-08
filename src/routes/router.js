const express = require("express");

const Router = express.Router();
const {
  handleHome,
  handleConvert,
  handleGetPresignedUrl,
} = require("../controller/controller");

/* GET home page. */
Router.get("/", handleHome);

/* Pre-signed URL Request Route for Image Upload */
Router.get("/get-presigned-url", handleGetPresignedUrl);

/* POST upload and convert image */
Router.post("/result", handleConvert);

module.exports = Router;
