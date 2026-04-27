const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const walletService = require("../services/wallet.service");
const { logAction } = require("../utils/audit");

const walletController = {
  // ==================== MEMBER ENDPOINTS ====================

  /**
   * Get my wallet details
   */
  getMyWallet: async (req, res) => {
    const { user_id: userId, identity, tenant_id: tenantId } = req.user;

    try {
      // 1. Use the Smart Resolver to find the correct wallet (Personal or Shared)
      let wallet = await walletService.resolveWallet(userId, tenantId, identity);

      // 2. Handle missing wallets (Lazy initialization for non-admin roles)
      if (!wallet) {
        if (identity === 'USER') {
          return res.status(404).json({ success: false, message: "Users do not have wallets." });
        }
        
        console.log(`Initializing missing wallet for ${identity}: ${userId}`);
        wallet = await walletService.createWallet(userId, tenantId, false);
      }

      res.json({
        success: true,
        data: wallet
      });
    } catch (err) {
      console.error("Get Wallet Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get all active bank details (for members to see where to send money)
   */
  getActiveBankDetails: async (req, res) => {
    try {
      const bankDetails = await prisma.bankDetails.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" }
      });

      res.json({
        success: true,
        data: bankDetails
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Create top-up request
   */
  createTopUpRequest: async (req, res) => {
    const { user_id: userId } = req.user;
    const { amount, depositDate, bankDetailsId, paymentScreenshot } = req.body;
    const utrNumber = req.body.utrNumber?.trim();

    // Validation
    if (!amount || !depositDate || !bankDetailsId || !utrNumber || !paymentScreenshot) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0"
      });
    }

    const inputDate = new Date(depositDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Allow until end of today

    if (inputDate > today) {
      return res.status(400).json({
        success: false,
        message: "Deposit date cannot be in the future"
      });
    }

    try {
      // Check if user has a wallet (Using Resolver for Shared/Individual)
      const { identity, tenant_id: tenantId } = req.user;
      const wallet = await walletService.resolveWallet(userId, tenantId, identity);
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found. Users cannot top-up."
        });
      }

      // Check if bank details exist and are active
      const bankDetails = await prisma.bankDetails.findUnique({
        where: { id: bankDetailsId }
      });

      if (!bankDetails) {
        return res.status(404).json({
          success: false,
          message: "Bank details not found"
        });
      }

      if (!bankDetails.isActive) {
        return res.status(400).json({
          success: false,
          message: "This bank account is currently inactive. Please select another."
        });
      }

      // Prevent multiple pending requests
      const existingPending = await prisma.walletTopUpRequest.findFirst({
        where: {
          walletId: wallet.id,
          status: "PENDING"
        }
      });

      if (existingPending) {
        return res.status(400).json({
          success: false,
          message: "You already have a pending top-up request. Please wait for it to be processed."
        });
      }

      // Check if UTR number is already used in an approved request
      const utrExists = await walletService.checkUtrExists(utrNumber);
      if (utrExists) {
        return res.status(400).json({
          success: false,
          message: "This UTR number is already associated with a pending or approved request. Please check your transaction history."
        });
      }

      // Create top-up request
      const topUpRequest = await prisma.walletTopUpRequest.create({
        data: {
          walletId: wallet.id,
          bankDetailsId,
          amount: parseFloat(amount),
          depositDate: new Date(depositDate),
          utrNumber: utrNumber.trim(),
          paymentScreenshot,
          status: "PENDING"
        },
        include: {
          bankDetails: {
            select: {
              id: true,
              bankName: true,
              accountNumber: true
            }
          }
        }
      });

      // Mark the previous REJECTED request with same UTR as resubmitted
      await prisma.walletTopUpRequest.updateMany({
        where: {
          walletId: wallet.id,
          utrNumber: utrNumber.trim(),
          status: 'REJECTED',
          isResubmitted: false,
          id: { not: topUpRequest.id }
        },
        data: {
          isResubmitted: true
        }
      });

      await logAction({
        userId,
        action: "WALLET_TOPUP_REQUEST",
        targetId: topUpRequest.id,
        metadata: { amount: topUpRequest.amount, utrNumber }
      });

      res.status(201).json({
        success: true,
        message: "Top-up request submitted successfully. Please wait for admin approval.",
        data: topUpRequest
      });
    } catch (err) {
      console.error(err);
      if (err.code === "P2002") {
        return res.status(400).json({
          success: false,
          message: "This UTR number has already been used."
        });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get my top-up requests
   */
  getMyTopUpRequests: async (req, res) => {
    const { user_id: userId, identity, tenant_id: tenantId } = req.user;
    const { page = 1, limit = 20, status } = req.query;

    try {
      const wallet = await walletService.resolveWallet(userId, tenantId, identity);
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found"
        });
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = { walletId: wallet.id };

      if (status) {
        where.status = status;
      }

      const [requests, total] = await Promise.all([
        prisma.walletTopUpRequest.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: "desc" },
          include: {
            bankDetails: {
              select: {
                id: true,
                bankName: true,
                accountNumber: true,
                ifscCode: true
              }
            }
          }
        }),
        prisma.walletTopUpRequest.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          requests,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Create bank details
   */
  createBankDetails: async (req, res) => {
    const { user_id: adminId } = req.user;
    const { bankName, beneficiaryName, accountNumber, branch, ifscCode } = req.body;

    if (!bankName || !beneficiaryName || !accountNumber || !branch || !ifscCode) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    try {
      const bankDetails = await prisma.bankDetails.create({
        data: {
          bankName,
          beneficiaryName,
          accountNumber,
          branch,
          ifscCode,
          isActive: true
        }
      });

      await logAction({
        userId: adminId,
        action: "CREATE_BANK_DETAILS",
        targetId: bankDetails.id,
        metadata: { bankName, accountNumber }
      });

      res.status(201).json({
        success: true,
        message: "Bank details added successfully",
        data: bankDetails
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get all bank details (with filtering)
   */
  getAllBankDetails: async (req, res) => {
    const { page = 1, limit = 20, isActive } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      if (isActive !== undefined) {
        where.isActive = isActive === "true";
      }

      const [bankDetails, total] = await Promise.all([
        prisma.bankDetails.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: "desc" }
        }),
        prisma.bankDetails.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          bankDetails,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Update bank details (including activate/deactivate)
   */
  updateBankDetails: async (req, res) => {
    const { user_id: adminId } = req.user;
    const { id } = req.params;
    const { bankName, beneficiaryName, accountNumber, branch, ifscCode, isActive } = req.body;

    try {
      const existing = await prisma.bankDetails.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Bank details not found"
        });
      }

      const updated = await prisma.bankDetails.update({
        where: { id },
        data: {
          bankName: bankName || existing.bankName,
          beneficiaryName: beneficiaryName || existing.beneficiaryName,
          accountNumber: accountNumber || existing.accountNumber,
          branch: branch || existing.branch,
          ifscCode: ifscCode || existing.ifscCode,
          isActive: isActive !== undefined ? isActive : existing.isActive
        }
      });

      await logAction({
        userId: adminId,
        action: "UPDATE_BANK_DETAILS",
        targetId: updated.id,
        metadata: { isActive: updated.isActive }
      });

      res.json({
        success: true,
        message: "Bank details updated successfully",
        data: updated
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Delete bank details
   */
  deleteBankDetails: async (req, res) => {
    const { user_id: adminId } = req.user;
    const { id } = req.params;

    try {
      const existing = await prisma.bankDetails.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Bank details not found"
        });
      }

      // Check if there are pending requests using this bank
      const pendingRequests = await prisma.walletTopUpRequest.count({
        where: {
          bankDetailsId: id,
          status: "PENDING"
        }
      });

      if (pendingRequests > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete bank details with pending top-up requests"
        });
      }

      await prisma.bankDetails.delete({ where: { id } });

      await logAction({
        userId: adminId,
        action: "DELETE_BANK_DETAILS",
        targetId: id
      });

      res.json({
        success: true,
        message: "Bank details deleted successfully"
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get all top-up requests (admin view)
   */
  getAllTopUpRequests: async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = {};

      if (status) {
        where.status = status;
      }

      const [requests, total] = await Promise.all([
        prisma.walletTopUpRequest.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: "desc" },
          include: {
            wallet: {
              include: {
                user: {
                  select: {
                    id: true,
                    mobile: true,
                    fullName: true,
                    email: true
                  }
                }
              }
            },
            bankDetails: {
              select: {
                id: true,
                bankName: true,
                accountNumber: true,
                branch: true,
                ifscCode: true
              }
            }
          }
        }),
        prisma.walletTopUpRequest.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          requests,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Approve top-up request
   */
  approveTopUpRequest: async (req, res) => {
    const { user_id: adminId } = req.user;
    const { requestId } = req.params;

    try {
      const request = await prisma.walletTopUpRequest.findUnique({
        where: { id: requestId },
        include: { wallet: true }
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Top-up request not found"
        });
      }

      if (request.status !== "PENDING") {
        return res.status(400).json({
          success: false,
          message: `Request is already ${request.status}`
        });
      }

      // Check if UTR is already approved by another request
      const isAlreadyApproved = await walletService.checkUtrExists(request.utrNumber);
      if (isAlreadyApproved) {
        return res.status(400).json({
          success: false,
          message: "This UTR number has already been approved in another request."
        });
      }

      // Update request status
      await prisma.walletTopUpRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          approvedBy: adminId,
          approvedAt: new Date()
        }
      });

      // Add amount to wallet balance
      await walletService.updateBalance(request.walletId, request.amount);

      await logAction({
        userId: adminId,
        action: "APPROVE_TOPUP_REQUEST",
        targetId: requestId,
        metadata: { amount: request.amount, walletId: request.walletId }
      });

      res.json({
        success: true,
        message: "Top-up request approved successfully. Wallet balance updated.",
        data: {
          requestId: request.id,
          amount: request.amount,
          walletId: request.walletId
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Reject top-up request
   */
  rejectTopUpRequest: async (req, res) => {
    const { user_id: adminId } = req.user;
    const { requestId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required"
      });
    }

    try {
      const request = await prisma.walletTopUpRequest.findUnique({
        where: { id: requestId }
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Top-up request not found"
        });
      }

      if (request.status !== "PENDING") {
        return res.status(400).json({
          success: false,
          message: `Request is already ${request.status}`
        });
      }

      await prisma.walletTopUpRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          rejectionReason: reason
        }
      });

      await logAction({
        userId: adminId,
        action: "REJECT_TOPUP_REQUEST",
        targetId: requestId,
        metadata: { reason }
      });

      res.json({
        success: true,
        message: "Top-up request rejected",
        data: {
          requestId: request.id,
          rejectionReason: reason
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Admin Wallet Deduction (Manual)
   */
  adminWalletDeduct: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId, identity } = req.user;
    const { targetUserId, amount, reason } = req.body;

    const ELIGIBLE_ROLES = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'];
    if (!ELIGIBLE_ROLES.includes(identity)) {
      return res.status(403).json({ success: false, message: "Permission denied" });
    }

    if (!targetUserId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid target user or amount" });
    }

    try {
      const targetWallet = await prisma.wallet.findUnique({
        where: { userId: targetUserId }
      });

      if (!targetWallet) {
        return res.status(404).json({ success: false, message: "Target user wallet not found" });
      }

      if (targetWallet.balance < amount) {
        return res.status(400).json({ success: false, message: "Insufficient balance in target wallet" });
      }

      const result = await prisma.$transaction(async (tx) => {
        const updatedWallet = await tx.wallet.update({
          where: { id: targetWallet.id },
          data: { balance: { decrement: amount } }
        });

        const txn = await tx.walletTransaction.create({
          data: {
            walletId: targetWallet.id,
            amount: amount,
            type: "DEBIT",
            category: "ADMIN_ADJUSTMENT",
            description: reason || "Admin manual deduction",
            tenantId
          }
        });

        return { updatedWallet, txn };
      });

      await logAction({
        userId: adminId,
        action: "ADMIN_WALLET_DEDUCT",
        targetId: targetUserId,
        metadata: { amount, reason }
      });

      res.json({ success: true, message: "Balance deducted successfully", data: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * QR Code Management
   */
  addQRCode: async (req, res) => {
    const { tenant_id: tenantId, user_id: adminId } = req.user;
    const { title, imageUrl } = req.body;

    try {
      const qr = await prisma.qRCode.create({
        data: { title, imageUrl, tenantId }
      });

      await logAction({
        userId: adminId,
        action: "ADD_QR_CODE",
        targetId: qr.id,
        metadata: { title }
      });

      res.status(201).json({ success: true, data: qr });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getQRCodes: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    try {
      const codes = await prisma.qRCode.findMany({
        where: { tenantId, isActive: true }
      });
      res.json({ success: true, data: codes });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  toggleQRCode: async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    try {
      const qr = await prisma.qRCode.update({
        where: { id },
        data: { isActive }
      });
      res.json({ success: true, data: qr });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Wallet Transactions History
   */
  getWalletTransactions: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId, identity } = req.user;
    const { page = 1, limit = 20, type, category } = req.query;

    try {
      const wallet = await walletService.resolveWallet(userId, tenantId, identity);
      if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found" });

      const where = { walletId: wallet.id };
      if (type) where.type = type;
      if (category) where.category = category;

      const [txns, total] = await Promise.all([
        prisma.walletTransaction.findMany({
          where,
          skip: (parseInt(page) - 1) * parseInt(limit),
          take: parseInt(limit),
          orderBy: { createdAt: "desc" }
        }),
        prisma.walletTransaction.count({ where })
      ]);

      res.json({
        success: true,
        data: txns,
        pagination: {
          page: parseInt(page),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = walletController;
