const express = require("express");
const router = express.Router();
const applicationController = require("../controllers/application.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.use(authMiddleware);

// Submit any application (MEMBER / SAATHI / BUSINESS_USER / PARTNER) — goes to PENDING queue
router.post("/submit", applicationController.submit);

// WHITE_LABEL_ADMIN only: instant free upgrade (the "Upgrade User" button)
router.post("/convert", applicationController.convert);

// Verify Razorpay payment for any application
router.post("/verify-payment", applicationController.verifyPayment);

// Get own application statuses (optionally filter by ?targetIdentity=MEMBER)
router.get("/status", applicationController.getStatus);

// Admin: list all applications
router.get("/list", applicationController.list);

// Admin: approve application
router.post("/:id/approve", applicationController.approve);

// Admin: reject application
router.post("/:id/reject", applicationController.reject);

module.exports = router;
