const ListModel = require("../model/myList");
const ProductModel = require("../model/product");
const UserModel = require("../model/user");
const sendResponse = require("../utils/sendResponse");


const addToMyListController = async (req, res) => {
  try {
    const { userId, productId, size, quantity = 1 } = req.body;

    if (!userId || !productId || !size) {
      return sendResponse(res, "User ID, Product ID, and Size are required", 400, false);
    }

    if (quantity < 1) {
      return sendResponse(res, "Quantity must be at least 1", 400, false);
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return sendResponse(res, "User not found", 404, false);
    }

    const product = await ProductModel.findById(productId);
    if (!product) {
      return sendResponse(res, "Product not found", 404, false);
    }

    const existingEntry = await ListModel.findOne({ userId, productId, size });

    if (existingEntry) {
      return sendResponse(res, "Product already in cart", 400, false);
    }

    const myListItem = new ListModel({ userId, productId, size, quantity });
    const savedItem = await myListItem.save();

    await UserModel.updateOne(
      { _id: userId },
      { $addToSet: { my_list: savedItem._id } }
    );

    return sendResponse(res, "Product added to cart", 201, true, {
      data: savedItem
    });

  } catch (error) {
    // console.error("Error in addToMyListController:", error);
    return sendResponse(res, "Internal server error", 500, false);
  }
};

const getMyListProductController = async (req, res) => {
  // console.log("request get list", req.params)
  try {
    const { userId } = req.params;
    //pagination code  

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;

    if (!userId) {
      return sendResponse(res, "User ID is required", 400, false);
    }

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return sendResponse(res, "User not found", 404, false);
    }
    const skip = (page - 1) * limit;
    //fetch total count
    const totalitems = await ListModel.countDocuments({ userId });

    // Fetch list items with populated product details
    const myListItems = await ListModel.find({ userId }).populate("productId")
      .skip(skip)
      .limit(limit);

    // Format each item to include product info + image URL
    const formattedItems = myListItems.map((item) => {
      const product = item.productId;
      const imageName = product?.images?.[0] || null;

      return {
        _id: item._id,
        productId: product?._id || null,
        productName: product?.name || "",
        slug: product?.slug || null,
        size: item.size,
        quantity: item.quantity,
        price: product?.price || 0,
        discountedPrice: product?.discountedPrice || 0,
        // imageUrl: imageName
        //   ? `${req.protocol}://${req.get("host")}/uploads/${imageName}`
        //   : null,
        imageUrl: imageName || null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    return sendResponse(res, formattedItems.length ? "My list items retrieved successfully" : "My list is empty", 200, true, {
      data: formattedItems
    });
  } catch (error) {
    // console.error("Error in getMyListProductController:", error);
    return sendResponse(res, "Internal server error", 500, false);
  }
};

const deleteMyListItemsController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId } = req.body;

    if (!userId || !productId) {
      return sendResponse(res, "User ID and Product ID are required", 400, false);
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return sendResponse(res, "User not found", 404, false);
    }

    // First find the list item to get its _id
    const listItem = await ListModel.findOne({ userId, productId });
    if (!listItem) {
      return sendResponse(res, "Product not found in user's list", 404, false);
    }

    // Delete from ListModel
    const deletedItem = await ListModel.findOneAndDelete({ userId, productId });

    // Remove the list item's _id from user's my_list array
    await UserModel.updateOne(
      { _id: userId },
      { $pull: { my_list: listItem._id } }
    );

    return sendResponse(res, "Product removed from list successfully", 200, true, {
      data: deletedItem
    });

  } catch (error) {
    // console.error("Error in deleteMyListItemsController:", error);
    return sendResponse(res, "Internal server error", 500, false);
  }
};

const updateCartQuantityController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, size, quantity } = req.body;

    if (!userId || !productId || !size || typeof quantity !== 'number') {
      return sendResponse(res, "Missing required fields", 400, false);
    }

    const cartItem = await ListModel.findOneAndUpdate(
      { userId, productId, size },
      { quantity },
      { new: true }
    );

    if (!cartItem) {
      return sendResponse(res, "Cart item not found", 404, false);
    }

    return sendResponse(res, "Quantity updated successfully", 200, true, {
      data: cartItem
    });
  } catch (err) {
    // console.error('Error updating quantity:', err);
    return sendResponse(res, "Internal server error", 500, false);
  }
};

module.exports = {
  addToMyListController,
  getMyListProductController,
  deleteMyListItemsController,
  updateCartQuantityController
};
