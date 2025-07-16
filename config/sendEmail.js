const  emailSender  = require('./emailService')

const sendEmailFun = async ({ to, subject, text, html }) => {
    try {
        const result = await emailSender(to, subject, text, html);
        return result.success; 
    } catch (error) {
        // console.error(" Email sending error:", error.message);
        return false; 
    }
};

module.exports = sendEmailFun;