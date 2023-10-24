const express = require("express");
const Router = express.Router();
const {
  handleHome,
  handleUpload,
  upload,
} = require("../controller/controller");

/* GET home page. */
Router.get("/", handleHome);

/* POST upload and convrt image */
Router.post("/upload", upload.single("image"), handleUpload);

module.exports = Router;
