module.exports = {
  apps: [
    {
      name: "web",
      script: "./src/bin/www",
    },
    {
      name: "sqs",
      script: "./src/workers/sqsWorker.js",
    },
  ],
};
