const express = require("express");
const profileController = require("../controllers/profile.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get user profile
router.get("/", profileController.getProfile);

// Create or update full profile
router.post("/", profileController.upsertProfile);
router.put("/", profileController.upsertProfile);

// Skills management
router.post("/skills", profileController.addSkills);
router.delete("/skills", profileController.removeSkills);

// Location management
router.put("/location", profileController.updateLocation);

// Education management
router.post("/education", profileController.addEducation);

// Delete profile
router.delete("/", profileController.deleteProfile);

module.exports = router;
