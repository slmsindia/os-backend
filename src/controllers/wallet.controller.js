const prisma = require("../lib/prisma");
const walletService = require("../services/wallet.service");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");
const { normalizeIdentity } = require("../utils/identity");
const {
  buildLogMap,
  buildUserMap,
  buildWalletBalanceMap,
  enrichLedgerTransactions,
  sortTransactionsDesc,
  getLedgerMetadataUserIds
} = require("../utils/ledger");

const formatApplicationLedgerLabel = (targetIdentity = "") => {
  const normalized = String(targetIdentity || "").replace(/_/g, " ").trim();
  if (!normalized) return "Application";
  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1).toLowerCase()} Application`;
};

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

const resolveUserPincode = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      registrationPincode: true,
      registrationAddress: true,
      membershipApplications: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          currentPincode: true,
          permanentPincode: true
        }
      }
    }
  });

  const address = user?.registrationAddress && typeof user.registrationAddress === "object"
    ? user.registrationAddress
    : {};

  return String(
    user?.registrationPincode ||
    address?.pinCode ||
    address?.pincode ||
    user?.membershipApplications?.[0]?.currentPincode ||
    user?.membershipApplications?.[0]?.permanentPincode ||
    ""
  ).trim();
};

const ensureBankVisibleForUserPincode = async ({ bankDetailsId, tenantId, userId, identity }) => {
  const pincode = await resolveUserPincode(userId);
  const normalizedIdentity = normalizeIdentity(identity || "USER");

  if (!PINCODE_REGEX.test(pincode)) {
    return {
      ok: false,
      status: 400,
      code: "PINCODE_REQUIRED",
      message: "Please update your valid pincode before adding money."
    };
  }

  const bankDetails = await prisma.bankDetails.findFirst({
    where: {
      id: bankDetailsId,
      isActive: true,
      tenantId: tenantId || undefined,
      pincodeVisibility: {
        some: {
          pincode: { in: [pincode, "ALL"] },
          isActive: true,
          tenantId: tenantId || undefined,
          OR: [
            { targetType: 'ALL' },
            {
              targetType: 'IDENTITY',
              OR: [
                { targetIdentity: { isEmpty: true } },
                { targetIdentity: { has: normalizedIdentity } }
              ]
            },
            {
              targetType: 'LOCATION',
              OR: [
                { targetIdentity: { isEmpty: true } },
                { targetIdentity: { has: normalizedIdentity } }
              ]
            }
          ]
        }
      }
    }
  });

  if (!bankDetails) {
    return {
      ok: false,
      status: 404,
      code: "BANK_NOT_AVAILABLE",
      message: "Bank details not found or inactive."
    };
  }

  return { ok: true, pincode, bankDetails };
};

const walletController = {
  // ==================== MEMBER ENDPOINTS ====================
  /**
   * Get my wallet details
   */
  getMyWallet: async (req, res) => {
    try {
      let { user_id: userId, identity: rawIdentity, tenant_id: tenantId } = req.user || {};
      const identity = normalizeIdentity(rawIdentity);

      if (!userId || !identity) {
        return res.status(400).json({ success: false, message: "Invalid user data in token" });
      }

      if (!tenantId && userId) {
        const row = await prisma.user.findUnique({
          where: { id: userId },
          select: { tenantId: true }
        });
        tenantId = row?.tenantId || null;
      }

      console.log(`[Wallet] Getting wallet for user: ${userId}, identity: ${identity}, tenant: ${tenantId}`);
      // 1. Use the Smart Resolver to find the correct wallet (Personal or Shared)
      let wallet = await walletService.resolveWallet(userId, tenantId, identity);
      console.log(`[Wallet] Resolved wallet: ${wallet ? wallet.id : 'NONE'}`);

      // 2. Handle missing wallets (Lazy initialization for non-admin roles)
      if (!wallet) {
        if (identity === 'USER') {
          return res.status(404).json({ success: false, message: "Users do not have wallets." });
        }
        
        console.log(`Initializing missing wallet for ${identity}: ${userId}`);
        if (!tenantId) {
          return res.status(400).json({
            success: false,
            message: "Cannot create wallet: missing tenant for this account."
          });
        }
        wallet = await walletService.createWallet(userId, tenantId, false);
      }

      res.json({
        success: true,
        data: wallet
      });
    } catch (err) {
      console.error("Get Wallet Error:", err);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error",
        error: err.message
      });
    }
  },

  /**
   * Get all active bank details (for members to see where to send money)
   */
  getActiveBankDetails: async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || req.user?.tenantId || req.tenant_id;
      const userId = req.user?.user_id;
      const identity = normalizeIdentity(req.user?.identity || 'USER');
      const pincode = await resolveUserPincode(userId);

      if (!PINCODE_REGEX.test(pincode)) {
        return res.status(400).json({
          success: false,
          code: "PINCODE_REQUIRED",
          message: "Please update your valid pincode before adding money.",
          data: { pincode: pincode || null, bankDetails: [] }
        });
      }
      
      console.log(`[WalletController] Fetching active bank details for tenant: ${tenantId}, pincode: ${pincode}, identity: ${identity}`);

      const bankDetails = await prisma.bankDetails.findMany({
        where: {
          isActive: true,
          tenantId: tenantId || undefined,
          pincodeVisibility: {
            some: {
              pincode: { in: [pincode, "ALL"] },
              isActive: true,
              tenantId: tenantId || undefined,
              OR: [
                { targetType: 'ALL' },
                {
                  targetType: 'IDENTITY',
                  OR: [
                    { targetIdentity: { isEmpty: true } },
                    { targetIdentity: { has: identity } }
                  ]
                },
                {
                  targetType: 'LOCATION',
                  OR: [
                    { targetIdentity: { isEmpty: true } },
                    { targetIdentity: { has: identity } }
                  ]
                }
              ]
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: bankDetails,
        meta: { pincode }
      });
    } catch (err) {
      console.error("[WalletController] getActiveBankDetails Error:", err);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error",
        error: err.message,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
      });
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

      const visibility = await ensureBankVisibleForUserPincode({ bankDetailsId, tenantId, userId, identity });
      if (!visibility.ok) {
        return res.status(visibility.status).json({
          success: false,
          code: visibility.code,
          message: visibility.message
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
      res.status(500).json({ 
        success: false, 
        message: "Internal server error",
        error: err.message
      });
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
    const { user_id: adminId, tenant_id: tenantId } = req.user;
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
          isActive: true,
          tenantId
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
    const { tenant_id: tenantId } = req.user;
    const { page = 1, limit = 20, isActive } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = { tenantId };

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

  getBankPincodeVisibility: async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id || req.user?.tenantId;
      const { pincode } = req.query;

      const bank = await prisma.bankDetails.findFirst({
        where: {
          id,
          ...(tenantId ? { tenantId } : {})
        }
      });

      if (!bank) {
        return res.status(404).json({ success: false, message: "Bank details not found" });
      }

      const where = {
        bankDetailsId: id,
        ...(tenantId ? { tenantId } : {}),
        ...(pincode ? { pincode: String(pincode).trim() } : {})
      };

      const visibility = await prisma.bankPincodeVisibility.findMany({
        where,
        orderBy: [
          { pincode: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      res.json({
        success: true,
        data: {
          bank,
          visibility
        }
      });
    } catch (err) {
      console.error("[WalletController] getBankPincodeVisibility Error:", err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  upsertBankPincodeVisibility: async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.user?.tenant_id || req.user?.tenantId;
      const userId = req.user?.user_id;
      const pincode = String(req.body.pincode || "").trim();
      const locationName = String(req.body.locationName || "").trim() || null;
      const targetType = String(req.body.targetType || 'ALL').toUpperCase();
      const rawTargetIdentity = req.body.targetIdentity;
      const targetIdentity = Array.isArray(rawTargetIdentity)
        ? rawTargetIdentity.map((item) => normalizeIdentity(item)).filter((item) => !!item)
        : String(rawTargetIdentity || "").split(",").map((item) => normalizeIdentity(item)).filter((item) => !!item);
      const targetCountries = Array.isArray(req.body.targetCountries) ? req.body.targetCountries.map(String) : [];
      const targetStates = Array.isArray(req.body.targetStates) ? req.body.targetStates.map(String) : [];
      const targetCities = Array.isArray(req.body.targetCities) ? req.body.targetCities.map(String) : [];
      const targetDistricts = Array.isArray(req.body.targetDistricts) ? req.body.targetDistricts.map(String) : [];
      const targetPincodes = Array.isArray(req.body.targetPincodes) ? req.body.targetPincodes.map(String) : [];
      const isActive = Boolean(req.body.isActive);

      // Pincode validation: Allow "ALL" regardless of targetType, or require 6-digit pincode
      const isAllPincode = pincode === "ALL";
      if (!isAllPincode && !PINCODE_REGEX.test(pincode)) {
        return res.status(400).json({
          success: false,
          code: "INVALID_PINCODE",
          message: "Valid 6 digit pincode or 'ALL' is required."
        });
      }

      const bank = await prisma.bankDetails.findFirst({
        where: {
          id,
          ...(tenantId ? { tenantId } : {})
        }
      });

      if (!bank) {
        return res.status(404).json({ success: false, message: "Bank details not found" });
      }

      const existingVisibility = await prisma.bankPincodeVisibility.findFirst({
        where: {
          bankDetailsId: id,
          pincode,
          ...(tenantId ? { tenantId } : {})
        }
      });

      const visibilityData = {
        bankDetailsId: id,
        tenantId,
        pincode,
        locationName,
        targetType,
        targetIdentity,
        targetCountries,
        targetStates,
        targetCities,
        targetDistricts,
        targetPincodes,
        isActive,
        updatedBy: userId
      };

      const visibility = existingVisibility
        ? await prisma.bankPincodeVisibility.update({
            where: { id: existingVisibility.id },
            data: visibilityData
          })
        : await prisma.bankPincodeVisibility.create({
            data: {
              id: generateUuid(),
              createdBy: userId,
              updatedBy: userId,
              ...visibilityData
            }
          });

      await logAction({
        userId,
        action: "BANK_PINCODE_VISIBILITY_UPDATE",
        targetId: id,
        tenantId,
        metadata: { bankName: bank.bankName, pincode, locationName, targetType, targetIdentity, isActive }
      });

      res.json({
        success: true,
        message: `Bank ${isActive ? "enabled" : "disabled"} for pincode ${pincode}.`,
        data: visibility
      });
    } catch (err) {
      console.error("[WalletController] upsertBankPincodeVisibility Error:", err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
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

      // Check if there are any top-up requests using this bank
      const relatedRequests = await prisma.walletTopUpRequest.count({
        where: {
          bankDetailsId: id
        }
      });

      if (relatedRequests > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete bank details with existing top-up requests"
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
      const { getLocationData } = require("../utils/location");
      const loc = getLocationData(req);

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
            tenantId,
            // Add Location Data
            txnState: loc.state,
            txnCity: loc.city,
            txnPincode: loc.pincode,
            txnLat: loc.lat,
            txnLong: loc.long
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
          orderBy: { createdAt: "desc" },
          include: {
            wallet: {
              select: {
                id: true,
                balance: true,
                isCorporate: true,
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    identity: true,
                    mobile: true
                  }
                }
              }
            }
          }
        }),
        prisma.walletTransaction.count({ where })
      ]);

      const referenceIds = [...new Set(txns.map((txn) => txn.referenceId).filter(Boolean))];
      const logs = referenceIds.length
        ? await prisma.transactionLog.findMany({
            where: { id: { in: referenceIds } }
          })
        : [];
      const userIds = [...new Set([
        ...logs.flatMap((log) => [log.transactionDoneById, log.transactionDoneForId]),
        ...txns.flatMap(getLedgerMetadataUserIds)
      ].filter(Boolean))];
      const involvedUsers = userIds.length
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              fullName: true,
              identity: true,
              mobile: true
            }
          })
        : [];

      const logMap = buildLogMap(logs);
      const userMap = buildUserMap(involvedUsers);
      const enrichedTxns = enrichLedgerTransactions({
        transactions: txns,
        walletBalancesById: buildWalletBalanceMap([wallet]),
        logMap,
        userMap
      });

      const existingCreditReferenceIds = new Set(
        txns
          .filter((txn) => txn.type === 'CREDIT')
          .map((txn) => txn.referenceId)
          .filter(Boolean)
      );
      const missingRazorpayCreditRows = txns
        .filter((txn) => {
          if (type && type !== 'CREDIT') return false;
          const description = String(txn.description || '').toLowerCase();
          return (
            txn.type === 'DEBIT' &&
            txn.referenceId &&
            txn.category === 'SERVICE_CHARGE' &&
            (
              description.includes('membership') ||
              description.includes('saathi') ||
              description.includes('business')
            ) &&
            (
              description.includes('razorpay') ||
              description.includes('wallet') ||
              description.includes('cash')
            ) &&
            !existingCreditReferenceIds.has(txn.referenceId)
          );
        })
        .map((txn) => {
          const amount = Number(txn.amount || 0);
          const description = String(txn.description || '').toLowerCase();
          const serviceName = description.includes('saathi')
            ? 'Saathi Application'
            : (description.includes('business') ? 'Business Partner Application' : 'Member Application');
          const method = description.includes('cash')
            ? 'CASH'
            : (description.includes('wallet') ? 'WALLET' : 'RAZORPAY');
          return {
            id: `missing-credit-${txn.referenceId}`,
            walletId: wallet.id,
            amount,
            type: 'CREDIT',
            category: txn.category,
            status: txn.status || 'SUCCESS',
            referenceId: txn.referenceId,
            description: 'Membership payment received via RAZORPAY',
            tenantId,
            createdAt: txn.createdAt,
            transactionDateTime: txn.createdAt,
            transactionMethod: method,
            serviceName,
            subServiceName: `${serviceName} Fee`,
            tnxDoneBy: txn.wallet?.user?.fullName || 'N/A',
            roleForDoneBy: txn.wallet?.user?.identity || identity || 'MEMBER',
            tnxDoneFor: txn.wallet?.user?.fullName || 'N/A',
            roleForDoneFor: txn.wallet?.user?.identity || identity || 'MEMBER',
            walletBalance: 0,
            closingBalance: amount,
            userMobile: txn.wallet?.user?.mobile || 'N/A',
            metadata: {
              sourceType: 'SYNTHETIC_MISSING_CREDIT',
              referenceId: txn.referenceId
            }
          };
        });

      const [legacySaathiRows, legacyBusinessRows] = await Promise.all([
        prisma.saathiApplication.findMany({
          where: {
            userId,
            payment: { status: 'SUCCESS', amount: { gt: 0 } }
          },
          include: { payment: true, user: { select: { fullName: true, identity: true, mobile: true } } },
          orderBy: { updatedAt: "desc" }
        }),
        prisma.businessPartnerApplication.findMany({
          where: {
            userId,
            amount: { gt: 0 },
            OR: [
              { status: { in: ['PENDING', 'APPROVED'] } },
              { razorPayReferenceNo: { not: null } }
            ]
          },
          include: { user: { select: { fullName: true, identity: true, mobile: true } } },
          orderBy: { updatedAt: "desc" }
        })
      ]);

      const existingReferenceIds = new Set(txns.map((txn) => txn.referenceId).filter(Boolean));
      const buildLegacyFeeRows = ({ id, amount, method, label, user, timestamp }) => {
        if (existingReferenceIds.has(id)) return [];
        const feeAmount = Number(amount || 0);
        if (feeAmount <= 0) return [];
        const baseRow = {
          walletId: wallet.id,
          amount: feeAmount,
          category: 'SERVICE_CHARGE',
          status: 'SUCCESS',
          referenceId: id,
          transactionDateTime: timestamp,
          createdAt: timestamp,
          transactionMethod: method,
          serviceName: `${label} Application`,
          subServiceName: `${label} Application Fee`,
          tnxDoneBy: user?.fullName || 'N/A',
          roleForDoneBy: user?.identity || identity || 'N/A',
          tnxDoneFor: user?.fullName || 'N/A',
          roleForDoneFor: user?.identity || identity || 'N/A',
          userMobile: user?.mobile || 'N/A',
          metadata: {
            sourceType: 'LEGACY_APPLICATION',
            applicationId: id,
            paymentMethod: method
          }
        };

        return [
          {
            ...baseRow,
            id: `legacy-${id}-credit`,
            type: 'CREDIT',
            walletBalance: 0,
            closingBalance: feeAmount,
            description: `${label} payment received via ${method}`
          },
          {
            ...baseRow,
            id: `legacy-${id}-debit`,
            type: 'DEBIT',
            walletBalance: feeAmount,
            closingBalance: 0,
            description: `${label} Application Fee (Paid via ${method})`
          }
        ];
      };

      const legacyAppLedgerRows = [
        ...legacySaathiRows.flatMap((app) => buildLegacyFeeRows({
          id: app.id,
          amount: app.payment?.amount,
          method: app.payment?.method || app.paymentType || 'UNKNOWN',
          label: 'Saathi',
          user: app.user,
          timestamp: app.payment?.paidAt || app.updatedAt || app.createdAt
        })),
        ...legacyBusinessRows.flatMap((app) => {
          const methodMap = { 1: 'RAZORPAY', 2: 'WALLET', 3: 'CASH' };
          return buildLegacyFeeRows({
            id: app.id,
            amount: app.amount,
            method: methodMap[Number(app.paymentMode)] || 'UNKNOWN',
            label: 'Business Partner',
            user: app.user,
            timestamp: app.updatedAt || app.createdAt
          });
        })
      ];

      const applicationRows = await prisma.application.findMany({
        where: {
          tenantId,
          userId,
          paymentStatus: 'SUCCESS',
          OR: [
            { paymentAmount: { gt: 0 } },
            { paymentMethod: 'FREE' }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              identity: true,
              mobile: true
            }
          },
          creator: {
            select: {
              id: true,
              fullName: true,
              identity: true,
              mobile: true
            }
          }
        },
        orderBy: { updatedAt: "desc" }
      });

      const appLedgerRows = applicationRows
        .filter((app) => !existingReferenceIds.has(app.id))
        .flatMap((app) => {
          const amount = Number(app.paymentAmount || 0);
          const targetLabel = formatApplicationLedgerLabel(app.targetIdentity);
          const actor = app.creator || app.user;
          const timestamp = app.updatedAt || app.createdAt;
          const method = app.paymentMethod || 'RAZORPAY';
          const baseRow = {
            walletId: wallet.id,
            amount,
            category: 'SERVICE_CHARGE',
            status: 'SUCCESS',
            referenceId: app.id,
            transactionDateTime: timestamp,
            createdAt: timestamp,
            transactionMethod: method,
            serviceName: targetLabel,
            subServiceName: `${targetLabel} Fee`,
            tnxDoneBy: actor?.fullName || app.user?.fullName || 'N/A',
            roleForDoneBy: actor?.identity || app.user?.identity || identity || 'USER',
            tnxDoneFor: app.user?.fullName || 'N/A',
            roleForDoneFor: app.user?.identity || 'N/A',
            walletBalance: null,
            closingBalance: null,
            userMobile: app.user?.mobile || 'N/A',
            metadata: {
              sourceType: 'APPLICATION',
              targetIdentity: app.targetIdentity,
              paymentMethod: method,
              paymentStatus: app.paymentStatus,
              applicationId: app.id,
              createdById: app.createdById
            }
          };

          if (method === 'CASH' && amount > 0) {
            return [
              {
                ...baseRow,
                id: `app-${app.id}-cash-credit`,
                type: 'CREDIT',
                description: `${targetLabel} (${method}) - Cash Received`
              },
              {
                ...baseRow,
                id: `app-${app.id}-cash-debit`,
                type: 'DEBIT',
                description: `${targetLabel} (${method}) - Fee Paid`
              }
            ];
          }

          if (method === 'RAZORPAY' && amount > 0) {
            return [
              {
                ...baseRow,
                id: `app-${app.id}-razorpay-credit`,
                type: 'CREDIT',
                walletBalance: 0,
                closingBalance: amount,
                description: `${targetLabel} (${method}) - Payment Received`
              },
              {
                ...baseRow,
                id: `app-${app.id}-razorpay-debit`,
                type: 'DEBIT',
                walletBalance: amount,
                closingBalance: 0,
                description: `${targetLabel} (${method}) - Fee Paid`
              }
            ];
          }

          return {
            id: `app-${app.id}`,
            ...baseRow,
            type: 'DEBIT',
            description: `${targetLabel} (${method})`
          };
        });

      const combinedTxns = [...enrichedTxns, ...missingRazorpayCreditRows, ...legacyAppLedgerRows, ...appLedgerRows].sort(sortTransactionsDesc);
      const pageNumber = parseInt(page);
      const pageSize = parseInt(limit);
      const start = (pageNumber - 1) * pageSize;
      const pagedTxns = combinedTxns.slice(start, start + pageSize);

      res.json({
        success: true,
        data: pagedTxns,
        pagination: {
          page: pageNumber,
          limit: pageSize,
          total: total + missingRazorpayCreditRows.length + legacyAppLedgerRows.length + appLedgerRows.length,
          totalPages: Math.max(1, Math.ceil((total + missingRazorpayCreditRows.length + legacyAppLedgerRows.length + appLedgerRows.length) / pageSize))
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get ALL Wallet Transactions (Admin View)
   */
  getAllWalletTransactions: async (req, res) => {
    const { user_id: currentUserId, identity: adminIdentity, tenant_id: tenantId } = req.user;
    const { page = 1, limit = 20, type, category, userId, identity, search } = req.query;

    try {
      const andConditions = [{ tenantId }];

      // Search Logic
      if (search && search.trim() !== "") {
        const searchTerms = [
          { description: { contains: search, mode: 'insensitive' } },
          { referenceId: { contains: search, mode: 'insensitive' } },
          { 
            wallet: {
              user: {
                OR: [
                  { fullName: { contains: search, mode: 'insensitive' } },
                  { mobile: { contains: search, mode: 'insensitive' } }
                ]
              }
            }
          }
        ];

        const searchNum = parseFloat(search);
        if (!isNaN(searchNum)) {
          searchTerms.push({ amount: searchNum });
        }

        andConditions.push({ OR: searchTerms });
      }

      // Hierarchy Visibility
      const topRoles = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'];
      if (!topRoles.includes(adminIdentity)) {
        andConditions.push({
          wallet: {
            OR: [
              { userId: currentUserId },
              { user: { path: { contains: currentUserId } } },
              { isCorporate: true }
            ]
          }
        });
      }

      // Other Filters
      if (type && type !== 'ALL') andConditions.push({ type });
      if (category && category !== 'ALL') andConditions.push({ category });
      
      if (userId) {
        andConditions.push({ wallet: { userId } });
      }

      if (identity && identity !== 'ALL') {
        if (topRoles.includes(identity)) {
          andConditions.push({
            wallet: {
              OR: [
                { user: { identity: identity } },
                { isCorporate: true }
              ]
            }
          });
        } else {
          andConditions.push({
            wallet: {
              user: { identity: identity }
            }
          });
        }
      }

      const where = { AND: andConditions };

      const [txns, total] = await Promise.all([
        prisma.walletTransaction.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            wallet: {
              select: {
                id: true,
                balance: true,
                isCorporate: true,
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    mobile: true,
                    identity: true
                  }
                }
              }
            }
          }
        }),
        prisma.walletTransaction.count({ where })
      ]);

      const referenceIds = [...new Set(txns.map((txn) => txn.referenceId).filter(Boolean))];
      const walletIds = [...new Set(txns.map((txn) => txn.wallet?.id).filter(Boolean))];
      const logs = referenceIds.length
        ? await prisma.transactionLog.findMany({
            where: { id: { in: referenceIds } }
          })
        : [];
      const userIds = [...new Set([
        ...logs.flatMap((log) => [log.transactionDoneById, log.transactionDoneForId]),
        ...txns.flatMap(getLedgerMetadataUserIds)
      ].filter(Boolean))];
      const involvedUsers = userIds.length
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              fullName: true,
              mobile: true,
              identity: true
            }
          })
        : [];
      const wallets = walletIds.length
        ? await prisma.wallet.findMany({
            where: { id: { in: walletIds } },
            select: {
              id: true,
              balance: true
            }
          })
        : [];

      const logMap = buildLogMap(logs);
      const userMap = buildUserMap(involvedUsers);
      const walletBalanceMap = buildWalletBalanceMap(wallets.length > 0 ? wallets : txns.map((txn) => txn.wallet).filter(Boolean));
      const enrichedTxns = enrichLedgerTransactions({
        transactions: txns,
        walletBalancesById: walletBalanceMap,
        logMap,
        userMap
      });
      const pageNumber = parseInt(page);
      const pageSize = parseInt(limit);
      const start = (pageNumber - 1) * pageSize;
      const pagedTxns = enrichedTxns.slice(start, start + pageSize);

      res.json({
        success: true,
        data: pagedTxns,
        pagination: {
          page: pageNumber,
          limit: pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize))
        }
      });
    } catch (err) {
      console.error("Get All Wallet Transactions Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get Transaction Detail with linked service data
   */
  getTransactionDetail: async (req, res) => {
    const { id } = req.params;
    const { tenant_id: tenantId } = req.user;

    try {
      const txn = await prisma.walletTransaction.findFirst({
        where: { id, tenantId },
        include: {
          wallet: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  mobile: true,
                  identity: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!txn) {
        return res.status(404).json({ success: false, message: "Transaction not found" });
      }

      let serviceData = null;
      if (txn.referenceId) {
        try {
          if (txn.description?.toLowerCase().includes("prabhu")) {
            serviceData = await prisma.prabhuData.findUnique({ where: { id: txn.referenceId } });
          } else if (txn.description?.toLowerCase().includes("ime")) {
            serviceData = await prisma.imeTransaction.findUnique({ where: { id: txn.referenceId } });
          } else if (txn.category === 'MEMBERSHIP_FEE') {
            serviceData = await prisma.membershipApplication.findUnique({ where: { id: txn.referenceId } });
          } else if (txn.category === 'SAATHI_FEE') {
            serviceData = await prisma.saathiApplication.findUnique({ where: { id: txn.referenceId } });
          } else if (txn.category === 'BUSINESS_PARTNER_FEE') {
            serviceData = await prisma.businessApplication.findUnique({ where: { id: txn.referenceId } });
          } else if (txn.category === 'WALLET_TOPUP') {
             serviceData = await prisma.walletTopUpRequest.findUnique({ 
               where: { id: txn.referenceId },
               include: {
                 bankDetails: true
               }
             });
          }
        } catch (err) {
          console.warn("Error fetching linked service data:", err.message);
        }
      }

      res.json({
        success: true,
        data: {
          ...txn,
          serviceData,
          walletOwner: txn.wallet?.user?.fullName || (txn.wallet?.isCorporate ? "System Corporate" : "Unknown"),
          ownerIdentity: txn.wallet?.user?.identity || (txn.wallet?.isCorporate ? "ADMIN" : "N/A")
        }
      });
    } catch (err) {
      console.error("Get Transaction Detail Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = walletController;
