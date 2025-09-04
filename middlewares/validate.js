const sendResponse = require("../utils/sendResponse");

const validateMiddleware = (schema) => async (req, res, next) => {
  try {
    const parsedBody = await schema.parseAsync(req.body);
    req.body = parsedBody;
    next();
  } catch (err) {
    console.error("Validation error:", err);
    console.log("typeof err.message:", typeof err.message);

    let message = "Invalid input data";

    try {
      const arr = JSON.parse(err.message);
      if (Array.isArray(arr) && arr[0]?.message) {
        message = arr[0].message;
      }
    } catch (e) {
      if (typeof err.message === "string") {
        message = err.message;
      }
    }

    return sendResponse(res, message, 400, false);
  } 
};

module.exports = validateMiddleware;
