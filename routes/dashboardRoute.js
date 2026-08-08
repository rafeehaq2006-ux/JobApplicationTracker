const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const router = express.Router();


router.get("/",dashboardController.getDashboard);
router.get("/:id", dashboardController.getJobDetails);

module.exports = router;