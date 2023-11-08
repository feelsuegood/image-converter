// pm2 configuration file
module.exports = {
  apps: [
    {
      name: "web",
      script: "./src/bin/www",
    },
    {
      name: "aws",
      script: "./src/aws/sqsS3Worker.js",
    },
  ],
};
