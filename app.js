const express = require("express");
const cors = require("cors");
const bodyParser = require('body-parser');
const app = express();
const uploadRouter = require("./routers/uploadRouter");

const mongoSanitize = require("express-mongo-sanitize");
require("dotenv").config();
require("./config/db");

const cookieParser = require("cookie-parser");
const userRouter = require("./routers/userRouter");
const categoryRouter = require("./routers/categoryRouter");
const productRouter = require("./routers/productRouter");
const myListRouter = require("./routers/myListRouter");
const addressRouter = require("./routers/addressRouter");
const orderRouter = require("./routers/orderRouter");
const wishlistRouter = require("./routers/wishlistRouter");
const reviewRouter = require("./routers/reviewRouter");
const subCategoryRouter = require("./routers/subCategoryRouter");
const subSubCategoryRouter = require("./routers/subSubCategoryRouter");

// Import routes

PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Special handling for Razorpay webhook
app.use('/api/order/webhook', express.raw({ type: 'application/json' }));

const allowedOrigins = ["http://localhost:3000", "http://localhost:3002", "https://aaromi-swagger-admin.vercel.app", "https://aaromi-swagger.vercel.app"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.set("trust proxy", 1);
// app.use((req, res, next) => {
//   console.log("IP:", req.ip);
//   console.log("Secure?", req.secure);
//   console.log("Headers:", req.headers);
//   next();
// });

app.use("/uploads", express.static("uploads"));
app.use((req, res, next) => {
  // console.log("Incoming cookies:", req.cookies);
  next();
});


app.use((req, res, next) => {
  if (req.body) {
    mongoSanitize.sanitize(req.body, {
      replaceWith: "_",
      onSanitize: ({ key }) => {
        console.warn(`Sanitized key from body: ${key}`);
      },
    });
  }
  next();
});

app.use("/api/auth", userRouter);
app.use("/api/category", categoryRouter);
app.use("/api/product", productRouter);
app.use("/api/subcategory", subCategoryRouter);
app.use("/api/subsubcategory", subSubCategoryRouter);
app.use("/api/uploads", uploadRouter);
app.use("/api/mylist", myListRouter);
app.use("/api/address", addressRouter);
app.use('/api/order', orderRouter);
app.use('/api/wishlist', wishlistRouter);
app.use('/api/review', reviewRouter);

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // Handle multer file size error
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: "File size too large. Maximum size allowed is 2MB",
      statusCode: 400
    });
  }
  
  // Handle multer file type error
  if (error.message && error.message.includes('Only images are allowed')) {
    return res.status(400).json({
      success: false,
      message: "Only image files (JPEG, PNG, JPG) are allowed",
      statusCode: 400
    });
  }
  
  // Handle other errors
  return res.status(500).json({
    success: false,
    message: "Internal server error",
    statusCode: 500
  });
});

app.listen(PORT, () => {
  console.log(`server listen on port: ${PORT}`);
});

module.exports = app;
