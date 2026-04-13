const express = require("express");
const authController = require("../controllers/auth.controller");
const { otpRateLimiter } = require("../middleware/rateLimit");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// router.post("/send-otp", otpRateLimiter, authController.sendOtp);
router.post("/send-otp", otpRateLimiter, authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/check-mobile", authController.checkMobile);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authMiddleware, authController.logout);

// Get current user profile (requires authentication)
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;
