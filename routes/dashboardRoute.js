const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const router = express.Router();


router.get("/",dashboardController.getDashboard);
router.get("/sync-emails", dashboardController.syncEmails);
router.get("/:id", dashboardController.getJobDetails);
router.post("/new-job-manual",dashboardController.addNewJob);
router.post("/new-job-auto", dashboardController.autoJobFill);
router.get("/edit-info/:id", dashboardController.editJob);
router.post("/edit/:id",dashboardController.makeEditChanges);
router.delete("/:id",dashboardController.deleteJob);
module.exports = router;