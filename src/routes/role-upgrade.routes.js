const express = require("express");
const roleUpgradeController = require("../controllers/role-upgrade.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// User routes - get available upgrades and request
router.get("/available", roleUpgradeController.getAvailableUpgrades);
router.get("/my-status", roleUpgradeController.getMyUpgradeStatus);
router.post("/request", roleUpgradeController.requestUpgrade);
router.post("/payment-order", roleUpgradeController.createUpgradePaymentOrder);

// Admin routes - manage upgrade requests
router.get("/admin/pending", checkRole(["ADMIN", "SUPER_ADMIN"]), roleUpgradeController.getPendingUpgrades);
router.patch("/admin/:userId/process", checkRole(["ADMIN", "SUPER_ADMIN"]), roleUpgradeController.processUpgradeRequest);

module.exports = router;
