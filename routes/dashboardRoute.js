const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const router = express.Router();


router.get("/",dashboardController.getDashboard);
router.get("/:id", dashboardController.getJobDetails);
router.post("/new-job-manual",dashboardController.addNewJob);
router.post("/new-job-auto", dashboardController.autoJobFill);

module.exports = router;