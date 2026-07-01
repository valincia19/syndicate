/**
 * Validation Middleware using Zod schemas
 * Sanitizes and validates req.body, req.query, or req.params
 */

const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errorsArray = result.error.issues || result.error.errors || [];
    const formattedErrors = errorsArray.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }

  // Replace req[source] with sanitized data
  try {
    req[source] = result.data;
  } catch {
    Object.assign(req[source], result.data);
  }

  next();
};

module.exports = validate;
