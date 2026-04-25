const express = require("express");
const membershipController = require("../controllers/membership.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// Public routes (No authentication required to see price and options)
router.get("/debug-ping", (req, res) => res.json({ message: "Membership router is working" }));
router.get("/price", membershipController.getMembershipPrice);
router.get("/reference-data", membershipController.getReferenceData);
router.get("/check-mobile", membershipController.checkMobile);

// Protected routes require authentication
router.use(authMiddleware);

// Create membership application
router.post("/apply", membershipController.createApplication);

// Verify payment
router.post("/verify-payment", membershipController.verifyPayment);

// Get application status
router.get("/status", membershipController.getApplicationStatus);

// Resubmit rejected application
router.post("/resubmit", membershipController.resubmitApplication);

module.exports = router;
