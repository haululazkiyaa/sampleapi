const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { sendSuccess } = require("../utils/apiResponse");

function buildToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

async function register(req, res, next) {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    return next(new ApiError(409, "Email already registered"));
  }

  const user = await User.create({ name, email, password });
  const token = buildToken(user._id.toString());

  return sendSuccess(res, {
    statusCode: 201,
    message: "User registered successfully",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
      tokenType: "Bearer",
      expiresIn: env.jwtExpiresIn,
    },
  });
}

async function login(req, res, next) {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ApiError(401, "Invalid email or password"));
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return next(new ApiError(401, "Invalid email or password"));
  }

  const token = buildToken(user._id.toString());

  return sendSuccess(res, {
    statusCode: 200,
    message: "Login successful",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
      tokenType: "Bearer",
      expiresIn: env.jwtExpiresIn,
    },
  });
}

module.exports = {
  register,
  login,
};
