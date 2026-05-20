// Validate req.body against a zod schema. On success, replaces req.body with
// the parsed (stripped/coerced) data; on failure returns 400 with details.
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.') || '(body)',
        message: i.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details });
    }
    req.body = result.data;
    next();
  };
}
