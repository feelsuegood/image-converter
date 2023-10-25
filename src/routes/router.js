const express = require("express");
const Router = express.Router();
const {
  handleHome,
  handleConvert,
  upload,
} = require("../controller/controller");

/* GET home page. */
/* POST upload and convrt image */
Router.route("/").get(handleHome).post(upload.single("image"), handleConvert);

module.exports = Router;
