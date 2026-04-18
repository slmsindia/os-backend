const { PrismaClient } = require("@prisma/client");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const prisma = new PrismaClient();

// Member benefits configuration
const MEMBER_BENEFITS = {
  PREMIUM: {
    name: "Premium",
    jobApplicationsPerMonth: 10,
    schemeBookingsPerMonth: 5,
    prioritySupport: true,
    featuredProfile: true,
    resumeBuilder: true,
  },
  GOLD: {
    name: "Gold",
    jobApplicationsPerMonth: 25,
    schemeBookingsPerMonth: 15,
    prioritySupport: true,
    featuredProfile: true,
    resumeBuilder: true,
    directRecruiterContact: true,
  },
  PLATINUM: {
    name: "Platinum",
    jobApplicationsPerMonth: 50,
    schemeBookingsPerMonth: 30,
    prioritySupport: true,
    featuredProfile: true,
    resumeBuilder: true,
    directRecruiterContact: true,
    dedicatedAccountManager: true,
  },
};

const memberController = {
  // Get membership plans and pricing
  getPlans: async (req, res) => {
    const { tenant_id: tenantId } = req.user || {};

    try {
      // Get pricing from admin settings
      const pricingSettings = await prisma.pricingSetting.findMany({
        where: {
          tenantId,
          key: "MEMBER_UPGRADE",
          isActive: true,
        },
      });

      const plans = [
        {
          id: "PREMIUM",
          name: "Premium",
          price: pricingSettings.find((p) => p.key === "MEMBER_UPGRADE")?.amount || 999,
          duration: "1 year",
          benefits: MEMBER_BENEFITS.PREMIUM,
        },
        {
          id: "GOLD",
          name: "Gold",
          price: 1999,
          duration: "1 year",
          benefits: MEMBER_BENEFITS.GOLD,
        },
        {
          id: "PLATINUM",
          name: "Platinum",
          price: 4999,
          duration: "1 year",
          benefits: MEMBER_BENEFITS.PLATINUM,
        },
      ];

      return res.json({
        success: true,
        plans,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get my membership status
  getMyMembership: async (req, res) => {
    const { user_id: userId } = req.user;

    try {
      const membership = await prisma.member.findUnique({
        where: { userId },
      });

      if (!membership) {
        return res.json({
          success: true,
          isMember: false,
          message: "You are not a member yet. Upgrade to access premium benefits!",
        });
      }

      // Check if expired
      const isExpired = new Date() > new Date(membership.expiresAt);
      if (isExpired && membership.status === "ACTIVE") {
        await prisma.member.update({
          where: { userId },
          data: { status: "EXPIRED" },
        });
        membership.status = "EXPIRED";
      }

      const benefits = MEMBER_BENEFITS[membership.planName] || MEMBER_BENEFITS.PREMIUM;
      const benefitsUsed = membership.benefitsUsed || {};

      return res.json({
        success: true,
        isMember: membership.status === "ACTIVE",
        membership: {
          ...membership,
          benefits,
          benefitsUsed,
          benefitsRemaining: {
            jobApplications: benefits.jobApplicationsPerMonth - (benefitsUsed.jobApplications || 0),
            schemeBookings: benefits.schemeBookingsPerMonth - (benefitsUsed.schemeBookings || 0),
          },
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Upgrade to member (initiate payment)
  upgradeToMember: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { planName = "PREMIUM", paymentMethod = "WALLET" } = req.body;

    try {
      // Check if already an active member
      const existingMembership = await prisma.member.findUnique({
        where: { userId },
      });

      if (existingMembership && existingMembership.status === "ACTIVE") {
        return res.status(400).json({
          success: false,
          message: "You are already an active member",
          membership: existingMembership,
        });
      }

      // Get pricing
      const pricing = await prisma.pricingSetting.findFirst({
        where: {
          tenantId,
          key: "MEMBER_UPGRADE",
          isActive: true,
        },
      });

      const amount = pricing?.amount || 999;

      // Handle payment based on method
      if (paymentMethod === "WALLET") {
        // Check wallet balance
        const wallet = await prisma.wallet.findUnique({
          where: { userId },
        });

        if (!wallet || wallet.balance < amount) {
          return res.status(400).json({
            success: false,
            message: "Insufficient wallet balance. Please add money to your wallet.",
            required: amount,
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
            meta: { reason: "MEMBER_UPGRADE", planName },
          },
        });
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          id: generateUuid(),
          userId,
          type: "MEMBER_UPGRADE",
          amount,
          currency: "INR",
          gateway: paymentMethod,
          status: "COMPLETED",
          metadata: { planName },
        },
      });

      // Create or update membership
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const membership = await prisma.member.upsert({
        where: { userId },
        update: {
          status: "ACTIVE",
          planName,
          startedAt: new Date(),
          expiresAt,
          paymentId: payment.id,
          amount,
          benefitsUsed: {},
          autoRenew: false,
        },
        create: {
          id: generateUuid(),
          userId,
          status: "ACTIVE",
          planName,
          startedAt: new Date(),
          expiresAt,
          paymentId: payment.id,
          amount,
          benefitsUsed: {},
          autoRenew: false,
        },
      });

      await logAction({
        userId,
        action: "MEMBER_UPGRADED",
        tenantId,
        metadata: { planName, amount, paymentMethod },
      });

      return res.json({
        success: true,
        message: `Congratulations! You are now a ${planName} member`,
        membership: {
          ...membership,
          benefits: MEMBER_BENEFITS[planName],
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Renew membership
  renewMembership: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { paymentMethod = "WALLET" } = req.body;

    try {
      const existingMembership = await prisma.member.findUnique({
        where: { userId },
      });

      if (!existingMembership) {
        return res.status(404).json({
          success: false,
          message: "No existing membership found. Please upgrade instead.",
        });
      }

      const planName = existingMembership.planName;
      const pricing = await prisma.pricingSetting.findFirst({
        where: {
          tenantId,
          key: "MEMBER_UPGRADE",
          isActive: true,
        },
      });

      const amount = pricing?.amount || 999;

      // Handle payment
      if (paymentMethod === "WALLET") {
        const wallet = await prisma.wallet.findUnique({
          where: { userId },
        });

        if (!wallet || wallet.balance < amount) {
          return res.status(400).json({
            success: false,
            message: "Insufficient wallet balance",
            required: amount,
            currentBalance: wallet?.balance || 0,
          });
        }

        await prisma.wallet.update({
          where: { userId },
          data: { balance: { decrement: amount } },
        });

        await prisma.walletTransaction.create({
          data: {
            id: generateUuid(),
            userId,
            amount: -amount,
            type: "DEBIT",
            meta: { reason: "MEMBER_RENEWAL", planName },
          },
        });
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          id: generateUuid(),
          userId,
          type: "MEMBER_UPGRADE",
          amount,
          currency: "INR",
          gateway: paymentMethod,
          status: "COMPLETED",
          metadata: { planName, isRenewal: true },
        },
      });

      // Extend membership
      const currentExpiry = new Date(existingMembership.expiresAt);
      const newExpiry = new Date();
      newExpiry.setFullYear(
        currentExpiry > new Date() ? currentExpiry.getFullYear() + 1 : new Date().getFullYear() + 1
      );

      const membership = await prisma.member.update({
        where: { userId },
        data: {
          status: "ACTIVE",
          expiresAt: newExpiry,
          paymentId: payment.id,
          amount,
          benefitsUsed: {}, // Reset benefits usage
        },
      });

      return res.json({
        success: true,
        message: "Membership renewed successfully",
        membership: {
          ...membership,
          benefits: MEMBER_BENEFITS[planName],
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Toggle auto-renewal
  toggleAutoRenew: async (req, res) => {
    const { user_id: userId } = req.user;
    const { autoRenew } = req.body;

    try {
      const membership = await prisma.member.update({
        where: { userId },
        data: { autoRenew },
      });

      return res.json({
        success: true,
        message: autoRenew ? "Auto-renewal enabled" : "Auto-renewal disabled",
        membership,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Admin: Get all members
  getAllMembers: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { status, planName, page = 1, limit = 20 } = req.query;

    try {
      const where = {
        user: { tenantId },
        status: status || undefined,
        planName: planName || undefined,
      };

      Object.keys(where).forEach((key) => {
        if (where[key] === undefined) delete where[key];
      });

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [members, total] = await Promise.all([
        prisma.member.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                mobile: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit),
        }),
        prisma.member.count({ where }),
      ]);

      return res.json({
        success: true,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        members,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Track benefit usage (internal use)
  trackBenefitUsage: async (userId, benefitType) => {
    try {
      const membership = await prisma.member.findUnique({
        where: { userId },
      });

      if (!membership || membership.status !== "ACTIVE") {
        return { allowed: false, reason: "Not an active member" };
      }

      const benefitsUsed = membership.benefitsUsed || {};
      const currentUsage = benefitsUsed[benefitType] || 0;

      const planBenefits = MEMBER_BENEFITS[membership.planName] || MEMBER_BENEFITS.PREMIUM;
      const limit = planBenefits[`${benefitType}PerMonth`];

      if (currentUsage >= limit) {
        return { allowed: false, reason: "Monthly limit reached", limit, used: currentUsage };
      }

      // Update usage
      await prisma.member.update({
        where: { userId },
        data: {
          benefitsUsed: {
            ...benefitsUsed,
            [benefitType]: currentUsage + 1,
          },
        },
      });

      return { allowed: true, limit, used: currentUsage + 1, remaining: limit - currentUsage - 1 };
    } catch (err) {
      console.error("Error tracking benefit usage:", err);
      return { allowed: false, reason: "Error tracking usage" };
    }
  },
};

module.exports = memberController;
