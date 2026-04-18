const express = require("express");
const memberController = require("../controllers/member.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get membership plans
router.get("/plans", memberController.getPlans);

// Get my membership
router.get("/my", memberController.getMyMembership);

// Upgrade to member
router.post("/upgrade", memberController.upgradeToMember);

// Renew membership
router.post("/renew", memberController.renewMembership);

// Toggle auto-renewal
router.patch("/auto-renew", memberController.toggleAutoRenew);

// Admin routes
router.get("/all", checkRole(["ADMIN", "SUPER_ADMIN"]), memberController.getAllMembers);

module.exports = router;
