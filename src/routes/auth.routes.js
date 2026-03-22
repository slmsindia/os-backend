const express = require("express");
const authController = require("../controllers/auth.controller");
const { otpRateLimiter } = require("../middleware/rateLimit");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// router.post("/send-otp", otpRateLimiter, authController.sendOtp);
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authMiddleware, authController.logout);

module.exports = router;
