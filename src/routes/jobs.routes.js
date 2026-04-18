const express = require("express");
const jobsController = require("../controllers/jobs.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// Public routes (no auth required)
router.get("/search", jobsController.searchJobs);
router.get("/", jobsController.searchJobs);
router.get("/:id", jobsController.getJobDetails);

// Protected routes (auth required)
router.use(authMiddleware);

// Get recommended jobs based on user profile
router.get("/recommended/matches", jobsController.getRecommendedJobs);

// Apply to a job
router.post("/:id/apply", jobsController.applyToJob);

// Get my applications
router.get("/applications/my", jobsController.getMyApplications);

// Withdraw application
router.delete("/applications/:id", jobsController.withdrawApplication);

module.exports = router;
