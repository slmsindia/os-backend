const express = require("express");
const membershipController = require("../controllers/membership.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get membership price
router.get("/price", membershipController.getMembershipPrice);

// Get reference data (education, sectors, job roles, document types)
router.get("/reference-data", membershipController.getReferenceData);

// Create membership application
router.post("/apply", membershipController.createApplication);

// Verify payment
router.post("/verify-payment", membershipController.verifyPayment);

// Get application status
router.get("/status", membershipController.getApplicationStatus);

// Resubmit rejected application
router.post("/resubmit", membershipController.resubmitApplication);

module.exports = router;
