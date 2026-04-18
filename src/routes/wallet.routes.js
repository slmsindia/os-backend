const express = require("express");
const walletController = require("../controllers/wallet.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ==================== USER Routes ====================

// Get my wallet
router.get("/", walletController.getMyWallet);

// Get my transactions
router.get("/transactions", walletController.getTransactions);

// Request top-up
router.post("/topup", walletController.requestTopup);

// Get my pending requests
router.get("/topup/pending", walletController.getPendingRequests);

// ==================== ADMIN Routes ====================

// Get all pending top-up requests
router.get("/admin/pending", checkRole(["ADMIN", "SUPER_ADMIN"]), walletController.getPendingTopups);

// Approve/reject top-up
router.patch("/admin/topup/:id", checkRole(["ADMIN", "SUPER_ADMIN"]), walletController.approveTopup);

// Direct add money
router.post("/admin/add-money", checkRole(["ADMIN", "SUPER_ADMIN"]), walletController.addMoney);

// Direct deduct money
router.post("/admin/deduct-money", checkRole(["ADMIN", "SUPER_ADMIN"]), walletController.deductMoney);

// Get all wallets
router.get("/admin/all", checkRole(["ADMIN", "SUPER_ADMIN"]), walletController.getAllWallets);

// Get wallet stats
router.get("/admin/stats", checkRole(["ADMIN", "SUPER_ADMIN"]), walletController.getWalletStats);

module.exports = router;
