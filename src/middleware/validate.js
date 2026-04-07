const ApiError = require("../utils/apiError");

function validate(schema) {
  return (req, _res, next) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(new ApiError(422, "Validation failed", errors));
    }

    req.body = parsed.data.body || req.body;
    req.query = parsed.data.query || req.query;
    req.params = parsed.data.params || req.params;

    return next();
  };
}

module.exports = validate;
