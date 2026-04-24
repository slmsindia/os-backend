const express = require("express");
const hierarchyController = require("../controllers/hierarchy.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// All hierarchy routes require authentication
router.use(authMiddleware);

/**
 * @route GET /api/admin/hierarchy/members
 * @desc Get all descendants in hierarchy with filtering
 */
router.get("/members", hierarchyController.getDescendants);

/**
 * @route GET /api/admin/hierarchy/direct-children
 * @desc Get only direct reports (one level down)
 */
router.get("/direct-children", hierarchyController.getDirectChildren);

module.exports = router;
