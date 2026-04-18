const express = require("express");
const businessController = require("../controllers/business.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ==================== BUSINESS PROFILE ====================

// Get my business profile
router.get("/my", businessController.getMyBusiness);

// Create/update business profile
router.post("/", businessController.upsertBusiness);
router.put("/", businessController.upsertBusiness);

// List all businesses (public within tenant)
router.get("/", businessController.listBusinesses);

// Get business by ID
router.get("/:id", businessController.getBusinessById);

// Admin: Verify business
router.patch("/:id/verify", checkRole(["ADMIN", "SUPER_ADMIN"]), businessController.verifyBusiness);

// ==================== JOB MANAGEMENT ====================

// Create job posting
router.post("/jobs", businessController.createJob);

// Get my jobs
router.get("/jobs/my", businessController.getMyJobs);

// Update job
router.patch("/jobs/:id", businessController.updateJob);

// Close job
router.patch("/jobs/:id/close", businessController.closeJob);

// Get job applicants
router.get("/jobs/:id/applicants", businessController.getJobApplicants);

// Update application status
router.patch("/jobs/:id/applicants/:applicationId", businessController.updateApplicationStatus);

module.exports = router;
