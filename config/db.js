require("dotenv").config();
const mongoose = require("mongoose");
const MONGO_URL = process.env.MONGO_URL;
// console.log("MONGO_URL", MONGO_URL)
mongoose
  .connect(MONGO_URL)
  .then(async () => {
    // console.log("mongodb is connected");
  })
  .catch((err) => {
    // console.log("failed to connect mongodb", err);
  });
