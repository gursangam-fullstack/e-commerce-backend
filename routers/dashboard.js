const express = require ("express")

const { getDashboardStatus, getTopProducts, getGrwothStatus} = require ("../controllers/dashboard")

const dashboardouter = express.Router();

dashboardouter.get("/status",getDashboardStatus)

dashboardouter.get("/top-products",getTopProducts)
dashboardouter.get("/growth-status",getGrwothStatus)
module.exports = dashboardouter;