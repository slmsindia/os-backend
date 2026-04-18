const { PrismaClient } = require("@prisma/client");
const Razorpay = require("razorpay");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");
const crypto = require("crypto");

const prisma = new PrismaClient();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_key",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret",
});

const paymentController = {
  // ==================== CREATE PAYMENT ORDER ====================

  // Create order for wallet top-up
  createWalletTopupOrder: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { amount } = req.body;

    if (!amount || amount < 100 || amount > 100000) {
      return res.status(400).json({
        success: false,
        message: "Amount must be between ₹100 and ₹100,000",
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      // Create Razorpay order
      const orderOptions = {
        amount: amount * 100, // Razorpay expects amount in paise
        currency: "INR",
        receipt: `wallet_${userId}_${Date.now()}`,
        notes: {
          userId,
          type: "WALLET_TOPUP",
          tenantId,
        },
      };

      const razorpayOrder = await razorpay.orders.create(orderOptions);

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          id: generateUuid(),
          userId,
          type: "WALLET_TOPUP",
          amount,
          currency: "INR",
          gateway: "RAZORPAY",
          gatewayOrderId: razorpayOrder.id,
          status: "PENDING",
          metadata: {
            razorpayOrderId: razorpayOrder.id,
            receipt: orderOptions.receipt,
          },
        },
      });

      await logAction({
        userId,
        action: "RAZORPAY_ORDER_CREATED",
        tenantId,
        metadata: { amount, orderId: razorpayOrder.id },
      });

      return res.json({
        success: true,
        message: "Payment order created",
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID || "rzp_test_key",
          name: "Online Saathi",
          description: "Wallet Top-up",
          prefill: {
            name: user.fullName,
            contact: user.mobile,
          },
          paymentId: payment.id,
        },
      });
    } catch (err) {
      console.error("Razorpay order creation error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to create payment order",
        error: err.message,
      });
    }
  },

  // Create order for membership upgrade
  createMembershipOrder: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { planName = "PREMIUM" } = req.body;

    try {
      // Get pricing
      const pricing = await prisma.pricingSetting.findFirst({
        where: {
          tenantId,
          key: "MEMBER_UPGRADE",
          isActive: true,
        },
      });

      const amount = pricing?.amount || 999;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      // Create Razorpay order
      const orderOptions = {
        amount: amount * 100,
        currency: "INR",
        receipt: `member_${userId}_${Date.now()}`,
        notes: {
          userId,
          type: "MEMBER_UPGRADE",
          planName,
          tenantId,
        },
      };

      const razorpayOrder = await razorpay.orders.create(orderOptions);

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          id: generateUuid(),
          userId,
          type: "MEMBER_UPGRADE",
          amount,
          currency: "INR",
          gateway: "RAZORPAY",
          gatewayOrderId: razorpayOrder.id,
          status: "PENDING",
          metadata: {
            planName,
            razorpayOrderId: razorpayOrder.id,
          },
        },
      });

      return res.json({
        success: true,
        message: "Membership payment order created",
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID || "rzp_test_key",
          name: "Online Saathi",
          description: `${planName} Membership`,
          prefill: {
            name: user.fullName,
            contact: user.mobile,
          },
          paymentId: payment.id,
        },
      });
    } catch (err) {
      console.error("Razorpay order creation error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to create payment order",
        error: err.message,
      });
    }
  },

  // ==================== VERIFY & PROCESS PAYMENT ====================

  // Verify Razorpay payment
  verifyPayment: async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification parameters",
      });
    }

    try {
      // Verify signature
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret")
        .update(body.toString())
        .digest("hex");

      const isAuthentic = expectedSignature === razorpay_signature;

      if (!isAuthentic) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment signature",
        });
      }

      // Find payment record
      const payment = await prisma.payment.findFirst({
        where: {
          gatewayOrderId: razorpay_order_id,
          status: "PENDING",
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found",
        });
      }

      // Update payment record
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          gatewayPaymentId: razorpay_payment_id,
          metadata: {
            ...payment.metadata,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            verifiedAt: new Date(),
          },
        },
      });

      // Process based on payment type
      let result;
      switch (payment.type) {
        case "WALLET_TOPUP":
          result = await processWalletTopup(payment);
          break;
        case "MEMBER_UPGRADE":
          result = await processMembershipUpgrade(payment);
          break;
        default:
          result = { success: true, message: "Payment verified" };
      }

      await logAction({
        userId: payment.userId,
        action: "PAYMENT_VERIFIED",
        targetId: payment.id,
        metadata: {
          type: payment.type,
          amount: payment.amount,
          razorpayPaymentId,
        },
      });

      return res.json({
        success: true,
        message: "Payment verified successfully",
        ...result,
      });
    } catch (err) {
      console.error("Payment verification error:", err);
      return res.status(500).json({
        success: false,
        message: "Payment verification failed",
        error: err.message,
      });
    }
  },

  // ==================== WEBHOOK ====================

  // Razorpay webhook handler
  webhook: async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!secret || !signature) {
      return res.status(400).json({ message: "Missing webhook signature" });
    }

    try {
      // Verify webhook signature
      const body = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");

      if (signature !== expectedSignature) {
        return res.status(400).json({ message: "Invalid webhook signature" });
      }

      const event = req.body;

      // Handle payment captured event
      if (event.event === "payment.captured") {
        const paymentData = event.payload.payment.entity;

        const payment = await prisma.payment.findFirst({
          where: {
            gatewayOrderId: paymentData.order_id,
            status: "PENDING",
          },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "COMPLETED",
              gatewayPaymentId: paymentData.id,
            },
          });

          // Process based on type
          if (payment.type === "WALLET_TOPUP") {
            await processWalletTopup(payment);
          } else if (payment.type === "MEMBER_UPGRADE") {
            await processMembershipUpgrade(payment);
          }
        }
      }

      return res.json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).json({ message: "Webhook processing failed" });
    }
  },

  // ==================== ADMIN: Payment Management ====================

  // Get all payments
  getAllPayments: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { status, type, page = 1, limit = 20 } = req.query;

    try {
      const where = {
        user: { tenantId },
        status: status || undefined,
        type: type || undefined,
      };

      Object.keys(where).forEach((key) => {
        if (where[key] === undefined) delete where[key];
      });

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            user: {
              select: {
                fullName: true,
                mobile: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit),
        }),
        prisma.payment.count({ where }),
      ]);

      return res.json({
        success: true,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        payments,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get payment stats
  getPaymentStats: async (req, res) => {
    const { tenant_id: tenantId } = req.user;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalPayments,
        completedPayments,
        pendingPayments,
        failedPayments,
        totalRevenue,
        todayRevenue,
      ] = await Promise.all([
        prisma.payment.count({
          where: { user: { tenantId } },
        }),
        prisma.payment.count({
          where: { user: { tenantId }, status: "COMPLETED" },
        }),
        prisma.payment.count({
          where: { user: { tenantId }, status: "PENDING" },
        }),
        prisma.payment.count({
          where: { user: { tenantId }, status: "FAILED" },
        }),
        prisma.payment.aggregate({
          where: {
            user: { tenantId },
            status: "COMPLETED",
          },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            user: { tenantId },
            status: "COMPLETED",
            createdAt: { gte: today },
          },
          _sum: { amount: true },
        }),
      ]);

      return res.json({
        success: true,
        stats: {
          totalPayments,
          completedPayments,
          pendingPayments,
          failedPayments,
          totalRevenue: totalRevenue._sum.amount || 0,
          todayRevenue: todayRevenue._sum.amount || 0,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};

// Helper: Process wallet top-up
async function processWalletTopup(payment) {
  // Get or create wallet
  const wallet = await prisma.wallet.upsert({
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
  await prisma.walletTransaction.create({
    data: {
      id: generateUuid(),
      userId: payment.userId,
      amount: payment.amount,
      type: "CREDIT",
      meta: {
        reason: "WALLET_TOPUP",
        paymentId: payment.id,
        gateway: "RAZORPAY",
      },
    },
  });

  return {
    type: "WALLET_TOPUP",
    message: `₹${payment.amount} added to your wallet`,
    walletBalance: wallet.balance,
  };
}

// Helper: Process membership upgrade
async function processMembershipUpgrade(payment) {
  const planName = payment.metadata?.planName || "PREMIUM";
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const membership = await prisma.member.upsert({
    where: { userId: payment.userId },
    update: {
      status: "ACTIVE",
      planName,
      startedAt: new Date(),
      expiresAt,
      paymentId: payment.id,
      amount: payment.amount,
      benefitsUsed: {},
    },
    create: {
      id: generateUuid(),
      userId: payment.userId,
      status: "ACTIVE",
      planName,
      startedAt: new Date(),
      expiresAt,
      paymentId: payment.id,
      amount: payment.amount,
      benefitsUsed: {},
      autoRenew: false,
    },
  });

  return {
    type: "MEMBER_UPGRADE",
    message: `You are now a ${planName} member!`,
    membership,
  };
}

module.exports = paymentController;
