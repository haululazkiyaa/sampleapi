function sendSuccess(
  res,
  { statusCode = 200, message = "Success", data = null, meta },
) {
  const payload = {
    success: true,
    code: statusCode,
    message,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

function sendError(
  res,
  { statusCode = 500, message = "Internal Server Error", errors },
) {
  const payload = {
    success: false,
    code: statusCode,
    message,
  };

  if (errors) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  sendSuccess,
  sendError,
};
