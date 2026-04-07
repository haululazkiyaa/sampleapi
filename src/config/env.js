const dotenv = require("dotenv");

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  corsOrigin: process.env.CORS_ORIGIN || "*",
};

if (!env.mongoUri) {
  throw new Error(
    "MONGO_URI is required. Please set it in your environment variables.",
  );
}

if (!env.jwtSecret) {
  throw new Error(
    "JWT_SECRET is required. Please set it in your environment variables.",
  );
}

module.exports = env;
