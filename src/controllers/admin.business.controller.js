const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");
const bcrypt = require("bcrypt");
const { logAction } = require("../utils/audit");
const walletService = require("../services/wallet.service");
const razorpayService = require("../services/razorpay.service");
const commissionService = require("../services/commission.service");

const businessPartnerController = {
  /**
   * Add a business facility (e.g. WiFi, Parking) - Placeholder
   */
  addFacility: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId } = req.user;
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Name is required" });

    try {
      const facility = await prisma.jobFacility.create({
        data: {
          id: generateUuid(),
          name,
          icon: icon || null,
          isActive: true,
          tenantId
        }
      });
      res.json({ success: true, message: "Facility added successfully", data: facility });
    } catch (err) {
      console.error(err);
      if (err.code === 'P2002') {
        return res.status(400).json({ success: false, message: "Facility with this name already exists" });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getFacilities: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    try {
      const facilities = await prisma.jobFacility.findMany({
        where: { 
          isActive: true,
          tenantId
        },
        orderBy: { name: 'asc' }
      });
      res.json({ success: true, data: facilities });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Set Business Partner Fee
   */
  updateBusinessPartnerFee: async (req, res) => {
    const { gst, id, includedExcluded, platformFee, serviceCharges, amount } = req.body;
    
    // Legacy support
    const legacyAmount = amount;

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
    } else if (legacyAmount) {
      calculatedAmount = parseFloat(legacyAmount);
    }

    if (!calculatedAmount || calculatedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount or fee configuration" });
    }

    let payloadValue = calculatedAmount.toString();
    if (serviceCharges !== undefined) {
      payloadValue = JSON.stringify({
        gst: g,
        id: id || generateUuid(),
        includedExcluded: isInclusive,
        platformFee: pf,
        serviceCharge: sc,
        amount: calculatedAmount
      });
    }

    try {
      const tenantId = req.user?.tenant_id || req.user?.tenantId;
      const setting = await prisma.globalSetting.upsert({
        where: { 
          key_tenantId: { key: 'BUSINESS_PARTNER_FEE', tenantId } 
        },
        update: { value: payloadValue },
        create: { 
          id: generateUuid(),
          key: 'BUSINESS_PARTNER_FEE', 
          value: payloadValue,
          tenantId
        }
      });

      res.json({ success: true, message: "Business Partner fee updated successfully", data: setting, amount: calculatedAmount });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get Business Partner Fee
   */
  getBusinessPartnerFee: async (req, res) => {
    try {
      const tenantId = req.user?.tenant_id || req.user?.tenantId;
      const setting = await prisma.globalSetting.findFirst({
        where: { key: 'BUSINESS_PARTNER_FEE', tenantId }
      });

      let feeData = { amount: 2000 };
      if (setting && setting.value) {
        try {
          const parsed = JSON.parse(setting.value);
          feeData = { ...parsed };
          if (feeData.serviceCharges) {
            feeData.serviceCharge = feeData.serviceCharges;
          }
        } catch (e) {
          feeData = { amount: parseFloat(setting.value) };
        }
      }
      res.json({ success: true, ...feeData });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  createApplication: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const body = req.body;

    try {
      let targetUserId = body.userId;
      let targetUser = null;

      if (!prisma.user) {
        throw new Error("Prisma Client is not fully initialized. Models (user) not found.");
      }

      // Case 1: Existing User ID provided
      if (targetUserId) {
        targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });
        if (targetUser.identity === 'BUSINESS_PARTNER') return res.status(400).json({ success: false, message: "User is already a BUSINESS_PARTNER" });
      } 
      // Case 2: No User ID provided, creating for a NEW person (Admin/Partner led)
      else if (body.contactNumber1 && body.ownerName) {
        targetUser = await prisma.user.findFirst({ where: { mobile: body.contactNumber1, tenantId } });
        
        if (targetUser) {
          if (targetUser.identity === 'BUSINESS_PARTNER') return res.status(400).json({ success: false, message: "User is already a BUSINESS_PARTNER" });
        } else {
          // BRAND NEW USER CREATION
          if (body.flowType === "ADMIN_CREATE_NEW_USER" && !body.password) {
            return res.status(400).json({ success: false, message: "Password is required for new accounts" });
          }

          const creator = await prisma.user.findUnique({ where: { id: adminId }, select: { id: true, path: true } });
          const path = creator.path ? `${creator.path}/${creator.id}` : `/${creator.id}`;
          
          const mobileForPass = body.contactNumber1 || "0000";
          const defaultPassword = (mobileForPass.length >= 4) ? mobileForPass.slice(-4) : "1234";
          const passwordToHash = body.password || defaultPassword;
          const hashedPassword = await bcrypt.hash(passwordToHash, 10);

          targetUser = await prisma.user.create({
            data: {
              id: generateUuid(),
              mobile: body.contactNumber1,
              fullName: body.ownerName,
              email: body.email,
              password: hashedPassword,
              gender: "OTHER",
              dateOfBirth: new Date(),
              identity: 'USER',
              tenantId,
              parentId: adminId,
              path,
              registrationState: body.liveState || null,
              registrationCity: body.liveCity || null,
              registrationPincode: body.livePincode || null,
              registrationAddress: body.liveAddress ? {
                addressType: "URBAN",
                country: body.liveCountry || "India",
                state: body.liveState,
                city: body.liveCity,
                pinCode: body.livePincode,
                addressLine1: body.liveAddress
              } : undefined
            }
          });
        }
        targetUserId = targetUser.id;
      }

      if (!targetUserId) {
        return res.status(400).json({ success: false, message: "userId or contactNumber1/ownerName is required" });
      }

      const partnerRoles = ['COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER', 'SAATHI'];
      if (partnerRoles.includes(adminIdentity)) {
        if (targetUser.parentId !== adminId && (!targetUser.path || !targetUser.path.includes(adminId))) {
          return res.status(403).json({ 
            success: false, 
            message: "You can only create Business Partner applications for users in your own hierarchy." 
          });
        }
      }

      const existingApplication = await prisma.businessPartnerApplication.findFirst({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' }
      });

      if (existingApplication && (existingApplication.status === 'PENDING' || existingApplication.status === 'APPROVED')) {
        return res.status(400).json({
          success: false,
          message: `Business Partner application already exists. Status: ${existingApplication.status}.`,
          status: existingApplication.status
        });
      }

      const shouldUpdateExisting = existingApplication && existingApplication.status === 'REJECTED';
      const isPaidResubmission = existingApplication && existingApplication.status === 'REJECTED';

      const feeSetting = await prisma.globalSetting.findFirst({ 
        where: { key: 'BUSINESS_PARTNER_FEE', tenantId } 
      });
      let amount = 2000;
      if (feeSetting && feeSetting.value) {
        try {
          const parsed = JSON.parse(feeSetting.value);
          amount = parsed.amount || 2000;
          if (!parsed.serviceCharge && parsed.serviceCharges) {
            parsed.serviceCharge = parsed.serviceCharges;
          }
        } catch (e) {
          amount = parseFloat(feeSetting.value);
        }
      }
      
      let paymentMethod = body.paymentMode === 1 ? 'RAZORPAY' : (body.paymentMode === 2 ? 'WALLET' : 'CASH');
      let razorpayOrder = null;

      if (paymentMethod === 'RAZORPAY') {
        try {
          razorpayOrder = await razorpayService.createOrder(tenantId, amount, 'INR', `biz_direct_${targetUserId.slice(0, 8)}`);
        } catch (err) {
          return res.status(500).json({ success: false, message: "Failed to create Razorpay order." });
        }
      }

      let partnerWallet = null;
      let adminWallet = null;

      if (!isPaidResubmission && (paymentMethod === 'WALLET' || paymentMethod === 'CASH')) {
        partnerWallet = await walletService.resolveWallet(adminId, tenantId, adminIdentity);
        adminWallet = await walletService.resolveWallet(null, tenantId, 'ADMIN');

        if (paymentMethod === 'WALLET') {
          if (!partnerWallet || partnerWallet.balance < amount) {
            paymentMethod = 'RAZORPAY';
            try {
              const receiptId = `biz_fb_${(targetUserId || 'new').slice(0, 8)}_${Date.now()}`;
              razorpayOrder = await razorpayService.createOrder(tenantId, amount, 'INR', receiptId);
            } catch (err) {
              const errorMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
              console.error("[BPDirect] Razorpay Fallback Initialization Failed:", errorMsg);
              return res.status(400).json({ success: false, message: `Insufficient wallet balance and failed to initialize Razorpay fallback: ${errorMsg}` });
            }
          }
        }
      }

      const application = await prisma.$transaction(async (tx) => {
        const appData = {
          businessName: body.businessName || "N/A",
          brandName: body.brandName || "N/A",
          ownerName: body.ownerName || targetUser.fullName || "N/A",
          email: body.email || targetUser.email,
          contactNumber1: body.contactNumber1 || targetUser.mobile,
          contactNumber2: body.contactNumber2,
          companyLogoName: body.companyLogoName,
          companyLogoBase64: body.companyLogoBase64,
          companyLogoUrl: body.companyLogoUrl,
          sectorId: body.sectorId,
          bussinessType: body.bussinessType || 0,
          employeerType: body.employeerType || 0,
          serviceCharges: body.serviceCharges ? parseFloat(body.serviceCharges) : 0,
          gst: body.gst ? parseFloat(body.gst) : 0,
          platformFees: body.platformFees ? parseFloat(body.platformFees) : 0,
          amount: amount,
          razorPayReferenceNo: razorpayOrder ? razorpayOrder.id : (body.razorPayReferenceNo || null),
          paymentMode: paymentMethod === 'RAZORPAY' ? 1 : (paymentMethod === 'WALLET' ? 2 : 3),
          addressJson: body.address || null,
          documentsJson: body.documents || null,
          status: 'PENDING',
          createdById: adminId
        };

        let appResult;
        if (shouldUpdateExisting) {
          appResult = await tx.businessPartnerApplication.update({
            where: { id: existingApplication.id },
            data: { ...appData, rejectionReason: null }
          });
        } else {
          appResult = await tx.businessPartnerApplication.create({
            data: { ...appData, id: generateUuid(), userId: targetUserId }
          });
        }

        if (partnerWallet && adminWallet && (paymentMethod === 'WALLET' || paymentMethod === 'CASH')) {
          await walletService.payCreationFeeWithHistory(
            partnerWallet.id, adminWallet.id, amount, "Business Partner Application Fee",
            appResult.id, tenantId, paymentMethod, tx, false
          );
        }
        return appResult;
      }, { timeout: 30000 });

      res.status(201).json({
        success: true,
        message: paymentMethod === 'RAZORPAY' ? "Application created. Please complete payment." : "Application created successfully.",
        data: { 
          applicationId: application.id,
          razorpayOrder: (paymentMethod === 'RAZORPAY' && razorpayOrder) ? {
            ...razorpayOrder,
            key: await razorpayService.getKeyId(tenantId)
          } : null
        }
      });

      await logAction({
        userId: adminId,
        action: "BUSINESS_PARTNER_APP_CREATED",
        targetId: application.id,
        tenantId,
        metadata: { userId: targetUserId, businessName: application.businessName }
      });
    } catch (err) {
      console.error("[BPDirect] Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getApplications: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    try {
      const legacyApps = await prisma.businessPartnerApplication.findMany({
        where: { user: { tenantId } },
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      });

      const unifiedWhere = {
        targetIdentity: 'BUSINESS_PARTNER'
      };
      if (req.user.identity !== 'SUPER_ADMIN') {
        unifiedWhere.tenantId = tenantId;
      }

      const unifiedApps = await prisma.application.findMany({
        where: unifiedWhere,
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      });


      const mappedUnified = unifiedApps.map(app => {
        const data = app.submittedData || {};
        return {
          id: app.id,
          userId: app.userId,
          businessName: data.businessName || 'N/A',
          ownerName: data.ownerName || app.user?.fullName || 'N/A',
          status: app.status,
          createdAt: app.createdAt,
          user: app.user,
          isUnified: true
        };
      });

      const allApps = [...legacyApps, ...mappedUnified].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json({ success: true, data: allApps });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  getApplicationById: async (req, res) => {
    const { applicationId } = req.params;
    try {
      let application = await prisma.businessPartnerApplication.findUnique({
        where: { id: applicationId },
        include: { user: true }
      });

      if (!application) {
        const unified = await prisma.application.findUnique({
          where: { id: applicationId },
          include: { user: true }
        });

        if (unified && unified.targetIdentity === 'BUSINESS_PARTNER') {
          const data = unified.submittedData || {};
          application = {
            id: unified.id,
            userId: unified.userId,
            businessName: data.businessName || 'N/A',
            brandName: data.brandName || 'N/A',
            ownerName: data.ownerName || unified.user?.fullName,
            email: data.email || unified.user?.email,
            contactNumber1: data.contactNumber1 || unified.user?.mobile,
            status: unified.status,
            createdAt: unified.createdAt,
            user: unified.user,
            addressJson: data.address || null,
            documentsJson: data.documents || [],
            isUnified: true
          };
        }
      }

      if (!application) return res.status(404).json({ success: false, message: "Application not found" });
      res.json({ success: true, data: application });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  approveApplication: async (req, res) => {
    const { applicationId } = req.params;
    const { user_id: adminId, identity: adminIdentity, tenant_id: tenantId } = req.user;

    try {
      const unifiedApp = await prisma.application.findUnique({ where: { id: applicationId } });
      if (unifiedApp) {
        const applicationController = require("./application.controller");
        req.params.id = applicationId; // Map applicationId to id for the unified controller
        return await applicationController.approve(req, res);

      }

      const application = await prisma.businessPartnerApplication.findUnique({
        where: { id: applicationId },
        include: { user: true }
      });

      if (!application || application.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: "Application not eligible for approval" });
      }

      // 1. Permission Check (Admin or Delegated Partner)
      const isTopAdmin = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(adminIdentity);
      if (!isTopAdmin) {
        const approver = await prisma.user.findUnique({ where: { id: adminId } });
        if (!approver.canApproveSaathi) { 
          return res.status(403).json({ success: false, message: "No approval permission" });
        }
        if (application.user.parentId !== adminId && (!application.user.path || !application.user.path.includes(adminId))) {
          return res.status(403).json({ success: false, message: "You can only approve applications within your own hierarchy." });
        }
      }

      // 3. Finalize Approval
      await prisma.$transaction([
        prisma.user.update({
          where: { id: application.userId },
          data: { 
            identity: 'BUSINESS_PARTNER',
            registrationPincode: application.addressJson?.pincode || application.addressJson?.currentPincode,
            registrationState: application.addressJson?.state || application.addressJson?.currentState,
            registrationCity: application.addressJson?.district || application.addressJson?.currentDistrict
          }
        }),
        prisma.businessPartnerApplication.update({
          where: { id: applicationId },
          data: { status: 'APPROVED', approvedBy: adminId }
        })
      ]);

      await prisma.businessProfile.upsert({
        where: { userId: application.userId },
        create: {
          id: generateUuid(),
          userId: application.userId,
          businessName: application.businessName || 'Business',
          brandName: application.brandName || application.businessName || 'Business',
          ownerName: application.ownerName || '',
          email: application.email || '',
          contactNumber1: application.contactNumber1 || '',
          contactNumber2: application.contactNumber2 || null,
          companyLogoUrl: application.companyLogoUrl || application.companyLogoBase64 || null,
          sectorId: application.sectorId,
          businessType: Number(application.bussinessType || 0),
          employerType: Number(application.employeerType || 0),
          serviceCharges: Number(application.serviceCharges || 0),
          gst: Number(application.gst || 0),
          platformFees: Number(application.platformFees || 0),
          address: application.addressJson || null
        },
        update: {
          businessName: application.businessName || 'Business',
          brandName: application.brandName || application.businessName || 'Business',
          ownerName: application.ownerName || '',
          email: application.email || '',
          contactNumber1: application.contactNumber1 || '',
          contactNumber2: application.contactNumber2 || null,
          companyLogoUrl: application.companyLogoUrl || application.companyLogoBase64 || null,
          sectorId: application.sectorId,
          businessType: Number(application.bussinessType || 0),
          employerType: Number(application.employeerType || 0),
          serviceCharges: Number(application.serviceCharges || 0),
          gst: Number(application.gst || 0),
          platformFees: Number(application.platformFees || 0),
          address: application.addressJson || null
        }
      });

      // 4. Ensure Personal Wallet exists for the new Business Partner
      try {
        const walletService = require("../services/wallet.service");
        await walletService.createWallet(application.userId, tenantId, false);
      } catch (walletErr) {
        console.log(`[Wallet] Personal wallet for Business Partner already exists or creation failed: ${walletErr.message}`);
      }

      // --- COMMISSION DISTRIBUTION & ADMIN CREDIT ---
      try {
        await prisma.$transaction(async (tx) => {
          const adminWallet = await tx.wallet.findFirst({
            where: { tenantId, isCorporate: true }
          }) || await tx.wallet.create({
            data: {
              id: generateUuid(),
              userId: null,
              tenantId,
              isCorporate: true,
              balance: 0,
              currency: "INR",
              isActive: true
            }
          });

          if (adminWallet && application.amount > 0) {
            const modeMap = { 1: 'RAZORPAY', 2: 'WALLET', 3: 'CASH' };
            const modeLabel = modeMap[application.paymentMode] || 'UNKNOWN';

            await tx.wallet.update({
              where: { id: adminWallet.id },
              data: { balance: { increment: application.amount } }
            });

            await tx.walletTransaction.create({
              data: {
                id: generateUuid(),
                walletId: adminWallet.id,
                amount: application.amount,
                type: "CREDIT",
                category: "SERVICE_CHARGE",
                status: "SUCCESS",
                description: `Business Partner fee received (via ${modeLabel})`,
                referenceId: application.id,
                tenantId,
                metadata: { trigger: "BUSINESS_APPROVAL", applicationId: application.id, userId: application.userId }
              }
            });

            const subService = await tx.commissionSubService.findFirst({
              where: {
                OR: [
                  { slug: "business_partner_fee" },
                  { name: { contains: "business", mode: "insensitive" } }
                ]
              }
            });

            if (subService) {
              await commissionService.processCommission(
                application.amount, subService.id, application.userId, null, tx,
                { referenceId: application.id, referenceType: "BUSINESS_APPLICATION" }
              );
            }
          }
        });
      } catch (commErr) {
        console.error("BP commission failed:", commErr);
      }
      // -------------------------------

      res.json({ success: true, message: "Business Partner approved successfully." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  rejectApplication: async (req, res) => {
    const { applicationId } = req.params;
    const { user_id: adminId, identity: adminIdentity, tenant_id: tenantId } = req.user;
    const { reason } = req.body;

    try {
      const unifiedApp = await prisma.application.findUnique({ where: { id: applicationId } });
      if (unifiedApp) {
        const applicationController = require("./application.controller");
        req.params.id = applicationId;
        return await applicationController.reject(req, res);
      }

      const application = await prisma.businessPartnerApplication.findUnique({
        where: { id: applicationId },
        include: { user: true }
      });

      if (!application) return res.status(404).json({ success: false, message: "Application not found" });

      const isTopAdmin = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(adminIdentity);
      if (!isTopAdmin) {
        const approver = await prisma.user.findUnique({ where: { id: adminId } });
        if (!approver.canApproveSaathi) {
          return res.status(403).json({ success: false, message: "No rejection permission" });
        }
        if (application.user.parentId !== adminId && (!application.user.path || !application.user.path.includes(adminId))) {
          return res.status(403).json({ success: false, message: "You can only reject applications in your hierarchy." });
        }
      }

      await prisma.businessPartnerApplication.update({
        where: { id: applicationId },
        data: { status: 'REJECTED', rejectionReason: reason, approvedBy: adminId }
      });

      await logAction({
        userId: adminId, action: "BUSINESS_APPLICATION_REJECTED", targetId: applicationId,
        tenantId, metadata: { reason, userId: application.userId }
      });

      res.json({ success: true, message: "Application rejected successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  verifyPayment: async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, applicationId } = req.body;
    const { tenant_id: tenantId } = req.user;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !applicationId) {
      return res.status(400).json({ success: false, message: "Missing required payment details" });
    }

    try {
      const application = await prisma.businessPartnerApplication.findUnique({ where: { id: applicationId } });
      if (!application) return res.status(404).json({ success: false, message: "Application not found" });

      if (application.razorPayReferenceNo !== razorpay_order_id) {
        return res.status(400).json({ success: false, message: "Order ID mismatch" });
      }

      const isMockPayment =
        process.env.NODE_ENV !== 'production' &&
        String(razorpay_order_id || '').startsWith('mock_order_');

      const isValid = isMockPayment
        ? true
        : await razorpayService.verifyPaymentSignature(tenantId, { razorpay_order_id, razorpay_payment_id, razorpay_signature });
      if (!isValid) return res.status(400).json({ success: false, message: "Invalid signature" });

      await prisma.businessPartnerApplication.update({
        where: { id: applicationId },
        data: { razorPayReferenceNo: razorpay_payment_id, paymentMode: 1 }
      });

      res.json({ success: true, message: "Payment verified successfully." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = businessPartnerController;
