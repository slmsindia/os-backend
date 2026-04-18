const express = require("express");
const paymentController = require("../controllers/payment.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

const router = express.Router();

// Razorpay webhook (public, signature verified)
router.post("/webhook", express.raw({ type: "application/json" }), paymentController.webhook);

// Protected routes
router.use(authMiddleware);

// Create payment orders
router.post("/order/wallet", paymentController.createWalletTopupOrder);
router.post("/order/membership", paymentController.createMembershipOrder);

// Verify payment
router.post("/verify", paymentController.verifyPayment);

// Admin routes
router.get("/admin/all", checkRole(["ADMIN", "SUPER_ADMIN"]), paymentController.getAllPayments);
router.get("/admin/stats", checkRole(["ADMIN", "SUPER_ADMIN"]), paymentController.getPaymentStats);

module.exports = router;
