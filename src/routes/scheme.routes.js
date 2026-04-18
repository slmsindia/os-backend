const express = require("express");
const schemeController = require("../controllers/scheme.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

const router = express.Router();

// Public routes
router.get("/", schemeController.listSchemes);
router.get("/categories", schemeController.getCategories);
router.get("/:id", schemeController.getSchemeDetails);

// Protected routes
router.use(authMiddleware);

// Check eligibility
router.get("/:id/eligibility", schemeController.checkEligibility);

// Business routes - Manage schemes
router.post("/", schemeController.createScheme);
router.get("/my/list", schemeController.getMySchemes);
router.patch("/:id", schemeController.updateScheme);
router.patch("/:id/deactivate", schemeController.deactivateScheme);

// Admin routes
router.get("/admin/all", checkRole(["ADMIN", "SUPER_ADMIN"]), schemeController.getAllSchemes);

module.exports = router;
