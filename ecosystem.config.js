module.exports = {
  apps: [
    {
      name: "web",
      script: "./src/bin/www",
    },
    {
      name: "aws",
      script: "./src/aws/s3SQSWorker.js",
    },
  ],
};
