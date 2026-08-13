const express = require("express");
const authController = require("../controllers/Authcontroller");
const router = express.Router();

router.get("/auth/google", authController.startGoogleAuth);
router.get("/oauth2callback", authController.handleGoogleCallback);
router.post("/auth/logout", authController.logoutGoogle);

module.exports = router;