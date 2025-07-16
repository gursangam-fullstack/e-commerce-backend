

const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      // Format errors: "fieldName field is required"
       const message = err.errors
     .map((e) => `${e.path[0]} field is required`)
        .join(', ');

      res.status(400).send(message);
    }
  };
};
module.exports = validateRequest;
