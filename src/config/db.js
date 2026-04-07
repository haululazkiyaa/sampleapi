const mongoose = require("mongoose");
const env = require("./env");

async function connectDatabase() {
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.mongoUri, {
    autoIndex: env.nodeEnv !== "production",
  });

  // Keep logs minimal in production but helpful in development.
  if (env.nodeEnv !== "test") {
    console.log("MongoDB connected");
  }
}

module.exports = connectDatabase;
