const sendResponse = require("../utils/sendResponse");

const validateMiddleware = (schema) => async (req, res, next) => {
    try {
        const parsedBody = await schema.parseAsync(req.body);
        req.body = parsedBody;
        next();
    } catch (err) {
        const message = err.errors?.[0]?.message || "Invalid input data";
        return sendResponse(res, message, 400, false);
    }
};

module.exports = validateMiddleware;



