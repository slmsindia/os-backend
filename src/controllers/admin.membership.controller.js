const bcrypt = require("bcrypt");
const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");
const { logAction } = require("../utils/audit");
const walletService = require("../services/wallet.service");
const commissionService = require("../services/commission.service");

const adminMembershipController = {
  /**
   * Create a user directly (Admin/Partner led)
   */
  createUser: async (req, res) => {
    const { mobile, fullName, gender, dateOfBirth, password, identity, paymentMethod } = req.body;
    const { user_id: creatorId, tenant_id: tenantId } = req.user;

    if (!mobile || !fullName || !gender || !dateOfBirth || !password) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Sanitize identity input (convert camelCase or spaces to UPPER_SNAKE_CASE)
    const sanitizedIdentity = (identity || "USER")
      .trim()
      .replace(/([a-z])([A-Z])/g, '$1_$2') // convert statePartner to state_Partner
      .replace(/\s+/g, '_')                // convert "STATE PARTNER" to STATE_PARTNER
      .toUpperCase();

    try {
      // 1. Hierarchical Role Validation
      const creatorIdentity = req.user.identity;
      const targetIdentity = sanitizedIdentity;

      // All roles allowed to directly create/upgrade lower-level identities
      const AUTHORIZED_CREATOR_ROLES = [
        'SUPER_ADMIN',
        'WHITE_LABEL_ADMIN',
        'ADMIN',
        'SUB_ADMIN',
        'COUNTRY_HEAD',
        'STATE_PARTNER',
        'DISTRICT_PARTNER'
      ];

      // Block if caller is not one of the authorized roles
      if (!AUTHORIZED_CREATOR_ROLES.includes(creatorIdentity)) {
        return res.status(403).json({
          success: false,
          message: `Your role (${creatorIdentity}) is not allowed to create members directly.`
        });
      }

      const ROLE_HIERARCHY = {
        'SUPER_ADMIN': 100,
        'WHITE_LABEL_ADMIN': 90,
        'ADMIN': 80,
        'SUB_ADMIN': 70,
        'COUNTRY_HEAD': 60,
        'STATE_PARTNER': 50,
        'DISTRICT_PARTNER': 40,
        'SAATHI': 30,
        'MEMBER': 20,
        'AGENT': 15,
        'USER': 10
      };

      const creatorLevel = ROLE_HIERARCHY[creatorIdentity] || 0;
      const targetLevel  = ROLE_HIERARCHY[targetIdentity]  || 0;

      // Every authorized role can ONLY create identities strictly BELOW their own level
      if (targetLevel >= creatorLevel) {
        return res.status(403).json({
          success: false,
          message: `Your role (${creatorIdentity}) cannot create a ${targetIdentity}. You can only create lower-tier roles.`
        });
      }

      // 2. Fee & Payment Logic (calculated before checking if user exists, used in both upgrade and create paths)
      const SHARED_WALLET_ROLES = ['WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN', 'AGENT'];
      const PAID_ROLES = ['BUSINESS_PARTNER', 'SAATHI', 'MEMBER', 'USER', 'ADMIN', 'SUB_ADMIN', 'AGENT'];
      
      let fee = 0;
      if (PAID_ROLES.includes(targetIdentity)) {
        if (targetIdentity === 'SAATHI') {
          const setting = await prisma.globalSetting.findUnique({ where: { key: 'SAATHI_FEE' } });
          fee = 1000;
          if (setting && setting.value) {
            try { fee = JSON.parse(setting.value).amount || 1000; } catch (e) { fee = parseFloat(setting.value); }
          }
        } else if (targetIdentity === 'MEMBER') {
          const config = await prisma.membershipConfig.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
          fee = config ? config.membershipPrice : 150;
        } else if (targetIdentity === 'BUSINESS_PARTNER') {
          const setting = await prisma.globalSetting.findUnique({ where: { key: 'BUSINESS_PARTNER_FEE' } });
          fee = 2000;
          if (setting && setting.value) {
            try { fee = JSON.parse(setting.value).amount || 2000; } catch (e) { fee = parseFloat(setting.value); }
          }
        } else if (targetIdentity === 'AGENT') {
          const setting = await prisma.globalSetting.findUnique({ where: { key: 'AGENT_REGISTRATION_FEE' } });
          fee = setting ? parseFloat(setting.value) : 500;
        } else if (SHARED_WALLET_ROLES.includes(targetIdentity)) {
          const setting = await prisma.globalSetting.findUnique({ where: { key: 'ADMIN_REGISTRATION_FEE' } });
          fee = setting ? parseFloat(setting.value) : 5000;
        }
      }

      // Validate Payment Method
      if (fee > 0) {
        if (SHARED_WALLET_ROLES.includes(targetIdentity)) {
          if (!['CASH', 'RAZORPAY'].includes(paymentMethod)) {
            return res.status(400).json({ success: false, message: `${targetIdentity} can only use CASH or RAZORPAY for registration fees.` });
          }
        } else {
          if (!['WALLET', 'RAZORPAY'].includes(paymentMethod)) {
            return res.status(400).json({ success: false, message: "This role requires payment via WALLET or RAZORPAY." });
          }
        }
      }

      // 3. Check if mobile exists
      const existing = await prisma.user.findUnique({ where: { mobile } });

      // ─── CASE A: User Already Exists → Upgrade their identity directly ───
      if (existing) {
        // Process fee/wallet deduction for the upgrade
        if (fee > 0 && paymentMethod === 'WALLET') {
          try {
            const creator = await prisma.user.findUnique({ where: { id: creatorId } });
            await walletService.deductBalanceIfSufficient(creatorId, fee, tenantId, creator.identity);
          } catch (err) {
            return res.status(400).json({ success: false, message: err.message || "Insufficient wallet balance" });
          }
        }

        // Calculate updated hierarchy path so this user appears under the creator in hierarchy queries
        const creatorRecord = await prisma.user.findUnique({
          where: { id: creatorId },
          select: { id: true, path: true }
        });
        const updatedPath = creatorRecord
          ? (creatorRecord.path ? `${creatorRecord.path}/${creatorRecord.id}` : `/${creatorRecord.id}`)
          : (existing.path || '');

        // Upgrade the existing user's identity AND fix hierarchy (parentId + path)
        const upgradedUser = await prisma.user.update({
          where: { id: existing.id },
          data: {
            identity: targetIdentity,
            approvalStatus: 'APPROVED',
            approvedAt: new Date(),
            parentId: creatorId,    // Link to creator so hierarchy queries work
            path: updatedPath       // Set correct path so descendant queries work
          }
        });

        // Create wallet if needed (MEMBER, SAATHI, BUSINESS_PARTNER get personal wallets)
        if (targetIdentity !== 'USER' && !SHARED_WALLET_ROLES.includes(targetIdentity)) {
          try {
            await walletService.createWallet(upgradedUser.id, tenantId, false);
          } catch (walletErr) {
            console.error("Failed to create wallet for upgraded user:", walletErr);
          }
        }

        await logAction({
          userId: creatorId,
          action: `IDENTITY_UPGRADED_TO_${targetIdentity}`,
          targetId: upgradedUser.id,
          tenantId,
          metadata: { previousIdentity: existing.identity, newIdentity: targetIdentity, fee, paymentMethod }
        });

        return res.status(200).json({
          success: true,
          message: `Existing user upgraded to ${targetIdentity} successfully. Fee of ${fee} processed via ${paymentMethod || 'NONE'}.`,
          data: { userId: upgradedUser.id, mobile: upgradedUser.mobile, previousIdentity: existing.identity, newIdentity: targetIdentity, feeProcessed: fee }
        });
      }


      // ─── CASE B: User Does NOT Exist → Create brand new user ───

      // Handle Wallet Deduction/Credit for new user creation
      if (fee > 0 && paymentMethod === 'WALLET') {
        try {
          const creator = await prisma.user.findUnique({ where: { id: creatorId } });
          await walletService.deductBalanceIfSufficient(creatorId, fee, tenantId, creator.identity);
        } catch (err) {
          return res.status(400).json({ success: false, message: err.message || "Insufficient wallet balance" });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Calculate hierarchy path for scalability
      let path = "";
      if (creatorId) {
        const selectFields = { id: true };
        const availableFields = Object.keys(prisma.user.fields || {});
        if (availableFields.includes('path') || prisma.user.findUnique.toString().includes('path')) {
          selectFields.path = true;
        }

        const creator = await prisma.user.findUnique({
          where: { id: creatorId },
          select: selectFields
        });
        
        if (creator) {
          path = creator.path ? `${creator.path}/${creator.id}` : `/${creator.id}`;
        }
      }

      const userData = {
        id: generateUuid(),
        mobile,
        fullName,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        password: hashedPassword,
        identity: targetIdentity,
        tenantId,
        parentId: creatorId
      };

      // Only add path if the model supports it
      const userModelFields = Object.keys(prisma.user.fields || {});
      if (userModelFields.includes('path') || prisma.user.create.toString().includes('path')) {
        userData.path = path;
      }

      const user = await prisma.user.create({ data: userData });

      // Create wallet for the new user (unless they are USER or share a Corporate Wallet)
      if (targetIdentity !== 'USER' && !SHARED_WALLET_ROLES.includes(targetIdentity)) {
        try {
          await walletService.createWallet(user.id, tenantId, false);
        } catch (walletErr) {
          console.error("Failed to create personal wallet for user:", walletErr);
        }
      } else if (SHARED_WALLET_ROLES.includes(targetIdentity)) {
        try {
          await walletService.resolveWallet(user.id, tenantId, targetIdentity);
        } catch (walletErr) {
          console.error("Failed to ensure corporate wallet:", walletErr);
        }
      }

      // If target is Admin/Sub-Admin/Agent and they paid via Cash/Razorpay, CREDIT the shared/corporate wallet
      if (SHARED_WALLET_ROLES.includes(targetIdentity) && fee > 0 && ['CASH', 'RAZORPAY'].includes(paymentMethod)) {
        try {
          const sharedWallet = await walletService.resolveWallet(user.id, tenantId, targetIdentity);
          await walletService.updateBalance(sharedWallet.id, fee);
          
          await logAction({
            userId: creatorId,
            action: "ADMIN_FEE_CREDITED_TO_WALLET",
            targetId: sharedWallet.id,
            tenantId,
            metadata: { amount: fee, paymentMethod, newUserId: user.id }
          });
        } catch (walletErr) {
          console.error("Failed to credit corporate wallet:", walletErr);
        }
      }

      res.status(201).json({
        success: true,
        message: `User created successfully as ${targetIdentity}. Fee of ${fee} processed via ${paymentMethod || 'NONE'}.`,
        data: { userId: user.id, mobile: user.mobile, feeProcessed: fee }
      });

    } catch (err) {
      console.error("Direct User Creation Error:", err);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error during user creation",
        error: err.message // Returns specific DB error (e.g., "column path does not exist")
      });
    }
  },
  /**
   * Update membership price
   */
  updateMembershipPrice: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId } = req.user;
    const { gst, includedExcluded, platformFee, serviceCharges, price, membershipPrice, commissionSubServiceId } = req.body;
    
    // Legacy support
    const legacyPrice = price || membershipPrice;

    let calculatedAmount = 0;
    const sc = parseFloat(serviceCharges || 0);
    const pf = parseFloat(platformFee || 0);
    const g = parseFloat(gst || 0);
    const isInclusive = includedExcluded === true || includedExcluded === 'true';

    if (serviceCharges !== undefined) {
      if (isInclusive) {
          calculatedAmount = sc + pf;
      } else {
          calculatedAmount = sc + (sc * g / 100) + pf;
      }
    } else if (legacyPrice) {
      calculatedAmount = parseFloat(legacyPrice);
    }

    if (!calculatedAmount || calculatedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee configuration"
      });
    }

    try {
      // Deactivate old config
      await prisma.membershipConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });

      const configData = {
          id: generateUuid(),
          membershipPrice: calculatedAmount,
          currency: 'INR',
          commissionSubServiceId: commissionSubServiceId || null,
          isActive: true
      };

      if (serviceCharges !== undefined) {
        configData.gst = g;
        configData.includedExcluded = isInclusive;
        configData.platformFee = pf;
        configData.serviceCharge = sc;
      }

      // Create new config
      const config = await prisma.membershipConfig.create({
        data: configData
      });

      await logAction({
        userId: adminId,
        action: "MEMBERSHIP_PRICE_UPDATED",
        tenantId,
        metadata: { price: config.membershipPrice }
      });

      res.json({
        success: true,
        message: "Membership price updated successfully",
        data: {
          price: config.membershipPrice,
          currency: config.currency,
          gst: config.gst,
          includedExcluded: config.includedExcluded,
          platformFee: config.platformFee,
          serviceCharge: config.serviceCharge
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Delegate membership approval functionality to a lower role/user
   */
  delegateApproval: async (req, res) => {
    const { user_id: adminId, identity: adminIdentity, tenant_id: tenantId } = req.user;
    const { targetUserId, canApprove, type } = req.body; // type: 'MEMBERSHIP', 'SAATHI', 'BOTH'

    if (adminIdentity !== 'ADMIN' && adminIdentity !== 'SUPER_ADMIN' && adminIdentity !== 'WHITE_LABEL_ADMIN') {
      return res.status(403).json({ success: false, message: "Only Admins can delegate approval functionality" });
    }

    try {
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser || targetUser.tenantId !== tenantId) {
        return res.status(404).json({ success: false, message: "Target user not found" });
      }

      const ELIGIBLE_ROLES = ['SUB_ADMIN', 'COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'];
      if (!ELIGIBLE_ROLES.includes(targetUser.identity)) {
        return res.status(400).json({ success: false, message: `Cannot delegate to role: ${targetUser.identity}` });
      }

      const updateData = {};
      if (type === 'MEMBERSHIP' || type === 'BOTH') {
        updateData.canApproveMembership = !!canApprove;
      }
      if (type === 'SAATHI' || type === 'BOTH') {
        updateData.canApproveSaathi = !!canApprove;
      }

      await prisma.user.update({
        where: { id: targetUserId },
        data: updateData
      });

      await logAction({
        userId: adminId,
        action: "APPROVAL_DELEGATED",
        targetId: targetUserId,
        tenantId,
        metadata: { type, canApprove }
      });

      res.json({
        success: true,
        message: `Approval permissions (${type}) ${canApprove ? 'granted to' : 'withdrawn from'} user successfully`
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Helper to get all descendant IDs for a user using indexed path search
   */
  getDescendantIds: async (userId) => {
    // Check if path field exists in the client
    const hasPath = Object.keys(prisma.user.fields || {}).includes('path') || 
                    prisma.user.findMany.toString().includes('path');

    if (hasPath) {
      // High-performance search: find all users whose path contains this ID
      const descendants = await prisma.user.findMany({
        where: { path: { contains: userId } },
        select: { id: true }
      });
      return descendants.map(d => d.id);
    } else {
      // Fallback to slower level-by-level search for older clients
      let descendantIds = [];
      let currentLevelIds = [userId];
      while (currentLevelIds.length > 0) {
        const children = await prisma.user.findMany({
          where: { parentId: { in: currentLevelIds } },
          select: { id: true }
        });
        if (children.length === 0) break;
        const childrenIds = children.map(c => c.id);
        descendantIds = descendantIds.concat(childrenIds);
        currentLevelIds = childrenIds;
      }
      return descendantIds;
    }
  },

  /**
   * Get all membership applications (for admin review)
   */
  getMembershipApplications: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const { status, page = 1, limit = 20 } = req.query;

    try {
      const where = {
        user: { tenantId: tenantId }
      };

      if (status) {
        where.status = status;
      }

      // Hierarchy Visibility Rule (Scalable Version):
      const topRoles = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'];
      if (!topRoles.includes(adminIdentity)) {
        // Check if path field exists in the client for optimized search
        const hasPath = Object.keys(prisma.user.fields || {}).includes('path') || 
                        prisma.user.findMany.toString().includes('path');

        if (hasPath) {
          where.OR = [
            { user: { path: { contains: adminId } } },
            { user: { parentId: adminId } },
            { createdById: adminId }
          ];
        } else {
          const descendantIds = await adminMembershipController.getDescendantIds(adminId);
          where.OR = [
            { userId: { in: descendantIds } },
            { createdById: adminId }
          ];
        }
      }

      const applications = await prisma.membershipApplication.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              fullName: true,
              profilePhoto: true,
              parentId: true
            }
          },
          creator: {
            select: {
              id: true,
              fullName: true,
              identity: true
            }
          },
          payment: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      });

      const total = await prisma.membershipApplication.count({ where });

      await logAction({
        userId: adminId,
        action: "VIEW_MEMBERSHIP_APPLICATIONS",
        tenantId
      });

      res.json({
        success: true,
        data: {
          members: applications,
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
   * Get single membership application details
   */
  getApplicationDetails: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId } = req.user;
    const { applicationId } = req.params;

    try {
      const application = await prisma.membershipApplication.findUnique({
        where: { id: applicationId },
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              fullName: true
            }
          },
          payment: true,
          education: true,
          sector: true,
          jobRole: true,
          documents: true
        }
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found"
        });
      }

      await logAction({
        userId: adminId,
        action: "VIEW_MEMBERSHIP_APPLICATION",
        targetId: applicationId,
        tenantId
      });

      res.json({
        success: true,
        data: application
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Approve membership application
   */
  approveApplication: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const { applicationId } = req.params;

    try {
      // Check if user has permission to approve
      const admin = await prisma.user.findUnique({
        where: { id: adminId }
      });

      const canApprove = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(adminIdentity) || 
                        admin.canApproveMembership;

      if (!canApprove) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to approve membership applications"
        });
      }

      const application = await prisma.membershipApplication.findUnique({
        where: { id: applicationId },
        include: { user: true, payment: true }
      });

      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }

      // STRICT HIERARCHY CHECK: 
      // If not a Top Admin, you can only approve users in your own hierarchy
      const topRoles = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'];
      if (!topRoles.includes(adminIdentity)) {
        const descendantIds = await adminMembershipController.getDescendantIds(adminId);
        if (!descendantIds.includes(application.userId) && application.createdById !== adminId) {
          return res.status(403).json({
            success: false,
            message: "You can only approve applications from users in your own hierarchy"
          });
        }
      }

      if (application.payment?.status !== 'SUCCESS') {
        return res.status(400).json({
          success: false,
          message: "Payment not completed for this application"
        });
      }

      if (application.status === 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: "Application already approved"
        });
      }

      // Update application status
      const updated = await prisma.membershipApplication.update({
        where: { id: applicationId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: adminId
        }
      });

      // Update user profile and identity from application data
      await prisma.user.update({
        where: { id: application.userId },
        data: {
          fullName: `${application.firstName} ${application.lastName}`,
          email: application.email,
          gender: application.gender.toUpperCase(),
          userType: 'MEMBER',
          identity: 'MEMBER',
          approvalStatus: 'APPROVED',
          approvedAt: new Date(),
          roleId: null
        }
      });

      // Create wallet for the new member
      try {
        await walletService.createWallet(application.userId, tenantId, false);
      } catch (walletErr) {
        console.error("Failed to create wallet for user:", walletErr);
      }

      await logAction({
        userId: adminId,
        action: "MEMBERSHIP_APPLICATION_APPROVED",
        targetId: applicationId,
        tenantId,
        metadata: { userId: application.userId }
      });

      // --- NEW: COMMISSION DISTRIBUTION LOGIC ---
      try {
        // 1. Credit the full amount to Admin's Corporate Wallet first
        const adminCorporateWallet = await prisma.wallet.findFirst({
          where: { tenantId, isCorporate: true }
        });

        if (adminCorporateWallet && application.payment?.amount > 0) {
          await prisma.wallet.update({
            where: { id: adminCorporateWallet.id },
            data: { balance: { increment: application.payment.amount } }
          });

          await prisma.walletTransaction.create({
            data: {
              id: generateUuid(),
              walletId: adminCorporateWallet.id,
              amount: application.payment.amount,
              type: "CREDIT",
              category: "SERVICE_CHARGE",
              description: `Membership fee from user ${application.userId}`,
              tenantId
            }
          });

          // 2. Distribute commission down the hierarchy from Admin wallet
          // We fetch the subServiceId directly from the active MembershipConfig
          const config = await prisma.membershipConfig.findFirst({
            where: { isActive: true }
          });

          if (config && config.commissionSubServiceId) {
             await commissionService.processCommission(
                application.payment.amount,
                config.commissionSubServiceId,
                application.userId,
                prisma
             );
          }
        }
      } catch (commErr) {
        console.error("Commission distribution failed:", commErr);
        // We don't block the approval if commission fails, but we log it
      }
      // -------------------------------------------

      res.json({
        success: true,
        message: "Membership application approved successfully",
        data: {
          applicationId: updated.id,
          userId: application.userId
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Reject membership application
   */
  rejectApplication: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const { applicationId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required"
      });
    }

    try {
      // Check if user has permission to reject
      const admin = await prisma.user.findUnique({
        where: { id: adminId }
      });

      const canReject = adminIdentity === 'SUPER_ADMIN' || 
                        adminIdentity === 'WHITE_LABEL_ADMIN' || 
                        adminIdentity === 'ADMIN' || 
                        admin.canApproveMembership;

      if (!canReject) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to reject membership applications"
        });
      }

      const application = await prisma.membershipApplication.findUnique({
        where: { id: applicationId },
        include: { user: true }
      });

      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }

      // Hierarchy Check for Delegated Partners
      const topRoles = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'];
      if (!topRoles.includes(adminIdentity)) {
        if (application.user.parentId !== adminId && (!application.user.path || !application.user.path.includes(adminId))) {
          return res.status(403).json({
            success: false,
            message: "You can only reject applications from users in your own hierarchy"
          });
        }
      }

      if (application.status === 'REJECTED') {
        return res.status(400).json({
          success: false,
          message: "Application already rejected"
        });
      }

      // Update application status
      const updated = await prisma.membershipApplication.update({
        where: { id: applicationId },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
          approvedBy: adminId // Store who rejected it
        }
      });

      await logAction({
        userId: adminId,
        action: "MEMBERSHIP_APPLICATION_REJECTED",
        targetId: applicationId,
        tenantId,
        metadata: { reason, userId: application.userId }
      });

      res.json({
        success: true,
        message: "Membership application rejected",
        data: {
          applicationId: updated.id,
          rejectionReason: reason
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Education Management
   */
  createEducation: async (req, res) => {
    const { user_id: adminId } = req.user;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Education name is required"
      });
    }

    try {
      const education = await prisma.education.create({
        data: {
          id: generateUuid(),
          name: name.trim()
        }
      });

      await logAction({
        userId: adminId,
        action: "EDUCATION_CREATED",
        targetId: education.id
      });

      res.status(201).json({
        success: true,
        message: "Education created successfully",
        data: education
      });
    } catch (err) {
      console.error(err);
      if (err.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: "Education already exists"
        });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getEducations: async (req, res) => {
    try {
      const educations = await prisma.education.findMany({
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: educations
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Sector Management
   */
  createSector: async (req, res) => {
    const { user_id: adminId } = req.user || {};
    const { name, description, imageUrl } = req.body || {};

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Sector name is required"
      });
    }

    try {
      const sector = await prisma.sector.create({
        data: {
          id: generateUuid(),
          name: name.trim(),
          description: description ? description.trim() : null,
          imageUrl: imageUrl || null
        }
      });

      await logAction({
        userId: adminId,
        action: "SECTOR_CREATED",
        targetId: sector.id
      });

      res.status(201).json({
        success: true,
        message: "Sector created successfully",
        data: sector
      });
    } catch (err) {
      console.error(err);
      if (err.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: "Sector already exists"
        });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getSectors: async (req, res) => {
    try {
      const sectors = await prisma.sector.findMany({
        orderBy: { name: 'asc' },
        include: { jobRoles: true, skills: true }
      });

      res.json({
        success: true,
        data: sectors
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Job Role Management
   */
  createJobRole: async (req, res) => {
    const { user_id: adminId } = req.user || {};
    const { name, sectorId, description, imageUrl } = req.body || {};

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Job role name is required"
      });
    }

    if (!sectorId) {
      return res.status(400).json({
        success: false,
        message: "Sector is required"
      });
    }

    try {
      const jobRole = await prisma.jobRole.create({
        data: {
          id: generateUuid(),
          name: name.trim(),
          sectorId,
          description: description ? description.trim() : null,
          imageUrl: imageUrl || null
        }
      });

      await logAction({
        userId: adminId,
        action: "JOB_ROLE_CREATED",
        targetId: jobRole.id
      });

      res.status(201).json({
        success: true,
        message: "Job role created successfully",
        data: jobRole
      });
    } catch (err) {
      console.error(err);
      if (err.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: "Job role already exists"
        });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getJobRoles: async (req, res) => {
    try {
      const jobRoles = await prisma.jobRole.findMany({
        orderBy: { name: 'asc' },
        include: { sector: true, skills: true }
      });

      res.json({
        success: true,
        data: jobRoles
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Skill Management
   */
  createSkill: async (req, res) => {
    const { user_id: adminId } = req.user || {};
    const { name, sectorId, jobRoleId } = req.body || {};

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: "Skill name is required" });
    }
    if (!sectorId || !jobRoleId) {
      return res.status(400).json({ success: false, message: "Sector and Job Role are required" });
    }

    try {
      const skill = await prisma.skill.create({
        data: {
          id: generateUuid(),
          name: name.trim(),
          sectorId,
          jobRoleId
        }
      });

      await logAction({
        userId: adminId,
        action: "SKILL_CREATED",
        targetId: skill.id
      });

      res.status(201).json({
        success: true,
        message: "Skill created successfully",
        data: skill
      });
    } catch (err) {
      console.error(err);
      if (err.code === 'P2002') {
        return res.status(400).json({ success: false, message: "Skill already exists for this Job Role" });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getSkills: async (req, res) => {
    try {
      const skills = await prisma.skill.findMany({
        orderBy: { name: 'asc' },
        include: { sector: true, jobRole: true }
      });

      res.json({
        success: true,
        data: skills
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Document Type Management
   */
  createDocumentType: async (req, res) => {
    const { user_id: adminId } = req.user;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Document type name is required"
      });
    }

    try {
      const documentType = await prisma.documentType.create({
        data: {
          id: generateUuid(),
          name: name.trim()
        }
      });

      await logAction({
        userId: adminId,
        action: "DOCUMENT_TYPE_CREATED",
        targetId: documentType.id
      });

      res.status(201).json({
        success: true,
        message: "Document type created successfully",
        data: documentType
      });
    } catch (err) {
      console.error(err);
      if (err.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: "Document type already exists"
        });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getDocumentTypes: async (req, res) => {
    try {
      const documentTypes = await prisma.documentType.findMany({
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: documentTypes
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = adminMembershipController;
