const { PrismaClient } = require("@prisma/client");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const prisma = new PrismaClient();

// Pending transaction types
const PENDING_TYPES = ["MANUAL_TOPUP", "BANK_TRANSFER", "CASH_DEPOSIT"];

const walletController = {
  // ==================== USER: Wallet Management ====================

  // Get my wallet
  getMyWallet: async (req, res) => {
    const { user_id: userId } = req.user;

    try {
      const wallet = await prisma.wallet.findUnique({
        where: { userId },
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!wallet) {
        return res.json({
          success: true,
          wallet: {
            balance: 0,
            transactions: [],
          },
        });
      }

      return res.json({
        success: true,
        wallet,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get wallet transactions
  getTransactions: async (req, res) => {
    const { user_id: userId } = req.user;
    const { page = 1, limit = 20 } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [transactions, total] = await Promise.all([
        prisma.walletTransaction.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit),
        }),
        prisma.walletTransaction.count({ where: { userId } }),
      ]);

      return res.json({
        success: true,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        transactions,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Request wallet top-up (creates pending transaction)
  requestTopup: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { amount, method = "MANUAL", reference, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const minAmount = 100;
    const maxAmount = 100000;

    if (amount < minAmount || amount > maxAmount) {
      return res.status(400).json({
        success: false,
        message: `Amount must be between ₹${minAmount} and ₹${maxAmount}`,
      });
    }

    try {
      // Create pending payment record
      const payment = await prisma.payment.create({
        data: {
          id: generateUuid(),
          userId,
          type: "WALLET_TOPUP",
          amount,
          currency: "INR",
          gateway: method,
          status: "PENDING",
          metadata: {
            reference,
            notes,
            requestedAt: new Date(),
          },
        },
      });

      await logAction({
        userId,
        action: "WALLET_TOPUP_REQUESTED",
        tenantId,
        metadata: { amount, method, paymentId: payment.id },
      });

      return res.json({
        success: true,
        message: "Top-up request submitted. Awaiting admin approval.",
        payment,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get my pending top-up requests
  getPendingRequests: async (req, res) => {
    const { user_id: userId } = req.user;

    try {
      const pendingPayments = await prisma.payment.findMany({
        where: {
          userId,
          type: "WALLET_TOPUP",
          status: "PENDING",
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        success: true,
        count: pendingPayments.length,
        requests: pendingPayments,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ==================== ADMIN: Wallet Management ====================

  // Get all pending top-up requests
  getPendingTopups: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { page = 1, limit = 20 } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where: {
            user: { tenantId },
            type: "WALLET_TOPUP",
            status: "PENDING",
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                mobile: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit),
        }),
        prisma.payment.count({
          where: {
            user: { tenantId },
            type: "WALLET_TOPUP",
            status: "PENDING",
          },
        }),
      ]);

      return res.json({
        success: true,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        requests: payments,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Approve or reject top-up request
  approveTopup: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId } = req.user;
    const { id } = req.params;
    const { approve, rejectionReason } = req.body;

    try {
      // Get the pending payment
      const payment = await prisma.payment.findFirst({
        where: {
          id,
          type: "WALLET_TOPUP",
          status: "PENDING",
        },
        include: {
          user: true,
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment request not found or already processed",
        });
      }

      if (approve) {
        // Approve: Add money to wallet
        await prisma.$transaction(async (tx) => {
          // Update payment status
          await tx.payment.update({
            where: { id },
            data: {
              status: "COMPLETED",
              approvedBy: adminId,
              approvedAt: new Date(),
            },
          });

          // Get or create wallet
          const wallet = await tx.wallet.upsert({
            where: { userId: payment.userId },
            update: {
              balance: { increment: payment.amount },
            },
            create: {
              id: generateUuid(),
              userId: payment.userId,
              balance: payment.amount,
            },
          });

          // Create wallet transaction
          await tx.walletTransaction.create({
            data: {
              id: generateUuid(),
              userId: payment.userId,
              amount: payment.amount,
              type: "CREDIT",
              meta: {
                reason: "WALLET_TOPUP",
                paymentId: payment.id,
                approvedBy: adminId,
              },
            },
          });
        });

        await logAction({
          userId: adminId,
          action: "WALLET_TOPUP_APPROVED",
          targetId: payment.userId,
          tenantId,
          metadata: { amount: payment.amount, paymentId: id },
        });

        return res.json({
          success: true,
          message: `₹${payment.amount} added to ${payment.user.fullName}'s wallet`,
        });
      } else {
        // Reject: Update payment status
        await prisma.payment.update({
          where: { id },
          data: {
            status: "FAILED",
            approvedBy: adminId,
            approvedAt: new Date(),
            metadata: {
              ...payment.metadata,
              rejectionReason: rejectionReason || "Rejected by admin",
            },
          },
        });

        await logAction({
          userId: adminId,
          action: "WALLET_TOPUP_REJECTED",
          targetId: payment.userId,
          tenantId,
          metadata: { amount: payment.amount, reason: rejectionReason },
        });

        return res.json({
          success: true,
          message: "Top-up request rejected",
        });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Direct add money to wallet (admin only)
  addMoney: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId } = req.user;
    const { userId, amount, reason } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "User ID and valid amount are required",
      });
    }

    try {
      // Check if user exists
      const user = await prisma.user.findFirst({
        where: { id: userId, tenantId },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          id: generateUuid(),
          userId,
          type: "WALLET_TOPUP",
          amount,
          currency: "INR",
          gateway: "MANUAL",
          status: "COMPLETED",
          approvedBy: adminId,
          approvedAt: new Date(),
          metadata: {
            reason: reason || "Admin credit",
            autoApproved: true,
          },
        },
      });

      // Get or create wallet and add money
      const wallet = await prisma.wallet.upsert({
        where: { userId },
        update: {
          balance: { increment: amount },
        },
        create: {
          id: generateUuid(),
          userId,
          balance: amount,
        },
      });

      // Create wallet transaction
      await prisma.walletTransaction.create({
        data: {
          id: generateUuid(),
          userId,
          amount,
          type: "CREDIT",
          meta: {
            reason: reason || "Admin credit",
            paymentId: payment.id,
            addedBy: adminId,
          },
        },
      });

      await logAction({
        userId: adminId,
        action: "WALLET_MONEY_ADDED",
        targetId: userId,
        tenantId,
        metadata: { amount, reason },
      });

      return res.json({
        success: true,
        message: `₹${amount} added to ${user.fullName}'s wallet`,
        wallet: {
          userId,
          balance: wallet.balance,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Deduct money from wallet (admin only)
  deductMoney: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId } = req.user;
    const { userId, amount, reason } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "User ID and valid amount are required",
      });
    }

    try {
      const user = await prisma.user.findFirst({
        where: { id: userId, tenantId },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const wallet = await prisma.wallet.findUnique({
        where: { userId },
      });

      if (!wallet || wallet.balance < amount) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance",
          currentBalance: wallet?.balance || 0,
        });
      }

      // Deduct from wallet
      await prisma.wallet.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      });

      // Create wallet transaction
      await prisma.walletTransaction.create({
        data: {
          id: generateUuid(),
          userId,
          amount: -amount,
          type: "DEBIT",
          meta: {
            reason: reason || "Admin deduction",
            deductedBy: adminId,
            tenantId,
          },
        },
      });

      await logAction({
        userId: adminId,
        action: "WALLET_MONEY_DEDUCTED",
        targetId: userId,
        tenantId,
        metadata: { amount, reason },
      });

      return res.json({
        success: true,
        message: `₹${amount} deducted from ${user.fullName}'s wallet`,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get all wallets (admin)
  getAllWallets: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { page = 1, limit = 20 } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [wallets, total] = await Promise.all([
        prisma.wallet.findMany({
          where: {
            user: { tenantId },
          },
          include: {
            user: {
              select: {
                fullName: true,
                mobile: true,
              },
            },
            _count: {
              select: { transactions: true },
            },
          },
          orderBy: { balance: "desc" },
          skip,
          take: parseInt(limit),
        }),
        prisma.wallet.count({
          where: {
            user: { tenantId },
          },
        }),
      ]);

      return res.json({
        success: true,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        wallets,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get wallet stats (admin)
  getWalletStats: async (req, res) => {
    const { tenant_id: tenantId } = req.user;

    try {
      const [
        totalWallets,
        totalBalance,
        pendingTopups,
        pendingAmount,
        todayTransactions,
      ] = await Promise.all([
        prisma.wallet.count({
          where: { user: { tenantId } },
        }),
        prisma.wallet.aggregate({
          where: { user: { tenantId } },
          _sum: { balance: true },
        }),
        prisma.payment.count({
          where: {
            user: { tenantId },
            type: "WALLET_TOPUP",
            status: "PENDING",
          },
        }),
        prisma.payment.aggregate({
          where: {
            user: { tenantId },
            type: "WALLET_TOPUP",
            status: "PENDING",
          },
          _sum: { amount: true },
        }),
        prisma.walletTransaction.count({
          where: {
            user: { tenantId },
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
      ]);

      return res.json({
        success: true,
        stats: {
          totalWallets,
          totalBalance: totalBalance._sum.balance || 0,
          pendingTopups,
          pendingAmount: pendingAmount._sum.amount || 0,
          todayTransactions,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};

module.exports = walletController;
