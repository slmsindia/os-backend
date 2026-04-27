const express = require("express");
const walletController = require("../controllers/wallet.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");

const router = express.Router();

// ==================== MEMBER ENDPOINTS ====================
// Get my wallet details
router.get("/", authMiddleware, walletController.getMyWallet);
router.get("/my-wallet", authMiddleware, walletController.getMyWallet);

// Get all active bank details
router.get("/bank-details", authMiddleware, walletController.getActiveBankDetails);

// Create top-up request
router.post("/top-up", authMiddleware, walletController.createTopUpRequest);

// Get my top-up requests (Transactions)
router.get("/transactions", authMiddleware, walletController.getMyTopUpRequests);
router.get("/top-up/requests", authMiddleware, walletController.getMyTopUpRequests);

// ==================== ADMIN ENDPOINTS ====================
// Create bank details
router.post("/admin/bank-details", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), walletController.createBankDetails);

// Get all bank details
router.get("/admin/bank-details", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), walletController.getAllBankDetails);

// Update bank details (including activate/deactivate)
router.put("/admin/bank-details/:id", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), walletController.updateBankDetails);

// Delete bank details
router.delete("/admin/bank-details/:id", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), walletController.deleteBankDetails);

// Get all top-up requests
router.get("/admin/top-up/requests", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), walletController.getAllTopUpRequests);

// Approve top-up request
router.post("/admin/top-up/:requestId/approve", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), walletController.approveTopUpRequest);

// Reject top-up request
router.post("/admin/top-up/:requestId/reject", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), walletController.rejectTopUpRequest);

// Admin Manual Deduction
router.post("/admin/deduct", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), walletController.adminWalletDeduct);

// QR Code Management
router.post("/admin/qr-codes", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), walletController.addQRCode);
router.get("/qr-codes", authMiddleware, walletController.getQRCodes);
router.put("/admin/qr-codes/:id", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), walletController.toggleQRCode);

// Wallet Transaction History (Comprehensive)
router.get("/history", authMiddleware, walletController.getWalletTransactions);
router.get("/admin/history", authMiddleware, checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), walletController.getAllWalletTransactions);

module.exports = router;
