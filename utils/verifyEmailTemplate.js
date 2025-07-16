const VerificationEmail = (username, otp) => {
  return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #333;">Email Verification</h2>
            <p>Hello <strong>${username}</strong>,</p>
            <p>Thank you for signing up! Please use the OTP below to verify your email:</p>
            <div style="font-size: 20px; font-weight: bold; padding: 10px; background: #f4f4f4; border-radius: 5px; text-align: center;">
                ${otp}
            </div>
            <p>This OTP is valid for a limited time. If you did not request this, please ignore this email.</p>
            <p>Best Regards,<br><strong>Your Company Name</strong></p>
        </div>
    `;
};

module.exports = VerificationEmail;
