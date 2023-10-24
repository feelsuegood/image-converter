const express = require("express");
const Router = express.Router();

const handleHome = (req, res) => {
  const pageTitle = "hi";

  res.render("index", { pageTitle });
};

/* GET home page. */
Router.get("/", handleHome);

module.exports = Router;
