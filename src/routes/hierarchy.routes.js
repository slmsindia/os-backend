const express = require("express");
const hierarchyController = require("../controllers/hierarchy.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// All hierarchy routes require authentication
router.use(authMiddleware);

/**
 * @route GET /api/admin/hierarchy/members
 * @desc Get all descendants (Flattened/Search view)
 */
router.get("/members", hierarchyController.getDescendants);

/**
 * @route GET /api/admin/hierarchy/children
 * @desc Get direct children (Tree Navigation)
 * @query {string} parentId - (Optional) Parent user ID to explore
 * @query {string} identity - (Optional) Filter by identity (CTP, STP, etc.)
 */
router.get("/children", hierarchyController.getDirectChildren);

/**
 * @route GET /api/admin/hierarchy/user-history/:targetUserId
 * @desc Get wallet history for a specific descendant
 */
router.get("/user-history/:targetUserId", hierarchyController.getUserWalletHistory);

module.exports = router;
