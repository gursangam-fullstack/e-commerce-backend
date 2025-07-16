const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        // Zod-style formatting
        const message = err.errors
          .map(e => `${e.path.join('.')}: ${e.message}`)
          .join(', ');

        return res.status(400).json({
          message: `Validation Error: ${message}`
        });
      }

      // Handle non-Zod errors
      return res.status(500).json({
        message: "Internal Server Error",
        error: err.message || "Unknown error"
      });
    }
  };
};

module.exports = validateRequest;



