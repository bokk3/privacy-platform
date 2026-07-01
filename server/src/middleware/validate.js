/**
 * Wraps a zod schema into Express middleware. Validates the given part of
 * the request (body/query/params) and replaces it with the parsed
 * (type-coerced, stripped-of-unknown-keys) result. Validation errors are
 * thrown and caught by the global errorHandler, which formats ZodErrors
 * consistently as 422 responses.
 *
 * Usage: router.post("/x", validate(schema, "body"), handler)
 */
export function validate(schema, part = "body") {
  return (req, res, next) => {
    try {
      req[part] = schema.parse(req[part]);
      next();
    } catch (err) {
      next(err);
    }
  };
}
