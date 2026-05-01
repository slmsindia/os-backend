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
 */
router.get("/children", hierarchyController.getDirectChildren);

/**
 * @route GET /api/admin/hierarchy/user-history/:targetUserId
 * @desc Get wallet history for a specific descendant
 */
router.get("/user-history/:targetUserId", hierarchyController.getUserWalletHistory);

/**
 * @route GET /api/admin/hierarchy/user-details/:targetUserId
 * @desc Get 360-degree user info (stats, personal info, etc.)
 */
router.get("/user-details/:targetUserId", hierarchyController.getCompleteUserInfo);

// --- Hierarchy Transfer Self-Service ---
router.post("/request-transfer", hierarchyController.requestTransfer);
router.post("/withdraw-transfer", hierarchyController.withdrawTransfer);
router.get("/execute-transfers", hierarchyController.executeScheduledTransfers);

module.exports = router;
