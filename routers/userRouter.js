const express = require('express');
const { userRegistration, verifyTempUser, userLogin, userProfile, userLogout, userChangePassword, userForgotPasswordOtpSender, userVerifyForgotPasswordOtp, googleLogin } = require('../controllers/userController');
const { userRegistrationSchema, LoginFormSchema, changePasswordSchema, forgotPasswordOtpSchema, verifyForgotPasswordOtpSchema, verifyUserOtpSchema } = require('../validations/authValidation')
const { accessTokenAutoRefresh } = require('../middlewares/accessTokenAutoRefresh');
const passport = require('passport');
const userRouter = express.Router();
const otpLimiter = require('../utils/otpLimiter');
const validate = require('../middlewares/validate');
const authorizeRole = require('../middlewares/authorizeRole');

// Public Routes
userRouter.post('/signup', validate(userRegistrationSchema), otpLimiter, userRegistration)
userRouter.post('/verify-otp', validate(verifyUserOtpSchema), otpLimiter, verifyTempUser)
userRouter.post('/login', validate(LoginFormSchema), otpLimiter, userLogin)
userRouter.post('/forgot-password-send-otp', validate(forgotPasswordOtpSchema), userForgotPasswordOtpSender)
userRouter.post('/verify-forgot-password-otp', validate(verifyForgotPasswordOtpSchema), userVerifyForgotPasswordOtp)
userRouter.post('/google', googleLogin);

//protected routes
userRouter.get('/me', accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin', 'user'), userProfile)
userRouter.post('/logout', accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), userLogout)
userRouter.put('/change-password', accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), validate(changePasswordSchema), userChangePassword)

module.exports = userRouter;