const express = require("express");
const walletController = require("../controllers/wallet.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkIdentity, isWhiteLabelAdmin } = require("../middleware/identity.middleware");

const router = express.Router();

// ==================== MEMBER ENDPOINTS =============// Get my wallet details
router.get("/", authMiddleware, walletController.getMyWallet);
router.get("/my-wallet", authMiddleware, walletController.getMyWallet);

// Get all active bank details
router.get("/bank-details", authMiddleware, walletController.getActiveBankDetails);

// Create top-up request
router.post("/top-up", authMiddleware, walletController.createTopUpRequest);

// Get my top-up requests (Transactions)
router.get("/transactions", authMiddleware, walletController.getMyTopUpRequests);
router.get("/top-up/requests", authMiddleware, walletController.getMyTopUpRequests);

const { checkPermission } = require("../middleware/permission.middleware");

// ==================== ADMIN ENDPOINTS =============// Create bank details
router.post("/admin/bank-details", authMiddleware, isWhiteLabelAdmin, checkPermission("PERM_MANAGE_WALLETS"), walletController.createBankDetails);

// Get all bank details
router.get("/admin/bank-details", authMiddleware, isWhiteLabelAdmin, checkPermission("PERM_MANAGE_WALLETS"), walletController.getAllBankDetails);

// Update bank details (including activate/deactivate)
router.put("/admin/bank-details/:id", authMiddleware, isWhiteLabelAdmin, checkPermission("PERM_MANAGE_WALLETS"), walletController.updateBankDetails);

// Pincode-wise bank visibility
router.get("/admin/bank-details/:id/pincode-visibility", authMiddleware, isWhiteLabelAdmin, checkPermission("PERM_MANAGE_WALLETS"), walletController.getBankPincodeVisibility);
router.put("/admin/bank-details/:id/pincode-visibility", authMiddleware, isWhiteLabelAdmin, checkPermission("PERM_MANAGE_WALLETS"), walletController.upsertBankPincodeVisibility);

// Delete bank details
router.delete("/admin/bank-details/:id", authMiddleware, isWhiteLabelAdmin, checkPermission("PERM_MANAGE_WALLETS"), walletController.deleteBankDetails);

// Get all top-up requests
router.get("/admin/top-up/requests", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN"]), checkPermission("PERM_MANAGE_WALLETS"), walletController.getAllTopUpRequests);

// Approve top-up request
router.post("/admin/top-up/:requestId/approve", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN"]), checkPermission("PERM_MANAGE_WALLETS"), walletController.approveTopUpRequest);

// Reject top-up request
router.post("/admin/top-up/:requestId/reject", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN"]), checkPermission("PERM_MANAGE_WALLETS"), walletController.rejectTopUpRequest);

// Admin Manual Deduction
router.post("/admin/deduct", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN"]), checkPermission("PERM_MANAGE_WALLETS"), walletController.adminWalletDeduct);

// QR Code Management
router.post("/admin/qr-codes", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), walletController.addQRCode);
router.get("/qr-codes", authMiddleware, walletController.getQRCodes);
router.put("/admin/qr-codes/:id", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), walletController.toggleQRCode);

// Wallet Transaction History (Comprehensive)
router.get("/history", authMiddleware, walletController.getWalletTransactions);
router.get("/admin/history", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER", "DISTRICT_PARTNER"]), checkPermission("PERM_VIEW_REPORTS"), walletController.getAllWalletTransactions);
router.get("/admin/transactions/:id", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER", "DISTRICT_PARTNER"]), checkPermission("PERM_VIEW_REPORTS"), walletController.getTransactionDetail);

module.exports = router;
