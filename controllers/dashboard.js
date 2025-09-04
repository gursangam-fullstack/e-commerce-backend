
const orderModel = require("../model/order");
const userModel = require("../model/User");

const productModel = require("../model/product");
const sendResponse = require("../utils/sendResponse");

exports.getDashboardStatus= async (req, res) => {
  try {
    const [totalCustomers, totalProducts, totalOrders, totalSalesAgg] = await Promise.all([
      userModel.countDocuments(),
      productModel.countDocuments(),
      orderModel.countDocuments(),
      orderModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" } // sum the amount field
          }
        }
      ])
    ]);

    const result = {
      totalCustomers,
      totalProducts,
      totalOrders,
      totalSales: totalSalesAgg[0]?.total || 0
    };

    return sendResponse(res, "Dashboard stats fetched successfully", 200, true, result);
  } catch (error) {
    console.error("Error fetching dashboard stats", error);
    return sendResponse(res, "Error fetching dashboard stats", 500, false);
  }
};
exports.getTopProducts = async (req, res) => {
  try {
    const topProducts = await orderModel.aggregate([
      { $match: { shippingStatus: "delivered" } }, // ✅ only delivered orders
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          totalQuantity: { $sum: "$products.quantity" },
          totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.price"] } } // ✅ uses per-product price
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          name: "$productDetails.name",
          totalQuantity: 1,
          totalRevenue: 1
        }
      },
      { $sort: { totalRevenue: -1, totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    return sendResponse(res, "Top products fetched successfully", 200, true, topProducts);
  } catch (error) {
    console.error("Error fetching top products", error);
    return sendResponse(res, "Error fetching top products", 500, false);
  }
};


exports.getGrwothStatus = async(req,res)=>{
  const now =new Date();
  try{
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth()-1,1);
  const endOfLastMonth = new Date(now.getFullYear(),now.getMonth(),0,23,59,59);

  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);


  //fetch order for both months
  const [thisMonthAgg,lastMontAgg]= await Promise.all([
    orderModel.aggregate([
      {
        $match :{
          createdAt :{$gte : startOfThisMonth,$lte: endOfLastMonth},
          shippingStatus : "delivered"
        }
      },
      {
        $group: {
          _id : null,
          totalOrders : {$sum : 1},
          totalSales : {$sum : "$amount"}
        }
      }
    ]),
    orderModel.aggregate([
      {
        $match :{
          createdAt : {$gte : startOfLastMonth,$lte:endOfLastMonth},
          shippingStatus : "delivered"
        }
      },
      {
        $group:{
          _id : null,
          totalOrders : { $sum :1},
          totalSales : { $sum : "$amount"}
        }
      }
    ]),
    orderModel.aggregate ([
      {
        $match : {
          createdAt : {$gte : startOfLastMonth,$lte : endOfLastMonth},
          shippingStatus : "delivered"
        }
      },
      {
        $group : {
          _id : null,
          totalOrders : {$sum : 1},
          totalSales : {$sum : "$amount"}
        }
      }
    ])
  ]);
  // extract values safely

  const thisMonth  ={

    totalOrders : thisMonthAgg[0]?.totalOrders || 0,
    toalSales :   thisMonthAgg [0]?.totalSales || 0
  };

  const lastMonth = {
    totalOrders : lastMontAgg[0]?.totalOrders || 0,
    totalSales : lastMontAgg[0]?.totalSales || 0
  };

  // growth calculation helper 
  const calcGrowth = (current,prev)=>{
    if(prev ===0 && current >0) return 100;
    if(prev ===0 && current===0) return 0;
    return((current-prev)/prev *100).toFixed(2);
  };

  const grwoth ={
    
    ordersGrowthRate : calcGrowth (thisMonth.toalSales,lastMonth.totalOrders),
    salesGrowthRate : calcGrowth(thisMonth.toalSales,lastMonth.totalSales)

  };

  return sendResponse (res,"Growth satus fetched successfully",200,true,{
    thisMonth,
    lastMonth,
    grwoth
  }
  );
  }
  catch (error)
  {
    console.log(error)
    return sendResponse(res, "Error fetching growth status",500,false)

  }
}
