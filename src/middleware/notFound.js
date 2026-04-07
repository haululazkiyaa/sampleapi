const { sendError } = require("../utils/apiResponse");

function notFoundHandler(req, res, _next) {
  return sendError(res, {
    statusCode: 404,
    message: `Route ${req.originalUrl} not found`,
  });
}

module.exports = notFoundHandler;
