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
    const { user_id: userId } = req.user;

    try {
      const wallet = await walletService.getWalletByUserId(userId);

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found. Please contact admin."
        });
      }

      res.json({
        success: true,
        data: wallet
      });
    } catch (err) {
      console.error(err);
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
    const { amount, depositDate, bankDetailsId, utrNumber, paymentScreenshot } = req.body;

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

    try {
      // Check if user has a wallet
      const wallet = await walletService.getWalletByUserId(userId);
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: "Wallet not found. You must be a member to top-up."
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

      // Check if UTR number is already used in an approved request
      const utrExists = await walletService.checkUtrExists(utrNumber);
      if (utrExists) {
        return res.status(400).json({
          success: false,
          message: "This UTR number has already been used. Please enter a valid UTR."
        });
      }

      // Create top-up request
      const topUpRequest = await prisma.walletTopUpRequest.create({
        data: {
          walletId: wallet.id,
          bankDetailsId,
          amount: parseFloat(amount),
          depositDate: new Date(depositDate),
          utrNumber,
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
    const { user_id: userId } = req.user;
    const { page = 1, limit = 20, status } = req.query;

    try {
      const wallet = await walletService.getWalletByUserId(userId);
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
  }
};

module.exports = walletController;
