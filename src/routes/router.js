const express = require("express");
const Router = express.Router();

// Import callback functions in controller.js to handle routes
const {
  handleHome,
  handleGetUploadUrl,
  handlePostResult,
  handleGetResult,
} = require("../controller/controller");

/* GET home page. */
Router.get("/", handleHome);

/* GET generate pre-signed upload URL to upload original images */
Router.get("/presigned-url", handleGetUploadUrl);

/* POST process to convert images and get pre-signed download URL to download converted images */
/* GET show the result page */
Router.route("/result").post(handlePostResult).get(handleGetResult);

module.exports = Router;
