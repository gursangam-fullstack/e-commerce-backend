const validateRequest = (schema, validateParams = false) => {
  return (req, res, next) => {
    try {
      if (validateParams) {
        // Validate URL parameters
        req.params = schema.parse(req.params);
      } else {
        // Validate request body
        req.body = schema.parse(req.body);
      }
      next();
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        const firstError = err.errors[0];
        const field = firstError.path?.[0]; // e.g., "name" or "categoryName"
        const message = `${field} is ${firstError.message.toLowerCase()}`;
        return res.status(400).json({ message });
      }

      return res.status(400).json({ message: "Validation error" });
    }
  };
};

module.exports = validateRequest; 