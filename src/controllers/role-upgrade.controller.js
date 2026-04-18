const { PrismaClient } = require("@prisma/client");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const prisma = new PrismaClient();

// Role upgrade paths
const UPGRADE_PATHS = {
  USER: ["MEMBER", "AGENT", "BUSINESS_PARTNER"],
  MEMBER: ["AGENT", "BUSINESS_PARTNER"],
  AGENT: ["BUSINESS_PARTNER"]
};

const roleUpgradeController = {
  // Get available upgrades for current user
  getAvailableUpgrades: async (req, res) => {
    const { user_id: userId, role } = req.user;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { identity: true, requestedRole: true }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const currentIdentity = user.identity;
      const availableUpgrades = UPGRADE_PATHS[currentIdentity] || [];

      // Get pricing for each upgrade
      const pricing = await prisma.pricingSetting.findMany({
        where: {
          key: {
            in: availableUpgrades.map(r => `${r}_UPGRADE`)
          }
        }
      });

      const pricingMap = {};
      pricing.forEach(p => {
        const roleName = p.key.replace("_UPGRADE", "");
        pricingMap[roleName] = p.amount;
      });

      return res.json({
        success: true,
        currentRole: currentIdentity,
        pendingRequest: user.requestedRole,
        availableUpgrades: availableUpgrades.map(role => ({
          role,
          fee: pricingMap[role] || 0,
          currency: "INR"
        }))
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Submit upgrade request
  requestUpgrade: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { targetRole, paymentId, businessDetails } = req.body;

    if (!targetRole) {
      return res.status(400).json({
        success: false,
        message: "Target role is required"
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { identity: true, requestedRole: true, mobile: true, fullName: true }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Check if already has pending request
      if (user.requestedRole) {
        return res.status(400).json({
          success: false,
          message: `You already have a pending request to become ${user.requestedRole}`
        });
      }

      // Check if upgrade path is valid
      const availableUpgrades = UPGRADE_PATHS[user.identity] || [];
      if (!availableUpgrades.includes(targetRole)) {
        return res.status(400).json({
          success: false,
          message: `Cannot upgrade from ${user.identity} to ${targetRole}. Available: ${availableUpgrades.join(", ")}`
        });
      }

      // For BUSINESS_PARTNER, validate and store business details
      if (targetRole === "BUSINESS_PARTNER") {
        if (!businessDetails || !businessDetails.companyName || !businessDetails.address || 
            !businessDetails.city || !businessDetails.state || !businessDetails.pincode) {
          return res.status(400).json({
            success: false,
            message: "Business details are required (companyName, address, city, state, pincode)"
          });
        }

        // Check if user already has a business profile
        const existingBusiness = await prisma.business.findUnique({
          where: { userId }
        });

        if (existingBusiness) {
          return res.status(400).json({
            success: false,
            message: "You already have a business profile"
          });
        }

        // Check if user already has a pending business partner application
        const existingApplication = await prisma.businessPartnerApplication.findUnique({
          where: { userId }
        });

        if (existingApplication && existingApplication.status === "PENDING") {
          return res.status(400).json({
            success: false,
            message: "You already have a pending business partner application"
          });
        }
      }

      // Get pricing
      const pricingKey = `${targetRole}_UPGRADE`;
      const pricing = await prisma.pricingSetting.findFirst({
        where: { key: pricingKey, tenantId, isActive: true }
      });

      const requiredAmount = pricing?.amount || 0;

      // If payment is required, verify it
      if (requiredAmount > 0) {
        if (!paymentId) {
          return res.status(400).json({
            success: false,
            message: `Payment of ₹${requiredAmount} is required for ${targetRole} upgrade`,
            requiresPayment: true,
            amount: requiredAmount
          });
        }

        // Verify payment
        const payment = await prisma.payment.findFirst({
          where: {
            id: paymentId,
            userId,
            type: "ROLE_UPGRADE",
            status: "COMPLETED"
          }
        });

        if (!payment) {
          return res.status(400).json({
            success: false,
            message: "Valid payment not found. Please complete payment first."
          });
        }
      }

      // For BUSINESS_PARTNER, create application record
      if (targetRole === "BUSINESS_PARTNER") {
        await prisma.businessPartnerApplication.create({
          data: {
            userId,
            companyName: businessDetails.companyName,
            registrationNo: businessDetails.registrationNo || null,
            gstNumber: businessDetails.gstNumber || null,
            email: businessDetails.email || null,
            website: businessDetails.website || null,
            address: businessDetails.address,
            city: businessDetails.city,
            state: businessDetails.state,
            country: businessDetails.country || "India",
            pincode: businessDetails.pincode,
            industry: businessDetails.industry || null,
            companySize: businessDetails.companySize || null,
            businessPlan: businessDetails.businessPlan || null,
            expectedJobs: businessDetails.expectedJobs || 0
          }
        });
      }

      // Submit upgrade request
      await prisma.user.update({
        where: { id: userId },
        data: {
          requestedRole: targetRole,
          approvalStatus: "PENDING"
        }
      });

      await logAction({
        userId,
        action: "ROLE_UPGRADE_REQUESTED",
        tenantId,
        metadata: {
          fromRole: user.identity,
          toRole: targetRole,
          paymentId: paymentId || null,
          amount: requiredAmount,
          hasBusinessDetails: targetRole === "BUSINESS_PARTNER"
        }
      });

      return res.json({
        success: true,
        message: `Upgrade request to ${targetRole} submitted successfully. Waiting for admin approval.`,
        request: {
          fromRole: user.identity,
          toRole: targetRole,
          status: "PENDING"
        }
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Create payment order for upgrade
  createUpgradePaymentOrder: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { targetRole } = req.body;

    try {
      // Get pricing
      const pricingKey = `${targetRole}_UPGRADE`;
      const pricing = await prisma.pricingSetting.findFirst({
        where: { key: pricingKey, tenantId, isActive: true }
      });

      const amount = pricing?.amount || 0;

      if (amount === 0) {
        return res.json({
          success: true,
          message: "No payment required for this upgrade",
          requiresPayment: false
        });
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          id: generateUuid(),
          userId,
          type: "ROLE_UPGRADE",
          amount,
          currency: "INR",
          gateway: "RAZORPAY",
          status: "PENDING",
          metadata: {
            targetRole,
            pricingKey
          }
        }
      });

      return res.json({
        success: true,
        requiresPayment: true,
        amount,
        currency: "INR",
        paymentId: payment.id,
        message: `Payment of ₹${amount} required for ${targetRole} upgrade`
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get pending upgrade requests (Admin)
  getPendingUpgrades: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { page = 1, limit = 20, targetRole } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        tenantId,
        approvalStatus: "PENDING",
        requestedRole: { not: null }
      };

      // Filter by target role if specified
      if (targetRole) {
        where.requestedRole = targetRole;
      }

      const [requests, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            mobile: true,
            fullName: true,
            identity: true,
            requestedRole: true,
            createdAt: true,
            // Include business partner application details if applicable
            bpApplication: targetRole === "BUSINESS_PARTNER" || !targetRole ? {
              select: {
                id: true,
                companyName: true,
                registrationNo: true,
                gstNumber: true,
                email: true,
                website: true,
                address: true,
                city: true,
                state: true,
                country: true,
                pincode: true,
                industry: true,
                companySize: true,
                businessPlan: true,
                expectedJobs: true,
                createdAt: true
              }
            } : false
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit)
        }),
        prisma.user.count({
          where
        })
      ]);

      return res.json({
        success: true,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        requests
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Approve or reject upgrade (Admin)
  processUpgradeRequest: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId } = req.user;
    const { userId: targetUserId } = req.params;
    const { action, reason } = req.body;

    if (!action || !["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be APPROVE or REJECT"
      });
    }

    try {
      const user = await prisma.user.findFirst({
        where: {
          id: targetUserId,
          tenantId,
          approvalStatus: "PENDING",
          requestedRole: { not: null }
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Pending upgrade request not found"
        });
      }

      const fromRole = user.identity;
      const toRole = user.requestedRole;

      if (action === "APPROVE") {
        // For BUSINESS_PARTNER, create Business profile and update application
        if (toRole === "BUSINESS_PARTNER") {
          const bpApplication = await prisma.businessPartnerApplication.findUnique({
            where: { userId: targetUserId }
          });

          if (!bpApplication) {
            return res.status(400).json({
              success: false,
              message: "Business partner application not found"
            });
          }

          // Create Business profile
          await prisma.business.create({
            data: {
              userId: targetUserId,
              companyName: bpApplication.companyName,
              registrationNo: bpApplication.registrationNo,
              gstNumber: bpApplication.gstNumber,
              email: bpApplication.email,
              website: bpApplication.website,
              address: bpApplication.address,
              city: bpApplication.city,
              state: bpApplication.state,
              country: bpApplication.country,
              pincode: bpApplication.pincode,
              industry: bpApplication.industry,
              companySize: bpApplication.companySize,
              isVerified: true,
              verifiedAt: new Date()
            }
          });

          // Update business partner application
          await prisma.businessPartnerApplication.update({
            where: { userId: targetUserId },
            data: {
              status: "APPROVED",
              reviewedBy: adminId,
              reviewedAt: new Date(),
              reviewNotes: reason || null
            }
          });
        }

        // Approve upgrade
        await prisma.user.update({
          where: { id: targetUserId },
          data: {
            identity: toRole,
            requestedRole: null,
            approvalStatus: "APPROVED",
            approvedAt: new Date()
          }
        });

        await logAction({
          userId: adminId,
          action: "ROLE_UPGRADE_APPROVED",
          targetId: targetUserId,
          tenantId,
          metadata: { fromRole, toRole }
        });

        return res.json({
          success: true,
          message: `User upgraded from ${fromRole} to ${toRole}`,
          result: {
            userId: targetUserId,
            previousRole: fromRole,
            newRole: toRole,
            status: "APPROVED"
          }
        });
      } else {
        // Reject upgrade
        // For BUSINESS_PARTNER, also update the application
        if (toRole === "BUSINESS_PARTNER") {
          await prisma.businessPartnerApplication.update({
            where: { userId: targetUserId },
            data: {
              status: "REJECTED",
              reviewedBy: adminId,
              reviewedAt: new Date(),
              reviewNotes: reason || null
            }
          });
        }

        await prisma.user.update({
          where: { id: targetUserId },
          data: {
            requestedRole: null,
            approvalStatus: "REJECTED"
          }
        });

        await logAction({
          userId: adminId,
          action: "ROLE_UPGRADE_REJECTED",
          targetId: targetUserId,
          tenantId,
          metadata: { fromRole, toRole, reason }
        });

        return res.json({
          success: true,
          message: `Upgrade request rejected`,
          result: {
            userId: targetUserId,
            fromRole,
            toRole,
            status: "REJECTED",
            reason
          }
        });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get my upgrade request status
  getMyUpgradeStatus: async (req, res) => {
    const { user_id: userId } = req.user;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          identity: true,
          requestedRole: true,
          approvalStatus: true,
          approvedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      let businessApplication = null;
      if (user.requestedRole === "BUSINESS_PARTNER") {
        businessApplication = await prisma.businessPartnerApplication.findUnique({
          where: { userId },
          select: {
            id: true,
            companyName: true,
            city: true,
            state: true,
            industry: true,
            status: true,
            reviewNotes: true,
            reviewedAt: true,
            createdAt: true
          }
        });
      }

      return res.json({
        success: true,
        currentRole: user.identity,
        pendingRequest: user.requestedRole,
        approvalStatus: user.approvalStatus,
        approvedAt: user.approvedAt,
        businessApplication
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = roleUpgradeController;
