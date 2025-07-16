const sendResponse = (res, message, statusCode = 200, success = true, data = null) => {
    return res.status(statusCode).json({
        success,
        error: !success,
        message,
        data,
    });
};

module.exports = sendResponse;