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
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Name is required" });

    try {
      const facility = await prisma.jobFacility.create({
        data: {
          id: generateUuid(),
          name,
          icon: icon || null,
          isActive: true
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
    try {
      const facilities = await prisma.jobFacility.findMany({
        where: { isActive: true },
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
        serviceCharges: sc,
        amount: calculatedAmount
      });
    }

    try {
      const setting = await prisma.globalSetting.upsert({
        where: { key: 'BUSINESS_PARTNER_FEE' },
        update: { value: payloadValue },
        create: { key: 'BUSINESS_PARTNER_FEE', value: payloadValue }
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
      const setting = await prisma.globalSetting.findUnique({
        where: { key: 'BUSINESS_PARTNER_FEE' }
      });

      let feeData = { amount: 2000 };
      if (setting && setting.value) {
        try {
          const parsed = JSON.parse(setting.value);
          feeData = { ...parsed };
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
        // No immediate upgrade, wait for admin approval
      } 
      // Case 2: No User ID provided, creating for a NEW person (Admin/Partner led)
      else if (body.contactNumber1 && body.ownerName) {
        // Check if a user with this contact number already exists
        targetUser = await prisma.user.findFirst({ where: { mobile: body.contactNumber1, tenantId } });
        
        if (targetUser) {
          if (targetUser.identity === 'BUSINESS_PARTNER') return res.status(400).json({ success: false, message: "User is already a BUSINESS_PARTNER" });
          // Existing user → no immediate upgrade, wait for approval
        } else {
          // BRAND NEW USER CREATION
          if (body.flowType === "ADMIN_CREATE_NEW_USER" && !body.password) {
            return res.status(400).json({ success: false, message: "Password is required for new accounts" });
          }

          const creator = await prisma.user.findUnique({ where: { id: adminId }, select: { id: true, path: true } });
          const path = creator.path ? `${creator.path}/${creator.id}` : `/${creator.id}`;
          
          // Use provided password or fallback to mobile last 4 digits
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
              identity: 'USER',  // Wait for admin approval
              tenantId,
              parentId: adminId,
              path
            }
          });
        }
        targetUserId = targetUser.id;
      }

      if (!targetUserId) {
        return res.status(400).json({ success: false, message: "userId or contactNumber1/ownerName is required" });
      }

      // Hierarchy Check for Partners
      const partnerRoles = ['COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'];
      if (partnerRoles.includes(adminIdentity)) {
        // Must be in creator's path or directly under them
        if (targetUser.parentId !== adminId && (!targetUser.path || !targetUser.path.includes(adminId))) {
          return res.status(403).json({ 
            success: false, 
            message: "You can only create Business Partner applications for users in your own hierarchy." 
          });
        }
      }




      // 3. Check for existing application to avoid duplicates
      const existingApplication = await prisma.businessPartnerApplication.findFirst({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' }
      });

      // BLOCK if already PENDING or APPROVED
      if (existingApplication && (existingApplication.status === 'PENDING' || existingApplication.status === 'APPROVED')) {
        return res.status(400).json({
          success: false,
          message: `Business Partner application already exists. Status: ${existingApplication.status}. You cannot re-apply unless rejected.`,
          status: existingApplication.status
        });
      }

      // We update ONLY if it's REJECTED (to reuse/overwrite)
      const shouldUpdateExisting = existingApplication && existingApplication.status === 'REJECTED';

      const isPaidResubmission = existingApplication && existingApplication.status === 'REJECTED';

      const feeSetting = await prisma.globalSetting.findUnique({ where: { key: 'BUSINESS_PARTNER_FEE' } });
      let amount = 2000;
      if (feeSetting && feeSetting.value) {
        try {
          const parsed = JSON.parse(feeSetting.value);
          amount = parsed.amount || 2000;
        } catch (e) {
          amount = parseFloat(feeSetting.value);
        }
      }
      
      const paymentMethod = body.paymentMode === 1 ? 'RAZORPAY' : (body.paymentMode === 2 ? 'WALLET' : 'CASH');

      // 4. Pre-create Razorpay Order OUTSIDE transaction to avoid DB timeouts
      let razorpayOrder = null;
      if (paymentMethod === 'RAZORPAY') {
        try {
          razorpayOrder = await razorpayService.createOrder(tenantId, amount, 'INR', `biz_direct_${targetUserId.slice(0, 8)}`);
        } catch (err) {
          console.error("Razorpay Order Error:", err);
          return res.status(500).json({ success: false, message: "Failed to create Razorpay order. Please check configuration." });
        }
      }

      // 4. Resolve wallets outside transaction to avoid potential deadlocks
      let partnerWallet = null;
      let adminWallet = null;

      if (!isPaidResubmission && (paymentMethod === 'WALLET' || paymentMethod === 'CASH')) {
        partnerWallet = await walletService.resolveWallet(adminId, tenantId, adminIdentity);
        adminWallet = await walletService.resolveWallet(null, tenantId, 'ADMIN');

        if (paymentMethod === 'WALLET') {
          if (!partnerWallet || partnerWallet.balance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
          }
        }
      }

      const application = await prisma.$transaction(async (tx) => {
        const appData = {
          businessName: body.businessName || "N/A",
          brandName: body.brandName || "N/A",
          ownerName: body.ownerName || "N/A",
          email: body.email,
          contactNumber1: body.contactNumber1,
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
          razorPayReferenceNo: body.razorPayReferenceNo,
          paymentMode: body.paymentMode !== undefined ? parseInt(body.paymentMode) : 1,
          addressJson: body.address || null,
          documentsJson: body.documents || null,
          status: 'PENDING',    // Wait for Admin approval
          createdById: adminId
        };


        let appResult;
        if (shouldUpdateExisting) {
          appResult = await tx.businessPartnerApplication.update({
            where: { id: existingApplication.id },
            data: { 
              ...appData, 
              rejectionReason: null,
              razorPayReferenceNo: razorpayOrder ? razorpayOrder.id : (appData.razorPayReferenceNo || null)
            }
          });
        } else {
          appResult = await tx.businessPartnerApplication.create({
            data: {
              ...appData,
              id: generateUuid(),
              userId: targetUserId,
              razorPayReferenceNo: razorpayOrder ? razorpayOrder.id : null
            }
          });
        }

        // Record history for Wallet/Cash payments immediately
        if (partnerWallet && adminWallet && (paymentMethod === 'WALLET' || paymentMethod === 'CASH')) {
          await walletService.payCreationFeeWithHistory(
            partnerWallet.id,
            adminWallet.id,
            amount,
            "Business Partner Application Fee",
            appResult.id,
            tenantId,
            paymentMethod,
            tx,
            false // creditAdminImmediately = false
          );
        }

        return appResult;
      }, {
        timeout: 10000 // 10 seconds
      });

      res.status(201).json({
        success: true,
        message: paymentMethod === 'RAZORPAY' ? "Business Partner application created. Please complete payment." : "Business Partner application created successfully.",
        data: { 
          applicationId: application.id,
          razorpayOrder: application.razorPayReferenceNo ? {
            id: application.razorPayReferenceNo,
            amount: application.amount,
            currency: 'INR',
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
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  getApplications: async (req, res) => {
    try {
      const applications = await prisma.businessPartnerApplication.findMany({
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: applications });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  getApplicationById: async (req, res) => {
    const { applicationId } = req.params;
    try {
      const application = await prisma.businessPartnerApplication.findUnique({
        where: { id: applicationId },
        include: { user: true }
      });
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

      // 2. Financial Credit to Admin Wallet
      // (Removed redundant credit here to prevent double credit; handled in commission block below)


      // 3. Finalize Approval
      await prisma.$transaction([
        prisma.user.update({
          where: { id: application.userId },
          data: { 
            identity: 'BUSINESS_PARTNER',
            // Sync location for Commission Scheme targeting
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

      // 4. Ensure Personal Wallet exists for the new Business Partner
      try {
        const walletService = require("../services/wallet.service");
        await walletService.createWallet(application.userId, tenantId, false);
      } catch (walletErr) {
        console.log(`[Wallet] Personal wallet for Business Partner already exists or creation failed: ${walletErr.message}`);
      }

      // --- COMMISSION DISTRIBUTION & ADMIN CREDIT ---
      try {
        const adminWallet = await prisma.wallet.findFirst({
          where: { tenantId, isCorporate: true }
        });

        if (adminWallet && (application.amount > 0)) {
          // 1. Credit the Admin Corporate Wallet for all methods
          // (Wallet/Cash/Razorpay payments now all credit Admin only upon approval)
          const modeMap = { 1: 'RAZORPAY', 2: 'WALLET', 3: 'CASH' };
          const modeLabel = modeMap[application.paymentMode] || 'UNKNOWN';

          await prisma.wallet.update({
            where: { id: adminWallet.id },
            data: { balance: { increment: application.amount } }
          });

          await prisma.walletTransaction.create({
            data: {
              id: generateUuid(),
              walletId: adminWallet.id,
              amount: application.amount,
              type: "CREDIT",
              category: "SERVICE_CHARGE",
              description: `Business Partner fee received from user ${application.userId} (via ${modeLabel})`,
              referenceId: application.id,
              tenantId
            }
          });
          console.log(`[Commission] Credited Admin Wallet (${adminWallet.id}) with amount: ${application.amount} (via ${modeLabel})`);

          // 2. Distribute
          const subService = await prisma.commissionSubService.findFirst({
            where: {
              OR: [
                { slug: "business_partner_fee" },
                { name: { contains: "business", mode: "insensitive" } },
                { name: { contains: "partner", mode: "insensitive" } }
              ]
            }
          });

          if (subService) {
             console.log(`[Commission] Found SubService for BP: ${subService.name}. Starting Cascading Distribution...`);
             await commissionService.processCommission(
                application.amount,
                subService.id,
                application.userId,
                prisma
             );
          } else {
             console.log("[Commission] WARNING: business_partner_fee SubService not found. Cannot distribute commission.");
          }
        }
      } catch (commErr) {
        console.error("BP commission failed:", commErr);
      }
      // -------------------------------
      // -------------------------------

      res.json({ success: true, message: "Business Partner approved successfully. Identity updated to BUSINESS_PARTNER." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  rejectApplication: async (req, res) => {
    const { applicationId } = req.params;
    const { user_id: adminId, identity: adminIdentity, tenant_id: tenantId } = req.user;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ success: false, message: "Rejection reason required" });

    try {
      const application = await prisma.businessPartnerApplication.findUnique({
        where: { id: applicationId },
        include: { user: true }
      });

      if (!application) return res.status(404).json({ success: false, message: "Application not found" });

      // 1. Permission Check
      const isTopAdmin = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(adminIdentity);
      if (!isTopAdmin) {
        const approver = await prisma.user.findUnique({ where: { id: adminId } });
        if (!approver.canApproveSaathi) { // Using same delegation for BP
          return res.status(403).json({ success: false, message: "No rejection permission" });
        }
        if (application.user.parentId !== adminId && (!application.user.path || !application.user.path.includes(adminId))) {
          return res.status(403).json({ success: false, message: "You can only reject applications within your own hierarchy." });
        }
      }

      await prisma.businessPartnerApplication.update({
        where: { id: applicationId },
        data: { status: 'REJECTED', rejectionReason: reason, approvedBy: adminId }
      });

      await logAction({
        userId: adminId,
        action: "BUSINESS_APPLICATION_REJECTED",
        targetId: applicationId,
        tenantId,
        metadata: { reason, userId: application.userId }
      });

      res.json({ success: true, message: "Application rejected successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  /**
   * Verify Razorpay Payment for Business Partner
   */
  verifyPayment: async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, applicationId } = req.body;
    const { tenant_id: tenantId } = req.user;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !applicationId) {
      return res.status(400).json({ success: false, message: "Missing required payment details" });
    }

    try {
      const application = await prisma.businessPartnerApplication.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }

      if (application.razorPayReferenceNo !== razorpay_order_id) {
        return res.status(400).json({ success: false, message: "Order ID mismatch" });
      }

      // Verify signature
      const isValid = await razorpayService.verifyPaymentSignature(
        tenantId,
        {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature
        }
      );

      if (!isValid) {
        return res.status(400).json({ success: false, message: "Invalid payment signature" });
      }

      // Update application (since BP doesn't have a separate payment model, we use BP app fields)
      await prisma.businessPartnerApplication.update({
        where: { id: applicationId },
        data: {
          razorPayReferenceNo: razorpay_payment_id, // Store payment ID now
          paymentMode: 1 // RAZORPAY
        }
      });

      // Log in Wallet History & Credit Admin Corporate Wallet
      try {
        const creator = await prisma.user.findUnique({ where: { id: application.createdById } });
        const partnerWallet = await walletService.resolveWallet(application.createdById, tenantId, creator?.identity);
        const adminWallet = await walletService.resolveWallet(null, tenantId, 'ADMIN');
        
        if (partnerWallet) {
          // Log debit for partner (Already paid via Razorpay, so just history)
          await prisma.walletTransaction.create({
            data: {
              id: generateUuid(),
              walletId: partnerWallet.id,
              amount: application.amount,
              type: "DEBIT",
              category: "SERVICE_CHARGE",
              description: `Business Partner Application Fee (Paid via RAZORPAY - Pending Approval)`,
              referenceId: application.id,
              tenantId: tenantId
            }
          });
        }
        
        console.log(`[Wallet] Razorpay verified for Business Partner ${application.id}. Admin credit will happen upon approval.`);
      } catch (logErr) {
        console.error("Failed to log Business Razorpay log/credit:", logErr);
      }

      await logAction({
        userId: req.user.user_id,
        action: "BUSINESS_PARTNER_PAYMENT_SUCCESS",
        targetId: application.id,
        metadata: { paymentId: razorpay_payment_id }
      });

      res.json({ success: true, message: "Payment verified successfully." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = businessPartnerController;
