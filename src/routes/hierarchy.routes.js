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

router.get("/all-transactions", hierarchyController.getHierarchyTransactionFeed);

/**
 * @route GET /api/admin/hierarchy/summary
 * @desc Get high-level metrics for the hierarchy (Outstanding Credits, Counts)
 */
router.get("/summary", hierarchyController.getHierarchySummary);

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
 * @route GET /api/admin/hierarchy/user-details/:identifier
 * @desc Search for a user by ID or Mobile and return profile details
 */
router.get("/user-details/:identifier", hierarchyController.getUserDetails);

/**
 * @route GET /api/admin/hierarchy/complete-user-info/:targetUserId
 * @desc Get 360-degree user info (stats, personal info, etc.)
 */
router.get("/complete-user-info/:targetUserId", hierarchyController.getCompleteUserInfo);

// --- Hierarchy Transfer Self-Service ---
router.post("/request-transfer", hierarchyController.requestTransfer);
router.post("/withdraw-transfer", hierarchyController.withdrawTransfer);
router.get("/my-request", hierarchyController.getMyHierarchyRequest);
router.get("/execute-transfers", hierarchyController.executeScheduledTransfers);

module.exports = router;
