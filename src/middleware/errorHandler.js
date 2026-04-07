const { ZodError } = require("zod");
const { sendError } = require("../utils/apiResponse");

function errorHandler(err, _req, res, _next) {
  const isProduction = process.env.NODE_ENV === "production";

  if (err.name === "JsonWebTokenError") {
    return sendError(res, {
      statusCode: 401,
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return sendError(res, {
      statusCode: 401,
      message: "Token has expired",
    });
  }

  if (err.name === "CastError") {
    return sendError(res, {
      statusCode: 400,
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));

    return sendError(res, {
      statusCode: 422,
      message: "Validation failed",
      errors,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return sendError(res, {
      statusCode: 409,
      message: `Duplicate value for ${field}`,
    });
  }

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    return sendError(res, {
      statusCode: 422,
      message: "Validation failed",
      errors,
    });
  }

  const statusCode = err.statusCode || 500;

  return sendError(res, {
    statusCode,
    message: err.message || "Internal Server Error",
    errors: !isProduction && err.errors ? err.errors : undefined,
  });
}

module.exports = errorHandler;
