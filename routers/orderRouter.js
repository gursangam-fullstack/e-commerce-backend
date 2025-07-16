const express = require('express');
const passport = require('passport');
const authorizeRole = require('../middlewares/authorizeRole');
const { accessTokenAutoRefresh } = require('../middlewares/accessTokenAutoRefresh');
const { createOrderController, verifyPayment, webhookHandler, getAllOrdersController, getOrdersByUserIdController } = require('../controllers/orderController')

const orderRouter = express.Router();

// Public Router



// Private Router

orderRouter.post("/create-order/:userId", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), createOrderController)

orderRouter.post("/verify-payment", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), verifyPayment)

orderRouter.post("/webhook", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), express.raw({ type: 'application/json' }), webhookHandler)

orderRouter.get("/all-orders", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), getAllOrdersController)

orderRouter.get("/get-orders/:userId", accessTokenAutoRefresh, passport.authenticate('jwt', { session: false }), authorizeRole('admin'), getOrdersByUserIdController)

module.exports = orderRouter;