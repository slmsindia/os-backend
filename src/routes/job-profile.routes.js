const express = require("express");
const jobProfileController = require("../controllers/job-profile.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// User routes
router.get("/my-profile", jobProfileController.getJobProfile);
router.post("/save", jobProfileController.saveJobProfile);
router.patch("/update", jobProfileController.updateJobProfile);
router.get("/can-view-jobs", jobProfileController.canViewJobs);

// Get admin-configured data
router.get("/categories", jobProfileController.getJobCategories);
router.get("/skills", jobProfileController.getSkills);

// Admin routes
router.post("/admin/category", checkRole(["ADMIN", "SUPER_ADMIN"]), jobProfileController.createJobCategory);
router.post("/admin/role", checkRole(["ADMIN", "SUPER_ADMIN"]), jobProfileController.createJobRole);
router.post("/admin/skill", checkRole(["ADMIN", "SUPER_ADMIN"]), jobProfileController.createSkill);
router.get("/admin/pending-verifications", checkRole(["ADMIN", "SUPER_ADMIN"]), jobProfileController.getPendingVerifications);
router.patch("/admin/verify/:verificationId", checkRole(["ADMIN", "SUPER_ADMIN"]), jobProfileController.processVerification);

module.exports = router;
