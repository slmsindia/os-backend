const prisma = require("../lib/prisma");
const bcrypt = require("bcrypt");
const { generateUuid } = require("../utils/id");
const { logAction } = require("../utils/audit");
const walletService = require("../services/wallet.service");
const razorpayService = require("../services/razorpay.service");
const commissionService = require("../services/commission.service");

const resolveWhiteLabelRootId = async (adminId, adminIdentity, tenantId) => {
  if (String(adminIdentity || "").toUpperCase() === "WHITE_LABEL_ADMIN") {
    return adminId;
  }

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { path: true }
  });

  const pathIds = String(admin?.path || "")
    .split("/")
    .map((id) => id.trim())
    .filter(Boolean);

  if (pathIds.length === 0) {
    return adminId;
  }

  const whiteLabelAncestors = await prisma.user.findMany({
    where: {
      tenantId,
      identity: "WHITE_LABEL_ADMIN",
      id: { in: pathIds }
    },
    select: { id: true }
  });

  const ancestorSet = new Set(whiteLabelAncestors.map((row) => row.id));
  const rootId = pathIds.find((id) => ancestorSet.has(id));
  return rootId || adminId;
};

const recordTargetWalletFeeFlow = async ({ db, tenantId, userId, applicationId, amount, paymentMethod, label }) => {
  const feeAmount = Number(amount || 0);
  if (!tenantId || !userId || !applicationId || feeAmount <= 0) return null;

  const targetWallet =
    (await db.wallet.findUnique({ where: { userId } })) ||
    (await db.wallet.create({
      data: {
        id: generateUuid(),
        userId,
        tenantId,
        isCorporate: false,
        balance: 0,
        currency: "INR",
        isActive: true
      }
    }));

  const existingCredit = await db.walletTransaction.findFirst({
    where: {
      walletId: targetWallet.id,
      referenceId: applicationId,
      type: "CREDIT",
      category: "SERVICE_CHARGE"
    }
  });

  if (!existingCredit) {
    await db.wallet.update({
      where: { id: targetWallet.id },
      data: { balance: { increment: feeAmount } }
    });
    await db.walletTransaction.create({
      data: {
        id: generateUuid(),
        walletId: targetWallet.id,
        amount: feeAmount,
        type: "CREDIT",
        category: "SERVICE_CHARGE",
        status: "SUCCESS",
        description: `${label} payment received via ${paymentMethod}`,
        referenceId: applicationId,
        tenantId,
        metadata: { trigger: `${label.toUpperCase().replace(/\s+/g, "_")}_TARGET_CREDIT`, applicationId, userId }
      }
    });
  }

  const existingDebit = await db.walletTransaction.findFirst({
    where: {
      walletId: targetWallet.id,
      referenceId: applicationId,
      type: "DEBIT",
      category: "SERVICE_CHARGE"
    }
  });

  if (!existingDebit) {
    await db.wallet.update({
      where: { id: targetWallet.id },
      data: { balance: { decrement: feeAmount } }
    });
    await db.walletTransaction.create({
      data: {
        id: generateUuid(),
        walletId: targetWallet.id,
        amount: feeAmount,
        type: "DEBIT",
        category: "SERVICE_CHARGE",
        status: "SUCCESS",
        description: `${label} Application Fee (Paid via ${paymentMethod})`,
        referenceId: applicationId,
        tenantId,
        metadata: { trigger: `${label.toUpperCase().replace(/\s+/g, "_")}_TARGET_DEBIT`, applicationId, userId }
      }
    });
  }

  return targetWallet;
};

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
      // Standard logic: 
      // Inclusive: User pays (Service Charge + Platform Fee). GST is considered already inside Service Charge.
      // Exclusive: User pays (Service Charge + Platform Fee + GST on Service Charge).
      if (isInclusive) {
          calculatedAmount = sc + pf;
      } else {
          calculatedAmount = sc + (sc * g / 100) + pf;
      }
    } else if (legacyAmount) {
      calculatedAmount = parseFloat(legacyAmount);
    }

    if (calculatedAmount === undefined || calculatedAmount === null || isNaN(calculatedAmount) || calculatedAmount < 0) {
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
          key_tenantId: { key: 'SAATHI_FEE', tenantId } 
        },
        update: { value: payloadValue },
        create: { 
          id: generateUuid(),
          key: 'SAATHI_FEE', 
          value: payloadValue,
          tenantId
        }
      });

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
      const tenantId = req.user?.tenant_id || req.user?.tenantId;
      const setting = await prisma.globalSetting.findFirst({
        where: { key: 'SAATHI_FEE', tenantId }
      });
      
      let feeData = { amount: 1000 };
      if (setting && setting.value) {
        try {
          const parsed = JSON.parse(setting.value);
          feeData = { ...parsed };
          // Standardize serviceCharges to serviceCharge for frontend
          if (feeData.serviceCharges) {
            feeData.serviceCharge = feeData.serviceCharges;
          }
        } catch (e) {
          feeData = { amount: parseFloat(setting.value) };
        }
      }
      res.json({ 
        success: true, 
        data: feeData,
        // For backward compatibility
        ...feeData 
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Admin/Partner Direct Saathi Creation
   */
  createSaathiDirectly: async (req, res) => {
    console.log("[SaathiDirect-Debug] Incoming Request Body:", JSON.stringify(req.body, null, 2));
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    let { userId: providedUserId, fullName, mobile, email, gender, dateOfBirth, address, paymentMethod, liveAddress, liveCity, liveState, livePincode, liveCountry } = req.body;

    try {
      // 1. Get Target User (or create if new)
      let targetUserId = providedUserId;
      let targetUser = null;
      const adminUser = await prisma.user.findUnique({
        where: { id: adminId },
        select: { mobile: true }
      });
      const whiteLabelRootId = await resolveWhiteLabelRootId(adminId, adminIdentity, tenantId);
      const isProvidedUser = Boolean(providedUserId);
      const requestMode = isProvidedUser ? "EXISTING_USER" : (mobile ? "NEW_MOBILE" : "INVALID");

      console.log(
        `[SaathiDirect-Debug] Mode=${requestMode} | admin=${adminId} (${adminIdentity}) | tenant=${tenantId} | providedUserId=${providedUserId || "none"} | mobile=${mobile || "none"} | whiteLabelRootId=${whiteLabelRootId}`
      );

      if (isProvidedUser) {
        targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });
        if (targetUser.identity === 'SAATHI') return res.status(400).json({ success: false, message: "User is already a SAATHI" });
        console.log(
          `[SaathiDirect-Debug] Existing user loaded: user=${targetUser.id}, identity=${targetUser.identity}, parentId=${targetUser.parentId || "none"}, path=${targetUser.path || "none"}`
        );
      } else if (mobile) {
        targetUser = await prisma.user.findFirst({
          where: {
            mobile,
            tenantId,
            OR: [
              { id: whiteLabelRootId },
              { path: { contains: whiteLabelRootId } }
            ]
          }
        });
        console.log(
          `[SaathiDirect-Debug] Mobile lookup result: ${targetUser ? `found user=${targetUser.id}, identity=${targetUser.identity}, parentId=${targetUser.parentId || "none"}, path=${targetUser.path || "none"}` : "no existing user found in this white-label tree"}`
        );
        if (targetUser) {
          if (targetUser.identity === 'SAATHI') {
            return res.status(400).json({ success: false, message: "User is already a SAATHI" });
          }
          targetUserId = targetUser.id;
        } else {
          // BRAND NEW USER CREATION
          if (req.body.flowType === "ADMIN_CREATE_NEW_USER" && !req.body.password && !mobile) {
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
              path,
              registrationState: liveState || null,
              registrationCity: liveCity || null,
              registrationPincode: livePincode || null,
              registrationAddress: liveAddress ? {
                addressType: "URBAN",
                country: liveCountry || "India",
                state: liveState,
                city: liveCity,
                pinCode: livePincode,
                addressLine1: liveAddress
              } : undefined
            }
          });
          targetUserId = targetUser?.id;
        }
      }

      if (!targetUserId) {
        return res.status(400).json({ success: false, message: "Either userId or mobile is required" });
      }

      // 2. Self-target protection and hierarchy validation
      // Saathi direct onboarding is only meant for creating a new user under the current admin,
      // not for converting the admin's own account in place.
      // Exception: If the logged-in user is a MEMBER or USER, they are upgrading their own account to Saathi.
      const isSelfUpgrade = ['MEMBER', 'USER'].includes(String(adminIdentity || '').toUpperCase());
      const isSelfTarget =
        targetUser?.id === adminId ||
        String(targetUser?.mobile || '').trim() === String(adminUser?.mobile || '').trim();
      if (isSelfTarget && !isSelfUpgrade) {
        return res.status(400).json({
          success: false,
          message: "Use a different mobile number to create a new Saathi under your hierarchy."
        });
      }

      // Only validate hierarchy when we are attaching an already-existing user.
      const partnerRoles = ['COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'];
      if (isProvidedUser && partnerRoles.includes(adminIdentity)) {
        console.log(
          `[SaathiDirect-Debug] Hierarchy validation for existing-user attach: targetId=${targetUser.id}, isSelfTarget=${isSelfTarget}, targetParentId=${targetUser.parentId || "none"}, adminId=${adminId}, targetPath=${targetUser.path || "none"}`
        );
        if (targetUser.parentId !== adminId && (!targetUser.path || !targetUser.path.includes(adminId))) {
          console.log(
            `[SaathiDirect-Debug] Hierarchy blocked: existing user is not inside admin branch. This only applies when userId is supplied.`
          );
          return res.status(403).json({ success: false, message: "You can only onboard Saathi in your own hierarchy" });
        }
      } else if (!isProvidedUser) {
        console.log("[SaathiDirect-Debug] Fresh mobile creation detected, hierarchy attach check skipped.");
      }

      // 3. Payment Validation & Transaction
      // 3. Check for existing application to avoid duplicates
      const existingApplication = await prisma.saathiApplication.findFirst({
        where: { userId: targetUserId },
        include: { payment: true },
        orderBy: { createdAt: 'desc' }
      });

      // BLOCK if already PENDING or APPROVED
      const existingPaymentStatus = String(existingApplication?.payment?.status || '').toUpperCase();
      const existingPaymentMethod = String(existingApplication?.paymentType || existingApplication?.payment?.method || '').toUpperCase();
      const isLegacyRazorpayDraft =
        existingApplication?.status === 'PENDING' &&
        existingPaymentMethod === 'RAZORPAY' &&
        existingPaymentStatus !== 'SUCCESS';
      const isAwaitingPaymentDraft =
        existingApplication?.status === 'PAYMENT_PENDING' || isLegacyRazorpayDraft;

      if (existingApplication && existingApplication.status === 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: `Saathi application already exists. Status: ${existingApplication.status}. You cannot re-apply unless rejected.`,
          status: existingApplication.status
        });
      }

      if (existingApplication && existingApplication.status === 'PENDING' && !isLegacyRazorpayDraft) {
        return res.status(400).json({
          success: false,
          message: `Saathi application already exists. Status: ${existingApplication.status}. You cannot re-apply unless rejected.`,
          status: existingApplication.status
        });
      }

      const isPaidResubmission = existingApplication && 
                                existingApplication.status === 'REJECTED' && 
                                (existingApplication.payment?.status === 'SUCCESS' || existingApplication.payment?.status === 'PAID');

      // Update stale Razorpay drafts in place so users can switch payment methods safely.
      const shouldUpdateExisting = isPaidResubmission || isAwaitingPaymentDraft;

      // 4. Payment Validation & Transaction
      const feeSetting = await prisma.globalSetting.findFirst({ 
        where: { key: 'SAATHI_FEE', tenantId } 
      });
      let amount = 1000;
      if (feeSetting && feeSetting.value) {
        try {
          const parsed = JSON.parse(feeSetting.value);
          amount = parsed.amount || 1000;
          // Support both names during transition
          if (!parsed.serviceCharge && parsed.serviceCharges) {
            parsed.serviceCharge = parsed.serviceCharges;
          }
        } catch (e) {
          amount = parseFloat(feeSetting.value);
        }
      }

      const isWhiteLabelAdmin = String(adminIdentity || '').toUpperCase() === 'WHITE_LABEL_ADMIN';
      const allowedPaymentMethods = adminIdentity === 'USER'
        ? ['RAZORPAY']
        : (isWhiteLabelAdmin ? ['CASH', 'RAZORPAY'] : ['WALLET', 'RAZORPAY']);

      if (amount > 0 && !allowedPaymentMethods.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message: adminIdentity === 'USER'
            ? 'SELF_APPLY users can only use RAZORPAY for saathi registration.'
            : isWhiteLabelAdmin
            ? 'WHITE_LABEL_ADMIN can only use CASH or RAZORPAY for saathi registration.'
            : 'This role can only use WALLET or RAZORPAY for saathi registration.'
        });
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

        console.log(`[SaathiDirect-Debug] adminId=${adminId}, tenantId=${tenantId}, identity=${adminIdentity}`);
        console.log(`[SaathiDirect-Debug] partnerWallet resolved:`, partnerWallet ? `id=${partnerWallet.id}, balance=${partnerWallet.balance}` : 'NULL');
        console.log(`[SaathiDirect-Debug] Required amount: ${amount}`);

        if (paymentMethod === 'WALLET' && (!partnerWallet || partnerWallet.balance < amount)) {
          paymentMethod = 'RAZORPAY';
          try {
            const receiptId = `saathi_fb_${(targetUserId || 'new').slice(0, 8)}_${Date.now()}`;
            razorpayOrder = await razorpayService.createOrder(tenantId, amount, 'INR', receiptId);
          } catch (err) {
            const errorMsg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
            console.error("[SaathiDirect] Razorpay Fallback Initialization Failed:", errorMsg);
            return res.status(400).json({
              success: false,
              message: `Insufficient wallet balance and failed to initialize Razorpay fallback: ${errorMsg}`
            });
          }
        }

        if (paymentMethod === 'WALLET') {
          if (!partnerWallet) {
            return res.status(400).json({ success: false, message: "Wallet not found for your account. Please contact admin." });
          }
          if (partnerWallet.balance < amount) {
            return res.status(400).json({ 
              success: false, 
              message: `Insufficient wallet balance. Required: ₹${amount}, Available: ₹${partnerWallet.balance}. Please top up your wallet or use CASH payment.` 
            });
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
          profilePhoto: req.body.profilePhoto || targetUser.profilePhoto || null,
          addressesJson: req.body.addresses || null,
          documentsJson: req.body.documents || null,
          createdById: adminId,
          paymentType: paymentMethod,
          status: paymentMethod === 'RAZORPAY' ? 'PAYMENT_PENDING' : 'PENDING'
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

        if (paymentMethod === 'WALLET' || paymentMethod === 'CASH') {
          await recordTargetWalletFeeFlow({
            db: tx,
            tenantId,
            userId: targetUserId,
            applicationId: appResult.id,
            amount,
            paymentMethod,
            label: "Saathi"
          });
        }

        return appResult;
      }, {
        timeout: 30000 // 30 seconds
      });

      res.status(201).json({
        success: true,
        message: paymentMethod === 'RAZORPAY' ? "Saathi application created. Please complete payment." : "Saathi application created successfully.",
        data: { 
          applicationId: application.id, 
          userId: targetUserId,
          razorpayOrder: razorpayOrder ? {
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency || application.payment?.currency || 'INR',
            key: razorpayOrder.mock ? 'MOCK_RAZORPAY_KEY' : await razorpayService.getKeyId(tenantId),
            mock: Boolean(razorpayOrder.mock)
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
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const { page = 1, limit = 10, status, search } = req.query;
    
    try {
      const legacyWhere = {
        user: { tenantId },
        ...(status ? { status } : {}),
        ...(search ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search } }
          ]
        } : {})
      };

      const legacyApps = await prisma.saathiApplication.findMany({
        where: legacyWhere,
        include: { user: true, payment: true },
        orderBy: { createdAt: 'desc' }
      });

      const unifiedWhere = {
        targetIdentity: 'SAATHI',
        ...(status ? { status } : {}),
        ...(search ? {
          OR: [
            { user: { fullName: { contains: search, mode: 'insensitive' } } },
            { user: { mobile: { contains: search } } }
          ]
        } : {})
      };
      if (adminIdentity !== 'SUPER_ADMIN') {
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
          fullName: data.fullName || app.user?.fullName || 'N/A',
          mobile: data.mobile || app.user?.mobile || 'N/A',
          gender: data.gender || 'OTHER',
          status: app.status,
          createdAt: app.createdAt,
          user: app.user,
          payment: {
            status: app.paymentStatus === 'SUCCESS' ? 'SUCCESS' : 'PENDING',
            amount: app.paymentAmount,
            method: app.paymentStatus === 'SUCCESS' ? 'RAZORPAY' : 'UNKNOWN'
          },
          isUnified: true
        };
      });

      const allApps = [...legacyApps, ...mappedUnified].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const pageNum = Math.max(parseInt(page, 10) || 1, 1);
      const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
      const start = (pageNum - 1) * limitNum;
      const pagedApps = allApps.slice(start, start + limitNum);

      res.json({
        success: true,
        data: {
          applications: pagedApps,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: allApps.length,
            totalPages: Math.max(Math.ceil(allApps.length / limitNum), 1)
          }
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get Single Saathi Application
   */
  getSaathiApplicationById: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const { applicationId } = req.params;

    try {
      let application = await prisma.saathiApplication.findUnique({
        where: { id: applicationId },
        include: { user: true, payment: true }
      });

      if (!application) {
        const unified = await prisma.application.findUnique({
          where: { id: applicationId },
          include: { user: true }
        });

        if (unified && unified.targetIdentity === 'SAATHI') {
          const data = unified.submittedData || {};
          application = {
            id: unified.id,
            userId: unified.userId,
            fullName: data.fullName || unified.user?.fullName,
            mobile: data.mobile || unified.user?.mobile,
            gender: data.gender || 'OTHER',
            dateOfBirth: data.dateOfBirth,
            address: data.address || '',
            status: unified.status,
            createdAt: unified.createdAt,
            user: unified.user,
            payment: {
              status: unified.paymentStatus === 'SUCCESS' ? 'SUCCESS' : 'PENDING',
              amount: unified.paymentAmount,
              method: 'RAZORPAY'
            },
            addressesJson: data.addresses || [],
            documentsJson: data.documents || [],
            isUnified: true
          };
        }
      }

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
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const { applicationId } = req.params;

    try {
      const unifiedApp = await prisma.application.findUnique({ where: { id: applicationId } });
      if (unifiedApp) {
        const applicationController = require("./application.controller");
        req.params.id = applicationId; // Map applicationId to id for the unified controller
        return await applicationController.approve(req, res);

      }

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

      try {
        await prisma.saathiProfile.upsert({
          where: { userId: application.userId },
          create: {
            id: generateUuid(),
            userId: application.userId,
            applicationId: application.id,
            shopName: application.shopName || '',
            shopType: application.shopType || null,
            gstNumber: application.gstNumber || null,
            businessRegNumber: application.businessRegNumber || null,
            yearsOfExperience: application.yearsOfExperience ? parseInt(application.yearsOfExperience) : null,
            shopOpeningTime: application.shopOpeningTime || null,
            shopClosingTime: application.shopClosingTime || null,
            shopAddressLine: application.addressesJson?.[0]?.address || application.address || null,
            shopCity: application.addressesJson?.[0]?.district || application.addressesJson?.[0]?.currentDistrict || null,
            shopState: application.addressesJson?.[0]?.state || application.addressesJson?.[0]?.currentState || null,
            shopPincode: application.addressesJson?.[0]?.pinCode || application.addressesJson?.[0]?.currentPincode || null,
            shopCountry: application.addressesJson?.[0]?.country || 'India',
            shopAddressType: application.addressesJson?.[0]?.addressType !== undefined && application.addressesJson?.[0]?.addressType !== null
              ? String(application.addressesJson[0].addressType)
              : null,
            shopMunicipality: application.addressesJson?.[0]?.municipalityId || application.addressesJson?.[0]?.currentMunicipality || null,
            serviceCategory: application.sector || null,
            serviceType: application.jobRole || null,
            serviceName: application.membershipNumber || null
          },
          update: {
            applicationId: application.id,
            shopName: application.shopName || '',
            shopType: application.shopType || null,
            gstNumber: application.gstNumber || null,
            businessRegNumber: application.businessRegNumber || null,
            yearsOfExperience: application.yearsOfExperience ? parseInt(application.yearsOfExperience) : null,
            shopOpeningTime: application.shopOpeningTime || null,
            shopClosingTime: application.shopClosingTime || null,
            shopAddressLine: application.addressesJson?.[0]?.address || application.address || null,
            shopCity: application.addressesJson?.[0]?.district || application.addressesJson?.[0]?.currentDistrict || null,
            shopState: application.addressesJson?.[0]?.state || application.addressesJson?.[0]?.currentState || null,
            shopPincode: application.addressesJson?.[0]?.pinCode || application.addressesJson?.[0]?.currentPincode || null,
            shopCountry: application.addressesJson?.[0]?.country || 'India',
            shopAddressType: application.addressesJson?.[0]?.addressType !== undefined && application.addressesJson?.[0]?.addressType !== null
              ? String(application.addressesJson[0].addressType)
              : null,
            shopMunicipality: application.addressesJson?.[0]?.municipalityId || application.addressesJson?.[0]?.currentMunicipality || null,
            serviceCategory: application.sector || null,
            serviceType: application.jobRole || null,
            serviceName: application.membershipNumber || null
          }
        });
      } catch (profileErr) {
        console.error(`[Saathi] Profile upsert failed for application ${application.id}:`, profileErr);
      }

      // 4. Ensure Personal Wallet exists for the new Saathi
      try {
        const walletService = require("../services/wallet.service");
        await walletService.createWallet(application.userId, tenantId, false);
      } catch (walletErr) {
        console.log(`[Wallet] Personal wallet for Saathi already exists or creation failed: ${walletErr.message}`);
      }

      // --- COMMISSION DISTRIBUTION & ADMIN CREDIT ---
      try {
        const settlementAmount = Number(application.payment?.amount || application.amount || 0);

        if (settlementAmount > 0) {
          const modeLabel = application.payment?.method || application.paymentType || 'UNKNOWN';
          console.log(
            `[Commission-Debug][SAATHI] Admin wallet credit start: applicationId=${application.id}, userId=${application.userId}, amount=${settlementAmount}, mode=${modeLabel}, subServiceLookup=saathi_fee`
          );

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

            await tx.wallet.update({
              where: { id: adminWallet.id },
              data: { balance: { increment: settlementAmount } }
            });
            console.log(
              `[Commission-Debug][SAATHI] Admin wallet credited: applicationId=${application.id}, walletId=${adminWallet.id}, amount=${settlementAmount}`
            );

            await tx.walletTransaction.create({
              data: {
                id: generateUuid(),
                walletId: adminWallet.id,
                amount: settlementAmount,
                type: "CREDIT",
                category: "SERVICE_CHARGE",
                status: "SUCCESS",
                description: `Saathi fee received from user ${application.userId} (via ${modeLabel})`,
                referenceId: application.id,
                tenantId,
                metadata: {
                  trigger: "SAATHI_APPROVAL",
                  applicationId: application.id,
                  userId: application.userId,
                  paymentId: application.payment?.id
                }
              }
            });
          });

          try {
            const subService = await prisma.commissionSubService.findFirst({
              where: {
                OR: [
                  { slug: "saathi_fee" },
                  { name: { contains: "saathi", mode: "insensitive" } }
                ]
              }
            });

            if (subService) {
              console.log(
                `[Commission-Debug][SAATHI] Commission distribution start: applicationId=${application.id}, userId=${application.userId}, amount=${settlementAmount}, subServiceId=${subService.id}, subServiceSlug=${subService.slug || "N/A"}`
              );
              await commissionService.processCommission(
                settlementAmount,
                subService.id,
                application.userId,
                null,
                null,
                {
                  referenceId: application.id,
                  referenceType: "SAATHI_APPLICATION",
                  stopAtUserId: application.createdById || null
                }
              );
              console.log(
                `[Commission-Debug][SAATHI] Commission distribution finished: applicationId=${application.id}, userId=${application.userId}, amount=${settlementAmount}`
              );
            } else {
              console.log(
                `[Commission-Debug][SAATHI] Commission distribution skipped: subService not found for applicationId=${application.id}`
              );
            }
          } catch (commissionErr) {
            console.error("[Saathi] Commission processing failed after wallet credit:", commissionErr);
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

      const isMockPayment =
        process.env.NODE_ENV !== 'production' &&
        String(razorpay_order_id || '').startsWith('mock_order_');

      // Verify signature
      const isValid = isMockPayment
        ? true
        : await razorpayService.verifyPaymentSignature(
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

      await prisma.$transaction(async (tx) => {
        await tx.saathiPayment.update({
          where: { id: application.payment.id },
          data: {
            status: 'SUCCESS',
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            paidAt: new Date()
          }
        });

        await tx.saathiApplication.update({
          where: { id: application.id },
          data: { status: 'PENDING' }
        });

        await recordTargetWalletFeeFlow({
          db: tx,
          tenantId,
          userId: application.userId,
          applicationId: application.id,
          amount: application.payment.amount,
          paymentMethod: "RAZORPAY",
          label: "Saathi"
        });
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
