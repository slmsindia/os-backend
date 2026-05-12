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
    const { mobile, fullName, gender, dateOfBirth, password, identity, paymentMethod, flowType, liveAddress, liveCity, liveState, livePincode, liveCountry, profilePhoto, email } = req.body;
    const creatorId = req.user?.user_id || req.user?.id;
    const tenantId = req.user?.tenant_id || req.user?.tenantId;

    if (!tenantId) {
       return res.status(400).json({ success: false, message: "Tenant ID missing from your session." });
    }

    if (!mobile || !fullName || !gender || !dateOfBirth) {
      return res.status(400).json({ success: false, message: "Missing required profile fields" });
    }

    const isNewUserFlow = flowType === 'ADMIN_CREATE_NEW_USER';
    if (isNewUserFlow && !password) {
      return res.status(400).json({ success: false, message: "Password is required for new user creation" });
    }

    // Sanitize identity input (convert camelCase or spaces to UPPER_SNAKE_CASE)
    const sanitizedIdentity = (identity || "USER")
      .trim()
      .replace(/([a-z])([A-Z])/g, '$1_$2') // convert statePartner to state_Partner
      .replace(/\s+/g, '_')                // convert "STATE PARTNER" to STATE_PARTNER
      .toUpperCase();

    try {
      console.log(`[CreateUserEntry] Creator: ${creatorId}, Tenant: ${tenantId}, Mobile: ${mobile}, TargetIdentity: ${sanitizedIdentity}`);
      
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
        'DISTRICT_PARTNER',
        'SAATHI'
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
        'BUSINESS_PARTNER': 25,
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
      const PAID_ROLES = ['BUSINESS_PARTNER', 'SAATHI', 'MEMBER', 'USER', 'AGENT'];
      
      let fee = 0;
      if (PAID_ROLES.includes(targetIdentity)) {
        if (targetIdentity === 'SAATHI') {
          const setting = await prisma.globalSetting.findFirst({ where: { key: 'SAATHI_FEE', tenantId } });
          fee = 1000;
          if (setting && setting.value) {
            try { fee = JSON.parse(setting.value).amount || 1000; } catch (e) { fee = parseFloat(setting.value); }
          }
        } else if (targetIdentity === 'MEMBER') {
          const config = await prisma.membershipConfig.findFirst({ 
            where: { isActive: true, tenantId }, 
            orderBy: { createdAt: 'desc' } 
          });
          fee = config ? config.membershipPrice : 100;
        } else if (targetIdentity === 'BUSINESS_PARTNER') {
          const setting = await prisma.globalSetting.findFirst({ where: { key: 'BUSINESS_PARTNER_FEE', tenantId } });
          fee = 2000;
          if (setting && setting.value) {
            try { fee = JSON.parse(setting.value).amount || 2000; } catch (e) { fee = parseFloat(setting.value); }
          }
        } else if (targetIdentity === 'AGENT') {
          const setting = await prisma.globalSetting.findFirst({ where: { key: 'AGENT_REGISTRATION_FEE', tenantId } });
          fee = setting ? parseFloat(setting.value) : 500;
        } else if (['AGENT'].includes(targetIdentity)) {
          const setting = await prisma.globalSetting.findFirst({ where: { key: 'ADMIN_REGISTRATION_FEE', tenantId } });
          fee = setting ? parseFloat(setting.value) : 5000;
        }
      }

      // Validate Payment Method
      if (fee > 0) {
        if (['WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(targetIdentity)) {
          if (!['CASH', 'RAZORPAY'].includes(paymentMethod)) {
            return res.status(400).json({ success: false, message: `${targetIdentity} can only use CASH or RAZORPAY for registration fees.` });
          }
        } else {
          if (!['WALLET', 'RAZORPAY'].includes(paymentMethod)) {
            return res.status(400).json({ success: false, message: "This role requires payment via WALLET or RAZORPAY." });
          }
        }
      }

      // 3. Check if mobile exists (using findFirst because mobile alone is no longer unique globally)
      const existing = await prisma.user.findFirst({
        where: { mobile, tenantId }
      });

      console.log(`[LookupDebug] Found existing user: ${existing ? 'YES (ID: ' + existing.id + ')' : 'NO'}`);

      // ─── CASE A: User Already Exists → Upgrade their identity directly ───
      if (existing) {
        // ─── Flow 4: Free Conversion Path ───
        if (paymentMethod === 'FREE_CONVERSION') {
          const upgradedUser = await prisma.user.update({
            where: { id: existing.id },
            data: {
              identity: targetIdentity,
              userType: targetIdentity,
              approvalStatus: 'APPROVED',
              approvedAt: new Date()
            }
          });
          return res.status(200).json({ success: true, message: `User converted to ${targetIdentity} for free.`, data: { userId: upgradedUser.id } });
        }

        // ─── Normal Assisted Flow: Must create application ───
        return res.status(400).json({ 
          success: false, 
          message: "Assisted creation for existing users must go through the Membership Application flow. Use the Application form in the dashboard." 
        });
      }


      // ─── CASE B: User Does NOT Exist → Create brand new user ───
      if (isNewUserFlow && !password) {
        return res.status(400).json({ success: false, message: "Password is required for new user creation" });
      }

      // ─── Flow 3 Fix: Create Application for New Users ───
      // Instead of direct creation, we create an APPLICATION record that must be approved.
      
      const hashedPassword = await bcrypt.hash(password || mobile.slice(-4), 10);
      const { getLocationData } = require("../utils/location");
      const loc = getLocationData(req);

      const ADMIN_ROLES = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN', 'COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'];
      const isDirectRole = ADMIN_ROLES.includes(targetIdentity) || targetIdentity === 'USER';

      const creator = await prisma.user.findUnique({ where: { id: creatorId }, select: { path: true } });
      const path = creator?.path ? `${creator.path}/${creatorId}` : `/${creatorId}`;

      const addrState = liveState || loc.state;
      const addrCity = liveCity || loc.city;
      const addrPincode = livePincode || loc.pincode;

      // 1. Create the base User (as USER identity first)
      const user = await prisma.user.create({
        data: {
          id: generateUuid(),
          mobile,
          email: email || `${mobile}@os.com`,
          fullName,
          gender: gender ? gender.toUpperCase() : 'OTHER',
          dateOfBirth: new Date(dateOfBirth),
          password: hashedPassword,
          identity: isDirectRole ? targetIdentity : 'USER', 
          userType: isDirectRole ? targetIdentity : 'USER',
          approvalStatus: isDirectRole ? 'APPROVED' : 'PENDING',
          approvedAt: isDirectRole ? new Date() : null,
          tenantId,
          parentId: creatorId,
          path,
          profilePhoto: profilePhoto || null,
          registrationState: addrState,
          registrationCity: addrCity,
          registrationPincode: addrPincode,
          registrationAddress: liveAddress ? { 
            addressType: "URBAN", 
            country: liveCountry || "India", 
            state: addrState, 
            city: addrCity, 
            pinCode: addrPincode, 
            addressLine1: liveAddress 
          } : undefined
        }
      });

      if (isDirectRole) {
         // Create wallet for the new user immediately
         try {
           await walletService.createWallet(user.id, tenantId, false);
         } catch (walletErr) {
           console.error("Failed to create wallet for user:", walletErr);
         }
         
         return res.status(201).json({
           success: true,
           message: `${targetIdentity} created successfully. No membership application required.`,
           data: { userId: user.id }
         });
      }

      // 2. Create the Membership Application
      const application = await prisma.membershipApplication.create({
        data: {
          id: generateUuid(),
          user: { connect: { id: user.id } },
          firstName: fullName.split(' ')[0],
          lastName: fullName.split(' ').slice(1).join(' ') || 'N/A',
          email: email || `${mobile}@os.com`,
          mobile: mobile,
          gender: gender.toUpperCase(),
          status: 'PENDING',
          createdById: creatorId,
          paymentType: paymentMethod === 'CASH' ? 'CASH' : (paymentMethod === 'WALLET' ? 'WALLET' : 'RAZORPAY'),
          currentState: addrState || 'N/A',
          currentDistrict: addrCity || 'N/A',
          currentPincode: addrPincode || '000000',
          currentAddress: liveAddress || addrState || 'N/A',
          currentCountry: liveCountry || 'India',
          maritalStatus: req.body.maritalStatus || 'UNMARRIED',
          citizenship: req.body.citizenship || 'Indian',
          isMigrantWorker: req.body.isMigrantWorker || false,
          monthlyIncome: req.body.monthlyIncome || '0-10000',
          permanentCountry: liveCountry || 'India',
          permanentState: addrState || 'N/A',
          permanentDistrict: addrCity || 'N/A',
          permanentAddress: liveAddress || addrState || 'N/A',
          permanentPincode: addrPincode || '000000',
        }
      });

      // 3. If Wallet, handle deduction immediately (but credit deferred)
      if (fee > 0 && paymentMethod === 'WALLET') {
        const adminWallet = await walletService.resolveWallet(null, tenantId, 'WHITE_LABEL_ADMIN');
        const creatorWallet = await walletService.resolveWallet(creatorId, tenantId, creatorIdentity);
        
        await walletService.payCreationFeeWithHistory(
          creatorWallet.id,
          adminWallet.id,
          fee,
          `Assisted Member Creation for ${fullName}`,
          application.id,
          tenantId,
          'WALLET',
          prisma,
          false // creditAdminImmediately = false
        );
      }

      res.status(201).json({
        success: true,
        message: `Application for ${targetIdentity} created successfully. Awaiting approval. Fee of ${fee} processed via ${paymentMethod}.`,
        data: { userId: user.id, applicationId: application.id }
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
    const { gst, includedExcluded, platformFee, serviceCharges, price, membershipPrice } = req.body;
    
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
      // Deactivate old config for this tenant
      await prisma.membershipConfig.updateMany({
        where: { isActive: true, tenantId },
        data: { isActive: false }
      });

      const configData = {
          id: generateUuid(),
          membershipPrice: calculatedAmount,
          currency: 'INR',
          isActive: true,
          tenantId
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
        data: config
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
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const where = {};
      if (adminIdentity !== 'SUPER_ADMIN') {
        where.user = { tenantId: tenantId };
      }


      if (status) {
        where.status = status;
      }

      const topRoles = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'];
      if (!topRoles.includes(adminIdentity)) {
        where.OR = [
          { user: { path: { contains: adminId } } },
          { user: { parentId: adminId } },
          { createdById: adminId }
        ];
      }

      const legacyApps = await prisma.membershipApplication.findMany({
        where,
        include: {
          user: { select: { id: true, mobile: true, fullName: true, profilePhoto: true, parentId: true } },
          creator: { select: { id: true, fullName: true, identity: true } },
          payment: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const unifiedWhere = {
        targetIdentity: 'MEMBER',
        ...(status ? { status } : {})
      };
      if (adminIdentity !== 'SUPER_ADMIN') {
        unifiedWhere.tenantId = tenantId;
      }

      if (!topRoles.includes(adminIdentity)) {
        unifiedWhere.OR = [
          { user: { path: { contains: adminId } } },
          { user: { parentId: adminId } },
          { createdById: adminId }
        ];
      }

      const unifiedApps = await prisma.application.findMany({
        where: unifiedWhere,
        include: {
          user: { select: { id: true, mobile: true, fullName: true, identity: true, profilePhoto: true, parentId: true, registrationCity: true, registrationState: true } },
          creator: { select: { id: true, fullName: true, identity: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      const mappedUnified = unifiedApps.map(app => {
        const data = app.submittedData || {};
        return {
          id: app.id,
          userId: app.userId,
          firstName: data.firstName || app.user?.fullName?.split(' ')[0] || 'N/A',
          lastName: data.lastName || app.user?.fullName?.split(' ').slice(1).join(' ') || '',
          email: data.email || '',
          gender: data.gender || 'OTHER',
          monthlyIncome: data.monthlyIncome || '0',
          currentDistrict: data.currentDistrict || app.user?.registrationCity || '',
          currentState: data.currentState || app.user?.registrationState || '',
          status: app.status,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
          user: app.user,
          creator: app.creator,
          payment: {
            status: app.paymentStatus === 'SUCCESS' ? 'PAID' : 'PENDING',
            amount: app.paymentAmount,
            razorpayPaymentId: app.razorpayPaymentId,
            razorpayOrderId: app.razorpayOrderId
          },
          isUnified: true
        };
      });

      const allApps = [...legacyApps, ...mappedUnified].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const total = allApps.length;
      const paginatedApps = allApps.slice(skip, skip + take);

      await logAction({ userId: adminId, action: "VIEW_MEMBERSHIP_APPLICATIONS", tenantId });

      res.json({
        success: true,
        data: {
          members: paginatedApps,
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
      let application = await prisma.membershipApplication.findUnique({
        where: { id: applicationId },
        include: {
          user: { select: { id: true, mobile: true, fullName: true, profilePhoto: true } },
          payment: true,
          education: true,
          sector: true,
          jobRole: true,
          documents: true
        }
      });

      if (!application) {
        const unified = await prisma.application.findUnique({
          where: { id: applicationId },
          include: {
            user: { select: { id: true, mobile: true, fullName: true, identity: true, profilePhoto: true, registrationCity: true, registrationState: true, registrationPincode: true } },
            creator: { select: { id: true, fullName: true, identity: true } }
          }
        });

        if (unified && unified.targetIdentity === 'MEMBER') {
          const data = unified.submittedData || {};
          application = {
            id: unified.id,
            userId: unified.userId,
            firstName: data.firstName || unified.user?.fullName?.split(' ')[0],
            lastName: data.lastName || unified.user?.fullName?.split(' ').slice(1).join(' '),
            email: data.email || '',
            gender: data.gender || 'OTHER',
            dateOfBirth: data.birthDate || data.dateOfBirth,
            maritalStatus: data.maritalStatus || 'SINGLE',
            citizenship: data.citizenship || 'Indian',
            isMigrantWorker: !!data.isMigrantWorker,
            monthlyIncome: data.monthlyIncome || '0',
            currentAddress: data.currentAddress || '',
            currentDistrict: data.currentDistrict || '',
            currentState: data.currentState || '',
            currentPincode: data.currentPincode || '',
            permanentAddress: data.permanentAddress || '',
            permanentDistrict: data.permanentDistrict || '',
            permanentState: data.permanentState || '',
            permanentPincode: data.permanentPincode || '',
            status: unified.status,
            createdAt: unified.createdAt,
            updatedAt: unified.updatedAt,
            user: unified.user,
            creator: unified.creator,
            payment: {
              status: unified.paymentStatus === 'SUCCESS' ? 'PAID' : 'PENDING',
              amount: unified.paymentAmount,
              razorpayPaymentId: unified.razorpayPaymentId,
              razorpayOrderId: unified.razorpayOrderId,
              paidAt: unified.approvedAt
            },
            documents: data.documents || [],
            isUnified: true
          };
        }
      }

      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }

      await logAction({ userId: adminId, action: "VIEW_MEMBERSHIP_APPLICATION", targetId: applicationId, tenantId });
      res.json({ success: true, data: application });
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
      // Unified Application Support
      const unifiedApp = await prisma.application.findUnique({ where: { id: applicationId } });
      if (unifiedApp) {
        const applicationController = require("./application.controller");
        req.params.id = applicationId; // Map applicationId to id for the unified controller
        return await applicationController.approve(req, res);
      }


      // Check if user has permission to approve
      const admin = await prisma.user.findUnique({
        where: { id: adminId }
      });

      const canApprove = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(adminIdentity) || 
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
      const topRoles = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'];
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

      const updated = await prisma.$transaction(async (tx) => {
        const updatedApplication = await tx.membershipApplication.update({
          where: { id: applicationId },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            approvedBy: adminId
          }
        });

        await tx.user.update({
          where: { id: application.userId },
          data: {
            fullName: `${application.firstName} ${application.lastName}`,
            email: application.email,
            gender: application.gender.toUpperCase(),
            userType: 'MEMBER',
            identity: 'MEMBER',
            approvalStatus: 'APPROVED',
            approvedAt: new Date(),
            roleId: null,
            registrationPincode: application.currentPincode,
            registrationState: application.currentState,
            registrationCity: application.currentDistrict
          }
        });

        const existingWallet = await tx.wallet.findUnique({
          where: { userId: application.userId }
        });
        if (!existingWallet) {
          await tx.wallet.create({
            data: {
              id: generateUuid(),
              userId: application.userId,
              tenantId,
              isCorporate: false,
              balance: 0,
              currency: "INR",
              isActive: true
            }
          });
        }

        const adminWallet =
          (await tx.wallet.findFirst({
            where: { tenantId, isCorporate: true }
          })) ||
          (await tx.wallet.create({
            data: {
              id: generateUuid(),
              userId: null,
              tenantId,
              isCorporate: true,
              balance: 0,
              currency: "INR",
              isActive: true
            }
          }));

        const settlementAmount = Number(application.payment?.amount || 0);

        if (adminWallet && settlementAmount > 0) {
          const modeLabel = application.payment?.method || application.paymentType || 'UNKNOWN';
          console.log(
            `[Commission-Debug][MEMBERSHIP] Admin wallet credit start: applicationId=${application.id}, userId=${application.userId}, amount=${settlementAmount}, walletId=${adminWallet.id}, mode=${modeLabel}, subServiceLookup=membership_fee`
          );

          await tx.wallet.update({
            where: { id: adminWallet.id },
            data: { balance: { increment: settlementAmount } }
          });

          await tx.walletTransaction.create({
            data: {
              id: generateUuid(),
              walletId: adminWallet.id,
              amount: settlementAmount,
              type: "CREDIT",
              category: "SERVICE_CHARGE",
              status: "SUCCESS",
              referenceId: application.id,
              description: `Membership fee received from user ${application.userId} (via ${modeLabel})`,
              tenantId,
              metadata: {
                trigger: "MEMBERSHIP_APPROVAL",
                applicationId,
                userId: application.userId,
                paymentId: application.payment?.id
              }
            }
          });

          const subService = await tx.commissionSubService.findFirst({
            where: {
              OR: [
                { slug: "membership_fee" },
                { name: { contains: "membership", mode: "insensitive" } },
                { name: { contains: "member", mode: "insensitive" } }
              ]
            }
          });

          if (subService) {
            console.log(
              `[Commission-Debug][MEMBERSHIP] Commission distribution start: applicationId=${application.id}, userId=${application.userId}, amount=${settlementAmount}, subServiceId=${subService.id}, subServiceSlug=${subService.slug || "N/A"}`
            );
            await commissionService.processCommission(
              settlementAmount,
              subService.id,
              application.userId,
              null,
              tx,
              {
                referenceId: application.id,
                referenceType: "MEMBERSHIP_APPLICATION",
                stopAtUserId: application.createdById || null
              }
            );
            console.log(
              `[Commission-Debug][MEMBERSHIP] Commission distribution finished: applicationId=${application.id}, userId=${application.userId}, amount=${settlementAmount}`
            );
          } else {
            console.log(
              `[Commission-Debug][MEMBERSHIP] Commission distribution skipped: subService not found for applicationId=${application.id}`
            );
          }
        }

        return updatedApplication;
      });

      await logAction({
        userId: adminId,
        action: "MEMBERSHIP_APPLICATION_APPROVED",
        targetId: applicationId,
        tenantId,
        metadata: { userId: application.userId }
      });

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

    try {
      const unifiedApp = await prisma.application.findUnique({ where: { id: applicationId } });
      if (unifiedApp) {
        const applicationController = require("./application.controller");
        req.params.id = applicationId; // Map applicationId to id for the unified controller
        return await applicationController.reject(req, res);
      }

      const application = await prisma.membershipApplication.findUnique({
        where: { id: applicationId }
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
    const { user_id: adminId, tenant_id: tenantId } = req.user;
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
          name: name.trim(), tenantId
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
    const { tenant_id: tenantId } = req.user;
    try {
      const educations = await prisma.education.findMany({
        where: { tenantId },
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
    const { user_id: adminId, tenant_id: tenantId } = req.user || {};
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
          imageUrl: imageUrl || null,
          tenantId
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
    const { tenant_id: tenantId } = req.user;
    try {
      const sectors = await prisma.sector.findMany({
        where: { tenantId },
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
    const { user_id: adminId, tenant_id: tenantId } = req.user || {};
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
          imageUrl: imageUrl || null,
          tenantId
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
    const { tenant_id: tenantId } = req.user;
    try {
      const jobRoles = await prisma.jobRole.findMany({
        where: { tenantId },
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
    const { user_id: adminId, tenant_id: tenantId } = req.user || {};
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
          jobRoleId,
          tenantId
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
    const { tenant_id: tenantId } = req.user;
    try {
      const skills = await prisma.skill.findMany({
        where: { tenantId },
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
    const { user_id: adminId, tenant_id: tenantId } = req.user;
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
          name: name.trim(), tenantId
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
    const { tenant_id: tenantId } = req.user;
    try {
      const documentTypes = await prisma.documentType.findMany({
        where: { tenantId },
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
