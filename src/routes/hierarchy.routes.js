const express = require("express");
const hierarchyController = require("../controllers/hierarchy.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");
const { enforceHierarchy } = require("../middleware/hierarchy.middleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get hierarchy info
router.get("/my-hierarchy", hierarchyController.getMyHierarchy);
router.get("/my-team", hierarchyController.getMyTeam);
router.get("/my-tree", hierarchyController.getMyTree);
router.get("/structure", hierarchyController.getHierarchyStructure);

// Create users in hierarchy - with strict role enforcement
// Only roles that can create other roles can access these endpoints
router.post(
  "/create",
  enforceHierarchy([
    "ADMIN",
    "SUB_ADMIN",
    "COUNTRY_HEAD",
    "STATE_HEAD",
    "DISTRICT_PARTNER",
    "AGENT"
  ]),
  hierarchyController.createHierarchyUser
);

// Admin routes - can create any role
router.post(
  "/admin/create",
  checkRole(["ADMIN", "SUPER_ADMIN"]),
  hierarchyController.createHierarchyUser
);

module.exports = router;
