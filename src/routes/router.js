const express = require("express");
const multer = require("multer");
const path = require("path");
const Router = express.Router();
const fs = require("fs");

const dir = "./uploads";

// Create 'uploads' directory if not exists
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Directory to store files
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Naming the file
  },
});

const upload = multer({ storage: storage });

const pageTitle = "Add title here";

const handleHome = (req, res) => {
  res.render("index", { pageTitle });
};

/* GET home page. */
Router.get("/", handleHome);

/* POST upload image */
Router.post("/upload", upload.single("image"), (req, res) => {
  if (req.file) {
    const result = `${req.file.filename} is successfully uploaded`;
    res.render("index", { pageTitle, result });
  } else {
    const result = `${req.file.filename} is not uploaded`;
    res.render("index", { pageTitle, result });
  }
});

module.exports = Router;
