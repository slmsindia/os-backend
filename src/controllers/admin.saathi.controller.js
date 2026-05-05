const prisma = require("../lib/prisma");
const bcrypt = require("bcrypt");
const { generateUuid } = require("../utils/id");
const { logAction } = require("../utils/audit");
const walletService = require("../services/wallet.service");
const razorpayService = require("../services/razorpay.service");
const commissionService = require("../services/commission.service");

const adminSaathiController = {
  /**
   * Set Saathi Fee
   */
  updateSaathiFee: async (req, res) => {
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
      const setting = prisma.globalSetting ? await prisma.globalSetting.upsert({
        where: { key: 'SAATHI_FEE' },
        update: { value: payloadValue },
        create: { key: 'SAATHI_FEE', value: payloadValue }
      }) : null;

      res.json({ success: true, message: "Saathi fee updated successfully", amount: calculatedAmount });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get Current Saathi Fee
   */
  getSaathiFee: async (req, res) => {
    try {
      const setting = await prisma.globalSetting.findUnique({
        where: { key: 'SAATHI_FEE' }
      });
      
      let feeData = { amount: 1000 };
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

  /**
   * Admin/Partner Direct Saathi Creation
   */
  createSaathiDirectly: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const { userId: providedUserId, fullName, mobile, email, gender, dateOfBirth, address, paymentMethod } = req.body;

    try {
      // 1. Get Target User (or create if new)
      let targetUserId = providedUserId;
      let targetUser = null;

      if (targetUserId) {
        targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });
        if (targetUser.identity === 'SAATHI') return res.status(400).json({ success: false, message: "User is already a SAATHI" });
        
        // No immediate upgrade, wait for admin approval
      } else if (mobile) {
        targetUser = await prisma.user.findFirst({ where: { mobile, tenantId } });
        if (targetUser) {
          if (targetUser.identity === 'SAATHI') return res.status(400).json({ success: false, message: "User is already a SAATHI" });
          
          // Update email if it's null and provided
          if (!targetUser.email && email) {
            targetUser = await prisma.user.update({
              where: { id: targetUser.id },
              data: { email }
            });
          }
        } else {
          // BRAND NEW USER CREATION
          if (req.body.flowType === "ADMIN_CREATE_NEW_USER" && !req.body.password) {
             return res.status(400).json({ success: false, message: "Password is required for new accounts" });
          }

          const creator = await prisma.user.findUnique({ where: { id: adminId }, select: { id: true, path: true } });
          const path = creator.path ? `${creator.path}/${creator.id}` : `/${creator.id}`;
          
          // Use provided password or fallback to mobile last 4 digits
          const defaultPassword = (mobile && mobile.length >= 4) ? mobile.slice(-4) : "1234";
          const passwordToHash = req.body.password || defaultPassword;
          const hashedPassword = await bcrypt.hash(passwordToHash, 10);

          targetUser = await prisma.user.create({
            data: {
              id: generateUuid(),
              mobile,
              fullName,
              email: email || null,
              gender: (gender || 'OTHER').toUpperCase(),
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
              password: hashedPassword,
              identity: 'USER',   // Wait for admin approval to become SAATHI
              tenantId,
              parentId: adminId,
              path
            }
          });
        }
        targetUserId = targetUser?.id;
      }

      if (!targetUserId) {
        return res.status(400).json({ success: false, message: "Either userId or mobile is required" });
      }

      // 2. Hierarchy and Role Validation

      const partnerRoles = ['COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'];
      if (partnerRoles.includes(adminIdentity)) {
        if (targetUser.parentId !== adminId && (!targetUser.path || !targetUser.path.includes(adminId))) {
          return res.status(403).json({ success: false, message: "You can only onboard Saathi in your own hierarchy" });
        }
      }

      // 3. Payment Validation & Transaction
      // 3. Check for existing application to avoid duplicates
      const existingApplication = await prisma.saathiApplication.findFirst({
        where: { userId: targetUserId },
        include: { payment: true },
        orderBy: { createdAt: 'desc' }
      });

      // BLOCK if already PENDING or APPROVED
      if (existingApplication && (existingApplication.status === 'PENDING' || existingApplication.status === 'APPROVED')) {
        return res.status(400).json({
          success: false,
          message: `Saathi application already exists. Status: ${existingApplication.status}. You cannot re-apply unless rejected.`,
          status: existingApplication.status
        });
      }

      const isPaidResubmission = existingApplication && 
                                existingApplication.status === 'REJECTED' && 
                                (existingApplication.payment?.status === 'SUCCESS' || existingApplication.payment?.status === 'PAID');

      // We update the existing record ONLY if it is REJECTED but already paid (Resubmission)
      const shouldUpdateExisting = isPaidResubmission;

      // 4. Payment Validation & Transaction
      const feeSetting = prisma.globalSetting ? await prisma.globalSetting.findUnique({ where: { key: 'SAATHI_FEE' } }) : null;
      let amount = 1000;
      if (feeSetting && feeSetting.value) {
        try {
          const parsed = JSON.parse(feeSetting.value);
          amount = parsed.amount || 1000;
        } catch (e) {
          amount = parseFloat(feeSetting.value);
        }
      }

      // 4. Pre-create Razorpay Order OUTSIDE transaction to avoid DB timeouts
      let razorpayOrder = null;
      if (paymentMethod === 'RAZORPAY') {
        try {
          razorpayOrder = await razorpayService.createOrder(tenantId, amount, 'INR', `saathi_direct_${targetUserId.slice(0, 8)}`);
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
          fullName: fullName || targetUser.fullName,
          mobile: mobile || targetUser.mobile,
          gender: (gender || targetUser.gender || 'OTHER').toUpperCase(),
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : targetUser.dateOfBirth,
          address: address || "",
          maritalStatus: req.body.maritalStatus || null,
          citizenship: req.body.citizenship || req.body.citizen || null,
          isMigrantWorker: Boolean(req.body.isMigrantWorker),
          incomeAboveThreshold: Boolean(req.body.incomeAboveThreshold),
          membershipNumber: req.body.membershipNumber || null,
          sector: req.body.sector || null,
          jobRole: req.body.jobRole || null,
          aadhaarNumber: req.body.aadhaarNumber || null,
          panNumber: req.body.panNumber || null,
          computerLiteracy: Boolean(req.body.computerLiteracy),
          internetAvailability: Boolean(req.body.internetAvailability),
          pcLaptopAvailability: Boolean(req.body.pcLaptopAvailability),
          kycStatus: Boolean(req.body.kycStatus),
          governmentSchemes: Boolean(req.body.governmentSchemes),
          travelServices: Boolean(req.body.travelServices),
          bankingInsurance: Boolean(req.body.bankingInsurance),
          jobServices: Boolean(req.body.jobServices),
          indoNepalServices: Boolean(req.body.indoNepalServices),
          shopName: req.body.shopName || null,
          addressesJson: req.body.addresses || null,
          documentsJson: req.body.documents || null,
          createdById: adminId,
          paymentType: paymentMethod,
          status: 'PENDING'   // Send to Admin for approval
        };

        let appResult;
        if (shouldUpdateExisting) {
          appResult = await tx.saathiApplication.update({
            where: { id: existingApplication.id },
            data: { 
              ...appData, 
              rejectionReason: null,
              payment: {
                upsert: {
                  create: {
                    id: generateUuid(),
                    amount,
                    method: paymentMethod,
                    razorpayOrderId: razorpayOrder ? razorpayOrder.id : null,
                    status: (paymentMethod === 'WALLET' || paymentMethod === 'CASH') ? 'SUCCESS' : 'PENDING',
                    paidAt: (paymentMethod === 'WALLET' || paymentMethod === 'CASH') ? new Date() : null
                  },
                  update: {
                    amount,
                    method: paymentMethod,
                    razorpayOrderId: razorpayOrder ? razorpayOrder.id : null,
                    status: (paymentMethod === 'WALLET' || paymentMethod === 'CASH') ? 'SUCCESS' : 'PENDING',
                    paidAt: (paymentMethod === 'WALLET' || paymentMethod === 'CASH') ? new Date() : null
                  }
                }
              }
            },
            include: { payment: true }
          });
        } else {
          appResult = await tx.saathiApplication.create({
            data: {
              ...appData,
              id: generateUuid(),
              userId: targetUserId,
              payment: {
                create: {
                  id: generateUuid(),
                  amount,
                  method: paymentMethod,
                  razorpayOrderId: razorpayOrder ? razorpayOrder.id : null,
                  status: (paymentMethod === 'WALLET' || paymentMethod === 'CASH') ? 'SUCCESS' : 'PENDING',
                  paidAt: (paymentMethod === 'WALLET' || paymentMethod === 'CASH') ? new Date() : null
                }
              }
            },
            include: { payment: true }
          });
        }

        // Record history for Wallet/Cash payments immediately
        if (partnerWallet && adminWallet && (paymentMethod === 'WALLET' || paymentMethod === 'CASH')) {
          await walletService.payCreationFeeWithHistory(
            partnerWallet.id,
            adminWallet.id,
            amount,
            "Saathi Application Fee",
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
        message: paymentMethod === 'RAZORPAY' ? "Saathi application created. Please complete payment." : "Saathi application created successfully.",
        data: { 
          applicationId: application.id, 
          userId: targetUserId,
          razorpayOrder: application.payment?.razorpayOrderId ? {
            id: application.payment.razorpayOrderId,
            amount: application.payment.amount,
            currency: application.payment.currency,
            key: await razorpayService.getKeyId(tenantId)
          } : null
        }
      });

    } catch (err) {
      console.error("[SaathiDirect] Error:", err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  /**
   * Get Saathi Applications
   */
  getSaathiApplications: async (req, res) => {
    const { user_id: adminId, identity: adminIdentity } = req.user;
    
    try {
      const admin = await prisma.user.findUnique({ where: { id: adminId } });
      const canView = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(adminIdentity) || 
                       admin.canApproveSaathi;

      if (!canView) {
        return res.status(403).json({ success: false, message: "Permission denied" });
      }

      const applications = await prisma.saathiApplication.findMany({
        include: { user: true, payment: true },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: applications });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get Single Saathi Application
   */
  getSaathiApplicationById: async (req, res) => {
    const { user_id: adminId, identity: adminIdentity } = req.user;
    const { applicationId } = req.params;

    try {
      const admin = await prisma.user.findUnique({ where: { id: adminId } });
      const canView = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(adminIdentity) || 
                       admin.canApproveSaathi;

      if (!canView) {
        return res.status(403).json({ success: false, message: "Permission denied" });
      }

      const application = await prisma.saathiApplication.findUnique({
        where: { id: applicationId },
        include: { user: true, payment: true }
      });

      if (!application) return res.status(404).json({ success: false, message: "Application not found" });

      res.json({ success: true, data: application });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Approve Saathi Application
   */
  approveApplication: async (req, res) => {
    const { user_id: adminId, identity: adminIdentity, tenant_id: tenantId } = req.user;
    const { applicationId } = req.params;

    try {
      const application = await prisma.saathiApplication.findUnique({
        where: { id: applicationId },
        include: { payment: true, user: true }
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
        // Hierarchy Check: Target user must be in approver's branch
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
            identity: 'SAATHI',
            // Sync location for Commission Scheme targeting
            registrationPincode: application.addressesJson?.[0]?.pincode || application.addressesJson?.[0]?.currentPincode,
            registrationState: application.addressesJson?.[0]?.state || application.addressesJson?.[0]?.currentState,
            registrationCity: application.addressesJson?.[0]?.district || application.addressesJson?.[0]?.currentDistrict
          }
        }),
        prisma.saathiApplication.update({
          where: { id: applicationId },
          data: { status: 'APPROVED', approvedBy: adminId }
        })
      ]);
      
      // 4. Ensure Personal Wallet exists for the new Saathi
      try {
        const walletService = require("../services/wallet.service");
        await walletService.createWallet(application.userId, tenantId, false);
      } catch (walletErr) {
        console.log(`[Wallet] Personal wallet for Saathi already exists or creation failed: ${walletErr.message}`);
      }

      // --- COMMISSION DISTRIBUTION & ADMIN CREDIT ---
      try {
        const adminWallet = await prisma.wallet.findFirst({
          where: { tenantId, isCorporate: true }
        });

        if (adminWallet && (application.payment?.amount > 0)) {
          // 1. Credit the Admin Corporate Wallet ONLY IF RAZORPAY
          // (Wallet/Cash payments are credited to Admin at application creation)
          // 1. Credit the Admin Corporate Wallet for all methods 
          // (Wallet/Cash/Razorpay payments now all credit Admin only upon approval)
          await prisma.wallet.update({
            where: { id: adminWallet.id },
            data: { balance: { increment: application.payment.amount } }
          });

          await prisma.walletTransaction.create({
            data: {
              id: generateUuid(),
              walletId: adminWallet.id,
              amount: application.payment.amount,
              type: "CREDIT",
              category: "SERVICE_CHARGE",
              description: `Saathi fee received from user ${application.userId} (via ${application.payment.method})`,
              referenceId: application.id,
              tenantId
            }
          });
          console.log(`[Commission] Credited Admin Wallet (${adminWallet.id}) with amount: ${application.payment.amount} (via ${application.payment.method})`);

          // 2. Distribute
          const subService = await prisma.commissionSubService.findFirst({
            where: {
              OR: [
                { slug: "saathi_fee" },
                { name: { contains: "saathi", mode: "insensitive" } }
              ]
            }
          });

          if (subService) {
             console.log(`[Commission] Found SubService for Saathi: ${subService.name}. Starting Cascading Distribution...`);
             await commissionService.processCommission(
                application.payment.amount,
                subService.id,
                application.userId,
                null,
                prisma
             );
          } else {
             console.log("[Commission] WARNING: saathi_fee SubService not found. Cannot distribute commission.");
          }
        }
      } catch (commErr) {
        console.error("Saathi commission failed:", commErr);
      }
      // -------------------------------

      res.json({ success: true, message: "Saathi approved successfully. Identity updated to SAATHI." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  /**
   * Reject Saathi Application
   */
  rejectApplication: async (req, res) => {
    const { user_id: adminId, identity: adminIdentity, tenant_id: tenantId } = req.user;
    const { applicationId } = req.params;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ success: false, message: "Rejection reason required" });

    try {
      const application = await prisma.saathiApplication.findUnique({
        where: { id: applicationId },
        include: { user: true }
      });

      if (!application) return res.status(404).json({ success: false, message: "Application not found" });

      // 1. Permission Check
      const isTopAdmin = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(adminIdentity);
      if (!isTopAdmin) {
        const approver = await prisma.user.findUnique({ where: { id: adminId } });
        if (!approver.canApproveSaathi) {
          return res.status(403).json({ success: false, message: "No rejection permission" });
        }
        if (application.user.parentId !== adminId && (!application.user.path || !application.user.path.includes(adminId))) {
          return res.status(403).json({ success: false, message: "You can only reject applications within your own hierarchy." });
        }
      }

      await prisma.saathiApplication.update({
        where: { id: applicationId },
        data: { status: 'REJECTED', rejectionReason: reason, approvedBy: adminId }
      });

      await logAction({
        userId: adminId,
        action: "SAATHI_APPLICATION_REJECTED",
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
   * Delegate Saathi Approval
   */
  delegateSaathiApproval: async (req, res) => {
    const { targetUserId, canApprove } = req.body;
    try {
      await prisma.user.update({
        where: { id: targetUserId },
        data: { canApproveSaathi: canApprove }
      });
      res.json({ success: true, message: "Saathi approval delegation updated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Verify Razorpay Payment for Saathi
   */
  verifyPayment: async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, applicationId } = req.body;
    const { tenant_id: tenantId } = req.user;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !applicationId) {
      return res.status(400).json({ success: false, message: "Missing required payment details" });
    }

    try {
      const application = await prisma.saathiApplication.findUnique({
        where: { id: applicationId },
        include: { payment: true, user: true }
      });

      if (!application || !application.payment) {
        return res.status(404).json({ success: false, message: "Application or payment record not found" });
      }

      if (application.payment.razorpayOrderId !== razorpay_order_id) {
        return res.status(400).json({ success: false, message: "Order ID mismatch" });
      }

      // Verify signature
      const isValid = await razorpayService.verifyPaymentSignature(
        application.user.tenantId,
        {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature
        }
      );

      if (!isValid) {
        await prisma.saathiPayment.update({
          where: { id: application.payment.id },
          data: { status: 'FAILED' }
        });
        return res.status(400).json({ success: false, message: "Invalid payment signature" });
      }

      // Update payment record
      await prisma.saathiPayment.update({
        where: { id: application.payment.id },
        data: {
          status: 'SUCCESS',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paidAt: new Date()
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
              amount: application.payment.amount,
              type: "DEBIT",
              category: "SERVICE_CHARGE",
              description: `Saathi Application Fee (Paid via RAZORPAY - Pending Approval)`,
              referenceId: application.id,
              tenantId: tenantId
            }
          });
        }

        console.log(`[Wallet] Razorpay verified for Saathi ${application.id}. Admin credit will happen upon approval.`);
      } catch (logErr) {
        console.error("Failed to log Saathi Razorpay log/credit:", logErr);
      }

      await logAction({
        userId: req.user.user_id,
        action: "SAATHI_PAYMENT_SUCCESS",
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

module.exports = adminSaathiController;
