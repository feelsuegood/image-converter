const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const Router = express.Router();
const {
  handleHome,
  handleGetPresignedUrl,
  handlePostResult,
  handleGetResult,
} = require("../controller/controller");

/* GET home page. */
Router.get("/", handleHome);

/* GET Pre-signed URL Request Route for Image Upload */
Router.get("/presigned-url", handleGetPresignedUrl);

/* POST upload and convert image */
Router.post("/result", handlePostResult);

/* POST upload and convert image */
Router.get("/result", handleGetResult);

module.exports = Router;
