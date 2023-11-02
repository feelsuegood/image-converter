const express = require("express");
const Router = express.Router();
const {
  handleHome,
  handleConvert,
  upload,
} = require("../controller/controller");

/* GET home page. */
Router.get("/", handleHome);
/* POST upload and convert image */
Router.post("/result", upload.single("image"), handleConvert);

module.exports = Router;
