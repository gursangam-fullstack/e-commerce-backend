// routes/orders.js or similar
const Razorpay = require('razorpay');
const mongoose = require('mongoose');

const crypto = require('crypto');
const orderModel = require('../model/order');
const addressModel = require('../model/address');
const sendResponse = require('../utils/sendResponse');
const getPagination = require('../utils/pagination')
const sendEmailFun = require('../config/sendEmail');
const productModel = require('../model/product');

require("dotenv").config();


// console.log("🔑 RAZORPAY_KEY_ID:", process.env.RAZERPAY_API_KEY);

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZERPAY_API_KEY,
    key_secret: process.env.RAZERPAY_API_SECRET,
});

exports.createOrderController = async (req, res) => {
    // console.log("create order data params", req.params);
    // console.log("create order data body", req.body)
    try {
        const { userId } = req.params;
        const { products, addressId, amount, paymentMethod } = req.body;

        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return sendResponse(res, "Invalid user ID", 400, false);
        }

        // Validate products array
        if (!Array.isArray(products) || products.length === 0) {
            return sendResponse(res, "No products selected", 400, false);
        }

        // Validate each product
        for (const item of products) {
            if (
                !item.product ||
                !mongoose.Types.ObjectId.isValid(item.product) ||
                !item.quantity ||
                typeof item.quantity !== 'number' ||
                item.quantity < 1 ||
                !item.size || typeof item.size !== 'string' || item.size.trim() === ''
            ) {
                return sendResponse(res, "Invalid product, quantity, or size in product list", 400, false);
            }
        }

        // Validate address
        if (!mongoose.Types.ObjectId.isValid(addressId)) {
            return sendResponse(res, "Invalid address", 400, false);
        }

        // Validate amount
        if (!amount || isNaN(amount)) {
            return sendResponse(res, "Invalid amount", 400, false);
        }

        // Validate payment method
        if (!paymentMethod || !['cod', 'online'].includes(paymentMethod)) {
            return sendResponse(res, "Invalid payment method", 400, false);
        }

        // Decrement product stock for each item
        for (const item of products) {
            const productDoc = await productModel.findById(item.product);
            if (!productDoc) {
                return sendResponse(res, `Product not found: ${item.product}`, 404, false);
            }
            // Find the correct variant by size
            const variant = productDoc.variants.find(v => v.size === item.size);
            if (!variant) {
                return sendResponse(res, `Variant with size ${item.size} not found for product: ${productDoc.name}`, 404, false);
            }
            if (variant.stock < item.quantity) {
                return sendResponse(res, `Insufficient stock for product: ${productDoc.name}, size: ${item.size}`, 400, false);
            }
            variant.stock -= item.quantity;
            await productDoc.save();
        }

        const address = await addressModel.findById(addressId);
        if (!address) {
            return sendResponse(res, "Address not found", 404, false);
        }

        // If payment method is online, create Razorpay order
        if (paymentMethod === 'online') {
            try {
                const razorpayOrder = await razorpay.orders.create({
                    amount: amount * 100, // Convert to paise
                    currency: 'INR',
                    receipt: `receipt_${Date.now()}`,
                    notes: {
                        userId,
                        addressId,
                        products: JSON.stringify(products)
                    }
                });

                return sendResponse(res, "Razorpay order created successfully", 200, true, {
                    order: razorpayOrder,
                    key: process.env.RAZERPAY_API_KEY,
                    orderId: razorpayOrder.id
                });
            } catch (err) {
                // console.error('Error creating Razorpay order:', err);
                return sendResponse(res, "Error creating Razorpay order", 500, false);
            }
        }

        // Create COD order
        const order = new orderModel({
            userId,
            addressId: address._id,
            products,
            address: {
                firstName: address.firstName,
                lastName: address.lastName,
                mobileNo: address.mobileNo,
                alternativeMobileNo: address.alternativeMobileNo,
                flatNo: address.flatNo,
                area: address.area,
                landMark: address.landMark,
                city: address.city,
                state: address.state,
                zip: address.zip,
                country: address.country,
            },
            amount,
            paymentMethod: 'cod',
            status: 'pending',
        });

        await order.save();

        // Populate products and user for detailed email
        const populatedOrder = await orderModel.findById(order._id)
            .populate('products.product')
            .populate('userId', 'name email mobileNo');
        // console.log(JSON.stringify(populatedOrder, null, 2));
        const orderAddress = populatedOrder.address;
        const user = populatedOrder.userId;
        const productDetailsHtml = populatedOrder.products.map(p => {
            const prod = p.product;
            return `<br/>Product ID: ${prod?._id || 'N/A'}<br/>Name: ${prod?.name || 'N/A'}<br/>Amount: ${populatedOrder.amount || 'N/A'}<br/>Price: ${prod?.price || 'N/A'}<br/>Discount: ${prod?.discountedPrice || 'N/A'}<br/>Color: ${prod?.color || 'N/A'}<br/>Quantity: ${p.quantity}<br/>Size: ${p.size || 'N/A'}<br/>`;
        }).join('<hr/>');

        // Send email to admin about the new COD order
        const adminEmail = process.env.ADMIN_EMAIL;
        const subject = "New COD Order Placed";
        const text = `A new COD order has been placed. Order ID: ${order._id}`;
        const html = `
          <h2>New COD Order Placed</h2>
          <p><strong>Order ID:</strong> ${order._id}</p>
          <h3>Address Details</h3>
          <p><strong>ID:</strong> ${populatedOrder.addressId || 'N/A'}</p>
          <p><strong>Name:</strong> ${orderAddress?.firstName || ''} ${orderAddress?.lastName || ''}</p>
          <p><strong>Flat No:</strong> ${orderAddress?.flatNo || 'N/A'}</p>
          <p><strong>Area:</strong> ${orderAddress?.area || 'N/A'}</p>
          <p><strong>City:</strong> ${orderAddress?.city || 'N/A'}</p>
          <p><strong>State:</strong> ${orderAddress?.state || 'N/A'}</p>
          <p><strong>Zip Code:</strong> ${orderAddress?.zip || 'N/A'}</p>
          <p><strong>Country:</strong> ${orderAddress?.country || 'N/A'}</p>
          <p><strong>Mobile No:</strong> ${orderAddress?.mobileNo || 'N/A'}</p>
          <p><strong>Alternative No:</strong> ${orderAddress?.alternativeMobileNo || 'N/A'}</p>
          <h3>User Details</h3>
          <p><strong>Name:</strong> ${user?.name || 'N/A'}</p>
          <p><strong>ID:</strong> ${user?._id || 'N/A'}</p>
          <p><strong>Email:</strong> ${user?.email || 'N/A'}</p>
          <h3>Product Details</h3>
          ${productDetailsHtml}
          <h3>Order Details</h3>
          <p><strong>Payment Method:</strong> ${populatedOrder.paymentMethod}</p>
          <p><strong>Amount:</strong> ${populatedOrder.amount}</p>
          <p><strong>Status:</strong> ${populatedOrder.status}</p>
          <p><strong>COD Status:</strong> ${populatedOrder.codStatus}</p>
          <p><strong>Razorpay Order ID:</strong> ${populatedOrder.razorpayOrderId || 'N/A'}</p>
          <p><strong>Payment ID:</strong> ${populatedOrder.paymentId || 'N/A'}</p>
        `;
        sendEmailFun({
            to: adminEmail,
            subject,
            text,
            html
        });

        return sendResponse(res, "COD order placed successfully", 201, true, {
            order,
            orderId: order._id
        });
    } catch (err) {
         console.error('Error creating order:', err);
        return sendResponse(res, "Error creating order", 500, false);
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            userId,
            addressId,
            products,
            amount
        } = req.body;

        // Verify signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZERPAY_API_SECRET)
            .update(body)
            .digest("hex");

        if (razorpay_signature !== expectedSignature) {
            return sendResponse(res, "Invalid signature", 400, false);
        }

        // Decrement product stock for each item
        const parsedProducts = typeof products === 'string' ? JSON.parse(products) : products;
        for (const item of parsedProducts) {
            const productDoc = await productModel.findById(item.product);
            if (!productDoc) {
                return sendResponse(res, `Product not found: ${item.product}`, 404, false);
            }
            // Find the correct variant by size
            const variant = productDoc.variants.find(v => v.size === item.size);
            if (!variant) {
                return sendResponse(res, `Variant with size ${item.size} not found for product: ${productDoc.name}`, 404, false);
            }
            if (variant.stock < item.quantity) {
                return sendResponse(res, `Insufficient stock for product: ${productDoc.name}, size: ${item.size}`, 400, false);
            }
            variant.stock -= item.quantity;
            await productDoc.save();
        }

        // Get address details
        const address = await addressModel.findById(addressId);
        if (!address) {
            return sendResponse(res, "Address not found", 404, false);
        }

        // Create order in database
        const order = new orderModel({
            userId,
            addressId: address._id,
            products: JSON.parse(products),
            address: {
                firstName: address.firstName,
                lastName: address.lastName,
                mobileNo: address.mobileNo,
                alternativeMobileNo: address.alternativeMobileNo,
                flatNo: address.flatNo,
                area: address.area,
                landMark: address.landMark,
                city: address.city,
                state: address.state,
                zip: address.zip,
                country: address.country,
            },
            amount,
            paymentMethod: 'online',
            status: 'paid',
            razorpayOrderId: razorpay_order_id,
            paymentId: razorpay_payment_id
        });

        await order.save();

        // Populate products and user for detailed email
        const populatedOrder = await orderModel.findById(order._id)
            .populate('products.product')
            .populate('userId', 'name email mobileNo');
        // console.log(JSON.stringify(populatedOrder, null, 2));
        const orderAddress = populatedOrder.address;
        const user = populatedOrder.userId;
        const productDetailsHtml = populatedOrder.products.map(p => {
            const prod = p.product;
            return `<br/>Product ID: ${prod?._id || 'N/A'}<br/>Name: ${prod?.name || 'N/A'}<br/>Amount: ${populatedOrder.amount || 'N/A'}<br/>Price: ${prod?.price || 'N/A'}<br/>Discount: ${prod?.discountedPrice || 'N/A'}<br/>Color: ${prod?.color || 'N/A'}<br/>Quantity: ${p.quantity}<br/>Size: ${p.size || 'N/A'}<br/>`;
        }).join('<hr/>');

        // Send email to admin about the new paid online order
        const adminEmail = process.env.ADMIN_EMAIL;
        const subject = "New Online Order Paid";
        const text = `A new online order has been paid. Order ID: ${order._id}`;
        const html = `
          <h2>New Online Order Paid</h2>
          <p><strong>Order ID:</strong> ${order._id}</p>
          <h3>Address Details</h3>
          <p><strong>ID:</strong> ${populatedOrder.addressId || 'N/A'}</p>
          <p><strong>Name:</strong> ${orderAddress?.firstName || ''} ${orderAddress?.lastName || ''}</p>
          <p><strong>Flat No:</strong> ${orderAddress?.flatNo || 'N/A'}</p>
          <p><strong>Area:</strong> ${orderAddress?.area || 'N/A'}</p>
          <p><strong>City:</strong> ${orderAddress?.city || 'N/A'}</p>
          <p><strong>State:</strong> ${orderAddress?.state || 'N/A'}</p>
          <p><strong>Zip Code:</strong> ${orderAddress?.zip || 'N/A'}</p>
          <p><strong>Country:</strong> ${orderAddress?.country || 'N/A'}</p>
          <p><strong>Mobile No:</strong> ${orderAddress?.mobileNo || 'N/A'}</p>
          <p><strong>Alternative No:</strong> ${orderAddress?.alternativeMobileNo || 'N/A'}</p>
          <h3>User Details</h3>
          <p><strong>Name:</strong> ${user?.name || 'N/A'}</p>
          <p><strong>ID:</strong> ${user?._id || 'N/A'}</p>
          <p><strong>Email:</strong> ${user?.email || 'N/A'}</p>
          <h3>Product Details</h3>
          ${productDetailsHtml}
          <h3>Order Details</h3>
          <p><strong>Payment Method:</strong> ${populatedOrder.paymentMethod}</p>
          <p><strong>Amount:</strong> ${populatedOrder.amount}</p>
          <p><strong>Status:</strong> ${populatedOrder.status}</p>
          <p><strong>COD Status:</strong> ${populatedOrder.codStatus}</p>
          <p><strong>Razorpay Order ID:</strong> ${populatedOrder.razorpayOrderId || 'N/A'}</p>
          <p><strong>Payment ID:</strong> ${populatedOrder.paymentId || 'N/A'}</p>
        `;
        sendEmailFun({
            to: adminEmail,
            subject,
            text,
            html
        });

        return sendResponse(res, "Payment verified and order created successfully", 200, true, {
            order,
            // redirectUrl: `${process.env.FRONTEND_URL}/paymentSuccess?reference=${razorpay_payment_id}`
        });
    } catch (err) {
        // console.error('Error verifying payment:', err);
        return sendResponse(res, "Error verifying payment", 500, false);
    }
};

exports.webhookHandler = async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const receivedSignature = req.headers['x-razorpay-signature'];

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(req.body)
            .digest('hex');

        if (receivedSignature !== expectedSignature) {
            return res.status(400).send('Invalid signature');
        }

        const payload = JSON.parse(req.body.toString());
        const payment = payload.payload.payment.entity;

        // Check if order already exists
        const existingOrder = await orderModel.findOne({ paymentId: payment.id });

        if (!existingOrder) {
            // Create new order from webhook data
            const order = new orderModel({
                userId: payment.notes?.userId || 'webhook-user',
                products: JSON.parse(payment.notes?.products || '[]'),
                amount: payment.amount / 100, // store in rupees
                paymentMethod: 'online',
                status: 'paid',
                razorpayOrderId: payment.order_id,
                paymentId: payment.id,
                source: 'webhook'
            });

            await order.save();
        } else if (existingOrder.status !== 'paid') {
            existingOrder.status = 'paid';
            existingOrder.source = 'both';
            await existingOrder.save();
        }

        res.status(200).json({ received: true });
    } catch (error) {
        // console.error('Webhook error:', error);
        res.status(500).send('Internal server error');
    }
};

exports.getOrdersByUserIdController = async (req, res) => {
    try {
        const { userId } = req.params;
        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return sendResponse(res, "Invalid user ID", 400, false);
        }
        // pagination code
        // const page = Math.max(1, parseInt(req.query.page)) ;
        // const limit = Math.max(1, parseInt(req.query.limit));
        // const skip = (page - 1) * limit;
             const { page, limit, skip } = getPagination(req.query);
        
           // const total = await Category.countDocuments();
            const order= limit

        const totalOrders = await orderModel.countDocuments({ userId });
        const orders = await orderModel.find({ userId })
            .populate('products.product', '-keyHighlights -specifications')
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalOrders / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return sendResponse(res, "Orders retrieved successfully", 200, true, {
            orders,
            pagination: {
                currentPage: page,
                totalPages,
                totalOrders,
                hasNextPage,
                hasPrevPage,
                limit
            }
        });
    } catch (err) {
        // console.error('Error fetching orders:', err);
        return sendResponse(res, "Error fetching orders", 500, false);
    }
};

// Get all orders (admin)
exports.getAllOrdersController = async (req, res) => {
    try {
        // Pagination
        // const page = Math.max(1, parseInt(req.query.page)) || 1;
        // const limit = Math.max(1, parseInt(req.query.limit)) || 10;
        // const skip = (page - 1) * limit;


         const { page, limit, skip } = getPagination(req.query);
        
           // const total = await Category.countDocuments();
            const order= limit
        const totalOrders = await orderModel.countDocuments();
        const orders = await orderModel.find()
            .populate('products.product', '-keyHighlights -specifications')
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalOrders / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        return sendResponse(res, "All orders retrieved successfully", 200, true, {
            orders,
            pagination: {
                currentPage: page,
                totalPages,
                totalOrders,
                hasNextPage,
                hasPrevPage,
                limit
            }
        });
    } catch (err) {
        // console.error('Error fetching all orders:', err);
        return sendResponse(res, "Error fetching all orders", 500, false);
    }
}; 




//new code
exports.getOrderStatus = async (req, res) => {
  try {
    // Run all queries in parallel
    const [orderCounts, productStats] = await Promise.all([
      // Order counts
      Promise.all([
        orderModel.countDocuments(),
        orderModel.countDocuments({ status: "pending" }),
        orderModel.countDocuments({ shippingStatus: "delivered" }),
        orderModel.countDocuments({ shippingStatus: "cancelled" }),
      ]),
      // Product stats (total units + distinct products across all orders)
      orderModel.aggregate([
        { $unwind: "$products" },
        {
          $group: {
            _id: null,
            totalUnits: { $sum: "$products.quantity" },       // total quantity sold
            distinctProducts: { $addToSet: "$products.product" } // unique products
          }
        },
        {
          $project: {
            _id: 0,
            totalUnits: 1,
            distinctProductsCount: { $size: "$distinctProducts" }
          }
        }
      ])
    ]);

    const [totalOrders, pendingOrders, deliveredOrders, cancelledOrders] = orderCounts;
    const { totalUnits = 0, distinctProductsCount = 0 } = productStats[0] || {};

    const result = {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalUnits,              // how many items sold in total
      distinctProductsCount    // how many unique products were ordered
    };

    return sendResponse(res, "Order status fetched successfully", 200, true, result);
  } catch (error) {
    console.error("Error fetching order status", error);
    return sendResponse(res, "Error fetching order status", 500, false);
  }
};



// Helper: today's range
const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

exports.getTodayOrderStats = async (req, res) => {
  try {
    const { start, end } = getTodayRange();

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          shippingStatus: { $in: ["processing", "delivered"] }
        }
      },
      {
        $group: {
          _id: "$shippingStatus",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ];

    const stats = await orderModel.aggregate(pipeline);

    // Initialize counts
    let completed = 0;
    let processing = 0;
    let totalAmount = 0;
    let completedOrders = 0;

    stats.forEach(stat => {
      if (stat._id === "delivered") {
        completed = stat.count;
        totalAmount = stat.totalAmount;
        completedOrders = stat.count;
      } else if (stat._id === "processing") {
        processing = stat.count;
      }
    });

    // Calculate Average Order Value (AOV)
    const avgOrderValue =
      completedOrders > 0 ? (totalAmount / completedOrders).toFixed(2) : 0;

    return sendResponse(res, "Today's order stats", 200, true, {
      today: {
        completed,
        processing,
        avgOrderValue
      }
    });
  } catch (error) {
    console.log(error)
    return sendResponse(res, "Error fetching today's order stats", 500, false);
  }
};
