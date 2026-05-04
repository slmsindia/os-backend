const prisma = require("../lib/prisma");

const createWalletError = (code, message, meta = {}) => {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, meta);
  return error;
};

const normalizeAmount = (amount) => {
  const parsed = Number.parseFloat(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createWalletError("INVALID_AMOUNT", "Transfer amount must be greater than 0");
  }

  return parsed;
};

const walletService = {
  /**
   * Create a new wallet
   * @param {string} userId - User ID (null for corporate)
   * @param {string} tenantId - Tenant ID
   * @param {boolean} isCorporate - Whether this is a shared corporate wallet
   * @returns {Promise<Object>} Created wallet
   */
  createWallet: async (userId, tenantId, isCorporate = false) => {
    try {
      const wallet = await prisma.wallet.create({
        data: {
          userId,
          tenantId,
          isCorporate,
          balance: 0.0,
          currency: "INR",
          isActive: true
        }
      });
      return wallet;
    } catch (err) {
      console.error("Error creating wallet:", err);
      throw err;
    }
  },

  /**
   * Resolve the correct wallet for a user based on their identity
   * @param {string} userId - Current user ID
   * @param {string} tenantId - Current tenant ID
   * @param {string} identity - Current user identity
   * @returns {Promise<Object|null>} The wallet to be used
   */
  resolveWallet: async (userId, tenantId, identity) => {
    try {
      // Shared Corporate Wallet logic
      if (['WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(identity)) {
        console.log(`[WalletService] Resolving corporate wallet for tenant: ${tenantId}`);
        let corporateWallet = await prisma.wallet.findFirst({
          where: { 
            tenantId,
            isCorporate: true
          }
        });

        // Auto-create corporate wallet if it doesn't exist for the tenant
        if (!corporateWallet) {
          corporateWallet = await walletService.createWallet(null, tenantId, true);
        }
        
        return corporateWallet;
      }

      // Individual Wallet logic
      if (identity === 'USER') return null; // Users have no wallet

      return await prisma.wallet.findUnique({
        where: { userId }
      });
    } catch (err) {
      console.error("Error resolving wallet:", err);
      throw err;
    }
  },

  /**
   * Get wallet by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Wallet object or null
   */
  getWalletByUserId: async (userId) => {
    try {
      const wallet = await prisma.wallet.findUnique({
        where: { userId },
        include: {
          topUpRequests: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              bankDetails: {
                select: {
                  id: true,
                  bankName: true,
                  accountNumber: true
                }
              }
            }
          }
        }
      });
      return wallet;
    } catch (err) {
      console.error("Error getting wallet:", err);
      throw err;
    }
  },

  /**
   * Update wallet balance
   * @param {string} walletId - Wallet ID
   * @param {number} amount - Amount to add (can be negative for deduction)
   * @returns {Promise<Object>} Updated wallet
   */
  updateBalance: async (walletId, amount) => {
    try {
      const wallet = await prisma.wallet.update({
        where: { id: walletId },
        data: {
          balance: {
            increment: amount
          }
        }
      });
      return wallet;
    } catch (err) {
      console.error("Error updating wallet balance:", err);
      throw err;
    }
  },

  /**
   * Pay Creation Fee and Record History
   * @param {string} partnerWalletId - Partner's wallet ID
   * @param {string} adminWalletId - Admin's wallet ID
   * @param {number} amount - Fee amount
   * @param {string} description - Transaction description
   * @param {string} referenceId - Associated application ID
   * @param {string} tenantId - Tenant ID
   * @param {string} paymentMethod - WALLET, RAZORPAY, CASH
   * @param {object} tx - Prisma transaction object
   */
  payCreationFeeWithHistory: async (partnerWalletId, adminWalletId, amount, description, referenceId, tenantId, paymentMethod, tx) => {
    const db = tx || prisma;
    
    // 1. Partner Log (Deduct only if WALLET)
    if (partnerWalletId) {
      if (paymentMethod === 'WALLET') {
        await db.wallet.update({
          where: { id: partnerWalletId },
          data: { balance: { decrement: amount } }
        });
      }
      
      await db.walletTransaction.create({
        data: {
          walletId: partnerWalletId,
          amount: amount,
          type: "DEBIT",
          category: "SERVICE_CHARGE",
          description: `${description} (Fee Paid via ${paymentMethod})`,
          referenceId: referenceId,
          tenantId: tenantId
        }
      });
    }

    // 2. Credit to Admin (Always increment balance)
    if (adminWalletId) {
      await db.wallet.update({
        where: { id: adminWalletId },
        data: { balance: { increment: amount } }
      });
      await db.walletTransaction.create({
        data: {
          walletId: adminWalletId,
          amount: amount,
          type: "CREDIT",
          category: "COMMISSION",
          description: `${description} (Fee Received via ${paymentMethod})`,
          referenceId: referenceId,
          tenantId: tenantId
        }
      });
    }
  },

  /**
   * Ensure a user wallet exists and has sufficient balance
   * @param {string} userId - Current user ID
   * @param {number|string} amount - Amount to validate
   * @param {string} tenantId - Tenant ID
   * @param {string} identity - User identity
   * @returns {Promise<Object>} Wallet object
   */
  ensureSufficientBalance: async (userId, amount, tenantId, identity) => {
    try {
      const requiredAmount = normalizeAmount(amount);
      const wallet = await walletService.resolveWallet(userId, tenantId, identity);

      if (!wallet) {
        throw createWalletError("WALLET_NOT_FOUND", "Wallet not found for this user");
      }

      if (!wallet.isActive) {
        throw createWalletError("WALLET_INACTIVE", "Wallet is inactive. Please contact admin.");
      }

      if (wallet.balance < requiredAmount) {
        throw createWalletError(
          "INSUFFICIENT_BALANCE",
          `Insufficient wallet balance. Available: ₹${wallet.balance.toFixed(2)}, required: ₹${requiredAmount.toFixed(2)}`,
          {
            availableBalance: wallet.balance,
            requiredAmount
          }
        );
      }

      return wallet;
    } catch (err) {
      console.error("Error checking wallet balance:", err);
      throw err;
    }
  },

  /**
   * Atomically deduct balance from a user's wallet (Shared or Individual)
   * @param {string} userId - Current user ID
   * @param {number|string} amount - Amount to deduct
   * @param {string} tenantId - Tenant ID
   * @param {string} identity - User identity
   * @returns {Promise<Object>} Updated wallet
   */
  deductBalanceIfSufficient: async (userId, amount, tenantId, identity, creditWalletId = null, description = null, referenceId = null, txnLoc = {}) => {
    const requiredAmount = normalizeAmount(amount);

    try {
      // Resolve the correct wallet first
      const wallet = await walletService.resolveWallet(userId, tenantId, identity);
      if (!wallet) {
        throw createWalletError("WALLET_NOT_FOUND", "Wallet not found for this user");
      }

      return await prisma.$transaction(async (tx) => {
        // Re-fetch inside transaction for locking
        const currentWallet = await tx.wallet.findUnique({
          where: { id: wallet.id }
        });

        if (!currentWallet) {
          throw createWalletError("WALLET_NOT_FOUND", "Wallet not found for this user");
        }

        if (!currentWallet.isActive) {
          throw createWalletError("WALLET_INACTIVE", "Wallet is inactive. Please contact admin.");
        }

        const result = await tx.wallet.updateMany({
          where: {
            id: wallet.id,
            isActive: true,
            balance: {
              gte: requiredAmount
            }
          },
          data: {
            balance: {
              decrement: requiredAmount
            }
          }
        });

        if (result.count === 0) {
          const latestWallet = await tx.wallet.findUnique({
            where: { id: wallet.id }
          });

          throw createWalletError(
            "INSUFFICIENT_BALANCE",
            `Insufficient wallet balance. Available: ₹${(latestWallet?.balance || 0).toFixed(2)}, required: ₹${requiredAmount.toFixed(2)}`,
            {
              availableBalance: latestWallet?.balance || 0,
              requiredAmount
            }
          );
        }

        const deductionResult = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: requiredAmount,
            type: "DEBIT",
            category: "SERVICE_CHARGE",
            description: description || "Wallet deduction",
            referenceId: referenceId,
            tenantId: tenantId,
            // Location Data
            txnState: txnLoc.state,
            txnCity: txnLoc.city,
            txnPincode: txnLoc.pincode,
            txnLat: txnLoc.lat,
            txnLong: txnLoc.long
          }
        });

        // Optional: Credit another wallet (e.g., Admin) in the same transaction
        if (creditWalletId) {
          await tx.wallet.update({
            where: { id: creditWalletId },
            data: {
              balance: {
                increment: requiredAmount
              }
            }
          });
          
          await tx.walletTransaction.create({
            data: {
              walletId: creditWalletId,
              amount: requiredAmount,
              type: "CREDIT",
              category: "COMMISSION",
              description: description ? description.replace("deduction", "credit") : "Wallet credit",
              referenceId: referenceId,
              tenantId: tenantId,
              // Location Data (Same as deduction)
              txnState: txnLoc.state,
              txnCity: txnLoc.city,
              txnPincode: txnLoc.pincode,
              txnLat: txnLoc.lat,
              txnLong: txnLoc.long
            }
          });
        }

        return tx.wallet.findUnique({
          where: { id: wallet.id }
        });
      });
    } catch (err) {
      console.error("Error deducting wallet balance:", err);
      throw err;
    }
  },

  /**
   * Check if UTR number already exists in approved requests
   * @param {string} utrNumber - UTR number to check
   * @returns {Promise<boolean>} True if UTR exists in approved requests
   */
  checkUtrExists: async (utrNumber) => {
    try {
      const existingRequest = await prisma.walletTopUpRequest.findFirst({
        where: {
          utrNumber,
          status: "APPROVED"
        }
      });
      return !!existingRequest;
    } catch (err) {
      console.error("Error checking UTR:", err);
      throw err;
    }
  },

  /**
   * Get wallet by ID
   * @param {string} walletId - Wallet ID
   * @returns {Promise<Object|null>} Wallet object or null
   */
  getWalletById: async (walletId) => {
    try {
      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId }
      });
      return wallet;
    } catch (err) {
      console.error("Error getting wallet by ID:", err);
      throw err;
    }
  },
  /**
   * Automatically process commission for services like IME/Prabhu
   */
  processServiceCommission: async (serviceType, tenantId, referenceId, userId, tx) => {
    const db = tx || prisma;
    const commissionService = require("./commission.service");

    try {
      // 1. Get Active Fee Config (most recent effective one)
      const config = await db.serviceFeeConfig.findFirst({
        where: {
          serviceType,
          tenantId,
          effectiveFrom: { lte: new Date() }
        },
        orderBy: { effectiveFrom: 'desc' }
      });

      if (!config || config.amount <= 0) return null;

      // 2. Find Admin Wallet for this tenant
      let adminWallet = await db.wallet.findFirst({
        where: { tenantId, isCorporate: true }
      });

      if (!adminWallet) {
        const adminUser = await db.user.findFirst({
          where: { tenantId, identity: { in: ['WHITE_LABEL_ADMIN', 'ADMIN'] } },
          orderBy: { createdAt: 'asc' }
        });
        if (adminUser) {
          adminWallet = await db.wallet.findUnique({ where: { userId: adminUser.id } });
        }
      }

      if (!adminWallet) {
        console.error(`[WalletService] No Admin wallet found for tenant ${tenantId}`);
        return null;
      }

      // 3. Credit Admin Wallet & Log
      await db.wallet.update({
        where: { id: adminWallet.id },
        data: { balance: { increment: config.amount } }
      });

      await db.walletTransaction.create({
        data: {
          walletId: adminWallet.id,
          amount: config.amount,
          type: "CREDIT",
          category: "COMMISSION",
          description: `${serviceType} Transaction Commission Received`,
          referenceId: referenceId,
          tenantId: tenantId
        }
      });

      // 4. Trigger Cascading Commission (CH -> SP -> DP)
      // Slug format: ime-transfer, prabhu-transfer
      const slug = `${serviceType.toLowerCase()}-transfer`;
      const subService = await db.commissionSubService.findUnique({
        where: { slug }
      });

      if (subService && userId) {
        console.log(`[WalletService] Triggering cascading commission for ${serviceType} (slug: ${slug})`);
        const commissionDesc = `${serviceType} Transfer Commission (Ref: ${referenceId})`;
        await commissionService.processCommission(config.amount, subService.id, userId, commissionDesc, db);
      } else {
        console.log(`[WalletService] Cascading commission skipped: subService not found for slug ${slug} or userId missing`);
      }

      return true;
    } catch (error) {
      console.error(`[WalletService] Error processing ${serviceType} commission:`, error);
      return null;
    }
  }
};

module.exports = walletService;
