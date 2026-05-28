const prisma = require("../lib/prisma");
const bcrypt = require("bcrypt");
const { generateUuid } = require("../utils/id");
const { logAction } = require("../utils/audit");
const walletService = require("../services/wallet.service");
const razorpayService = require("../services/razorpay.service");
const commissionService = require("../services/commission.service");

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLE_HIERARCHY = {
  SUPER_ADMIN: 100, WHITE_LABEL_ADMIN: 90, ADMIN: 80, SUB_ADMIN: 70,
  COUNTRY_HEAD: 60, STATE_PARTNER: 50, DISTRICT_PARTNER: 40,
  SAATHI: 30, BUSINESS_PARTNER: 25, MEMBER: 20, AGENT: 15, USER: 10
};

// WHITE_LABEL_ADMIN and ADMIN both use CASH or RAZORPAY for normal applications
// They go to the PENDING queue just like everyone else.
// Instant free upgrade only happens via the separate `convert` endpoint.
const ADMIN_CREATOR_ROLES   = ['WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'];
const PARTNER_CREATOR_ROLES = ['COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER', 'SAATHI'];
const ALL_ADMIN_ROLES       = ['SUPER_ADMIN', ...ADMIN_CREATOR_ROLES, ...PARTNER_CREATOR_ROLES];
const PASSWORD_RULE_MESSAGE = "Password must be at least 8 characters and include one uppercase letter and one special character.";
const isStrongPassword = (password) =>
  typeof password === "string" && /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
const generateTemporaryPassword = () => `Saathi@${Math.random().toString(36).slice(2, 8)}A`;

const sanitizeJsonValue = (value) => {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(sanitizeJsonValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, sanitizeJsonValue(item)])
    );
  }
  return value;
};

const toOptionalNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const buildGeoFields = (geolocation) => ({
  geoLat: toOptionalNumber(geolocation?.lat),
  geoLng: toOptionalNumber(geolocation?.lng),
  geoAccuracy: toOptionalNumber(geolocation?.accuracy),
  geoAddress: geolocation?.address || null,
  geoCapturedAt: geolocation?.capturedAt ? new Date(geolocation.capturedAt) : new Date()
});

const isUniqueConstraintError = (err, field) =>
  err?.code === "P2002" &&
  (!field || String(err?.meta?.target || "").toLowerCase().includes(field.toLowerCase()));

// ─── Fee Resolution ────────────────────────────────────────────────────────────
async function resolveFee(targetIdentity, tenantId) {
  if (targetIdentity === 'MEMBER') {
    const config = await prisma.membershipConfig.findFirst({ where: { isActive: true, tenantId }, orderBy: { createdAt: 'desc' } });
    return config ? config.membershipPrice : 100;
  }
  if (targetIdentity === 'SAATHI') {
    const s = await prisma.globalSetting.findFirst({ where: { key: 'SAATHI_FEE', tenantId } });
    if (s?.value) { try { return JSON.parse(s.value).amount || 1000; } catch { return parseFloat(s.value) || 1000; } }
    return 1000;
  }
  if (targetIdentity === 'BUSINESS_USER' || targetIdentity === 'BUSINESS_PARTNER') {
    const s = await prisma.globalSetting.findFirst({ where: { key: 'BUSINESS_PARTNER_FEE', tenantId } });
    if (s?.value) { try { return JSON.parse(s.value).amount || 2000; } catch { return parseFloat(s.value) || 2000; } }
    return 2000;
  }
  return 0; // Partners/admins created directly — no fee
}

// ─── Profile Creator (called on approval) ─────────────────────────────────────
async function createLayeredProfile(app, tx) {
  const db = tx || prisma;
  const data = app.submittedData || {};

  try {
    if (app.targetIdentity === 'MEMBER') {
      // Check if profile exists first to decide on applicationId strategy
      const existing = await db.memberProfile.findUnique({ where: { userId: app.userId } });
      
      await db.memberProfile.upsert({
        where: { userId: app.userId },
        create: {
          id: generateUuid(), userId: app.userId, applicationId: app.id,
          maritalStatus: data.maritalStatus, citizenship: data.citizenship,
          isMigrantWorker: !!data.isMigrantWorker, incomeAboveThreshold: !!data.incomeAboveThreshold,
          monthlyIncome: data.monthlyIncome, occupation: data.occupation,
          sectorId: data.sectorId, jobRoleId: data.jobRoleId, educationId: data.educationId,
          currentAddressLine: data.currentAddress, currentCity: data.currentDistrict,
          currentState: data.currentState, currentPincode: data.currentPincode,
          currentCountry: data.currentCountry || 'India', currentAddressType: data.currentAddressType,
          currentMunicipality: data.currentMunicipality,
          permanentAddressLine: data.permanentAddress, permanentCity: data.permanentDistrict,
          permanentState: data.permanentState, permanentPincode: data.permanentPincode,
          permanentCountry: data.permanentCountry || 'India', permanentAddressType: data.permanentAddressType,
          permanentMunicipality: data.permanentMunicipality,
          documents: data.documents || null, profilePhoto: data.profilePhoto || null,
          approvedAt: new Date()
        },
        update: { 
          approvedAt: new Date(), 
          // Only update applicationId if it's currently null or we are forcing it
          applicationId: app.id 
        }
      });
    }

    if (app.targetIdentity === 'SAATHI') {
      await db.saathiProfile.upsert({
        where: { userId: app.userId },
        create: {
          id: generateUuid(), userId: app.userId, applicationId: app.id,
          shopName: data.shopName, shopType: data.shopType, gstNumber: data.gstNumber,
          businessRegNumber: data.businessRegNumber, yearsOfExperience: data.yearsOfExperience ? parseInt(data.yearsOfExperience) : null,
          shopOpeningTime: data.shopOpeningTime, shopClosingTime: data.shopClosingTime,
          shopAddressLine: data.shopAddress, shopCity: data.shopCity,
          shopState: data.shopState, shopPincode: data.shopPincode,
          shopCountry: data.shopCountry || 'India', shopAddressType: data.shopAddressType,
          shopMunicipality: data.shopMunicipality,
          serviceCategory: data.serviceCategory, serviceType: data.serviceType, serviceName: data.serviceName,
          approvedAt: new Date()
        },
        update: { approvedAt: new Date(), applicationId: app.id }
      });
    }

    if (app.targetIdentity === 'BUSINESS_PARTNER' || app.targetIdentity === 'BUSINESS_USER') {
      await db.businessProfile.upsert({
        where: { userId: app.userId },
        create: {
          id: generateUuid(), userId: app.userId, applicationId: app.id,
          businessName: data.businessName || data.brandName || 'Business',
          brandName: data.brandName || data.businessName || 'Business',
          ownerName: data.ownerName || '',
          email: data.email || '',
          contactNumber1: data.contactNumber1 || '',
          contactNumber2: data.contactNumber2 || null,
          companyLogoUrl: data.companyLogoUrl || data.companyLogoBase64 || null,
          sectorId: data.sectorId,
          businessType: Number(data.bussinessType || 0),
          employerType: Number(data.employeerType || 0),
          serviceCharges: Number(data.serviceCharges || 0),
          gst: Number(data.gst || 0),
          platformFees: Number(data.platformFees || 0),
          address: data.address || null
        },
        update: {
          applicationId: app.id,
          businessName: data.businessName || 'Business',
          brandName: data.brandName || 'Business',
          address: data.address || null
        }
      });
    }
  } catch (err) {
    console.error(`[ProfileCreation] Failed for user ${app.userId}:`, err);
    // If it's a FK constraint violation on applicationId, try once more without it
    if (err.message.includes('Foreign key constraint violated')) {
      console.log('[ProfileCreation] Retrying without applicationId link...');
      try {
        if (app.targetIdentity === 'MEMBER') {
          await db.memberProfile.upsert({
            where: { userId: app.userId },
            create: { id: generateUuid(), userId: app.userId, approvedAt: new Date() },
            update: { approvedAt: new Date() }
          });
        }
      } catch (retryErr) {
        console.error('[ProfileCreation] Retry also failed:', retryErr);
      }
    }
    // Don't re-throw, we want the transaction to succeed even if profile creation is partial
  }
}

// ─── Identity Upgrade (called on approval) ─────────────────────────────────────
async function upgradeUserIdentity(userId, targetIdentity, applicationData, tenantId, tx, options = {}) {
  const db = tx || prisma;
  const skipWalletCreation = options.skipWalletCreation === true;
  const updatedUser = await db.user.update({
    where: { id: userId },
    data: {
      identity: targetIdentity,
      userType: targetIdentity,
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      // Sync location for commission targeting
      registrationState: applicationData.currentState,
      registrationCity: applicationData.currentDistrict,
      registrationPincode: applicationData.currentPincode
    }
  });
  // Ensure wallet exists
  if (!skipWalletCreation) {
    try { await walletService.createWallet(userId, tenantId, false); } catch {}
  }
  return updatedUser;
}

async function settleApplicationFeeToCorporateWallet(app, trigger = "APPLICATION_SETTLEMENT") {
  const settlementAmount = Number(app.paymentAmount || 0);
  if (!settlementAmount || settlementAmount <= 0 || app.paymentStatus !== "SUCCESS") {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const adminWallet =
      (await tx.wallet.findFirst({ where: { tenantId: app.tenantId, isCorporate: true } })) ||
      (await tx.wallet.create({
        data: {
          id: generateUuid(),
          userId: null,
          tenantId: app.tenantId,
          isCorporate: true,
          balance: 0,
          currency: "INR",
          isActive: true
        }
      }));

    const existingCredit = await tx.walletTransaction.findFirst({
      where: {
        walletId: adminWallet.id,
        referenceId: app.id,
        type: "CREDIT",
        category: "SERVICE_CHARGE"
      }
    });

    if (existingCredit) {
      return existingCredit;
    }

    await tx.wallet.update({
      where: { id: adminWallet.id },
      data: { balance: { increment: settlementAmount } }
    });

    return tx.walletTransaction.create({
      data: {
        id: generateUuid(),
        walletId: adminWallet.id,
        amount: settlementAmount,
        type: "CREDIT",
        category: "SERVICE_CHARGE",
        status: "SUCCESS",
        referenceId: app.id,
        description: `${app.targetIdentity} application fee received from user ${app.userId}`,
        tenantId: app.tenantId,
        metadata: sanitizeJsonValue({
          trigger,
          applicationId: app.id,
          userId: app.userId,
          paymentMethod: app.paymentMethod,
          razorpayPaymentId: app.razorpayPaymentId
        })
      }
    });
  });
}

async function safeSettleApplicationFeeToCorporateWallet(app, trigger) {
  try {
    return await settleApplicationFeeToCorporateWallet(app, trigger);
  } catch (err) {
    console.error(`[${trigger}] Wallet settlement failed for application ${app?.id}:`, err);
    return null;
  }
}

async function processApplicationCommissionOnce(app) {
  const settlementAmount = Number(app.paymentAmount || 0);
  if (!settlementAmount || settlementAmount <= 0 || app.paymentStatus !== "SUCCESS") {
    return null;
  }

  const existingCommission = await prisma.walletTransaction.findFirst({
    where: {
      referenceId: app.id,
      category: { in: ["COMMISSION", "COMMISSION_PAYOUT"] }
    },
    select: { id: true }
  });

  if (existingCommission) {
    return { success: true, duplicate: true };
  }

  const slugMap = { MEMBER: "membership_fee", SAATHI: "saathi_fee", BUSINESS_USER: "business_partner_fee", BUSINESS_PARTNER: "business_partner_fee" };
  const slug = slugMap[app.targetIdentity];
  if (!slug) return null;

  const subService = await prisma.commissionSubService.findFirst({
    where: { OR: [{ slug }, { name: { contains: slug.replace("_fee", ""), mode: "insensitive" } }] }
  });
  if (!subService) return null;

  return commissionService.processCommission(
    settlementAmount,
    subService.id,
    app.userId,
    null,
    null,
    {
      referenceId: app.id,
      referenceType: `${app.targetIdentity}_APPLICATION`,
      stopAtUserId: app.createdById || null
    }
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// CONTROLLER METHODS
// ═════════════════════════════════════════════════════════════════════════════
const applicationController = {

  // ── POST /api/applications/submit ──────────────────────────────────────────
  submit: async (req, res) => {
    const creatorId = req.user?.user_id || req.user?.id;
    const tenantId = req.user?.tenant_id || req.user?.tenantId || req.tenant_id;
    const creatorIdentity = req.user?.identity || req.user?.role;
    const { targetIdentity, targetMobile, targetUserId: explicitTargetId, geolocation, password, ...formData } = req.body;
    const submittedData = sanitizeJsonValue(formData);
    const geoFields = buildGeoFields(geolocation);

    if (!targetIdentity) return res.status(400).json({ success: false, message: "targetIdentity is required" });
    if (!creatorId || !tenantId || !creatorIdentity) {
      return res.status(401).json({ success: false, message: "Invalid session. Please login again." });
    }

    try {
      // ── 1. Resolve target user ──────────────────────────────────────────────
      let targetUser = null;
      if (explicitTargetId) {
        targetUser = await prisma.user.findUnique({ where: { id: explicitTargetId } });
      } else if (targetMobile) {
        targetUser = await prisma.user.findFirst({ where: { mobile: targetMobile, tenantId } });
        if (!targetUser) {
          const existingMobileUser = await prisma.user.findFirst({
            where: { mobile: targetMobile },
            select: { id: true, tenantId: true, identity: true }
          });
          if (existingMobileUser && existingMobileUser.tenantId !== tenantId) {
            return res.status(409).json({
              success: false,
              message: "This mobile number is already registered in another organization. Please use a different mobile number."
            });
          }
        }
      }

      if (!targetUser && !targetMobile) {
        // Self-apply
        targetUser = await prisma.user.findUnique({ where: { id: creatorId } });
      }

      // Update password for existing targetUser if provided
      // ── 2. Auto-create base USER if not found (admin/partner creating for new person) ──
      if (!targetUser && targetMobile && ALL_ADMIN_ROLES.includes(creatorIdentity)) {
        const passwordToHash = isStrongPassword(password) ? password : generateTemporaryPassword();

        const creator = await prisma.user.findUnique({ where: { id: creatorId }, select: { path: true } });
        const path = creator?.path ? `${creator.path}/${creatorId}` : `/${creatorId}`;
        const hashedPwd = await bcrypt.hash(passwordToHash, 10);
        try {
          targetUser = await prisma.user.create({
            data: {
              id: generateUuid(), mobile: targetMobile,
              fullName: `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || targetMobile,
              gender: (formData.gender || 'OTHER').toUpperCase(),
              dateOfBirth: formData.birthDate ? new Date(formData.birthDate) : new Date('1990-01-01'),
              password: hashedPwd, identity: 'USER', userType: 'USER',
              approvalStatus: 'APPROVED', tenantId, parentId: creatorId, path
            }
          });
        } catch (createErr) {
          if (isUniqueConstraintError(createErr, "mobile")) {
            return res.status(409).json({
              success: false,
              message: "This mobile number is already registered. Please search/select the existing user or use another mobile number."
            });
          }
          throw createErr;
        }
      }

      if (!targetUser) return res.status(404).json({ success: false, message: "Target user not found. Provide targetMobile or targetUserId." });

      // ── 3. Block if already has this or higher identity ─────────────────────
      const isSelfApply = targetUser.id === creatorId;
      const currentLevel = ROLE_HIERARCHY[targetUser.identity] || 0;
      const targetLevel  = ROLE_HIERARCHY[targetIdentity] || 0;
      const isAssistedMemberCreation =
        targetIdentity === 'MEMBER' &&
        !isSelfApply &&
        PARTNER_CREATOR_ROLES.includes(creatorIdentity);
      if (currentLevel >= targetLevel && !isAssistedMemberCreation) {
        return res.status(400).json({ success: false, message: `User already has identity ${targetUser.identity}. Use the Convert action to upgrade directly.` });
      }

      // ── 4. Block duplicate pending application ──────────────────────────────
      const duplicate = await prisma.application.findFirst({
        where: { userId: targetUser.id, targetIdentity, status: { in: ['PENDING', 'RESUBMITTED', 'PAYMENT_PENDING', 'APPROVED'] } }
      });
      if (duplicate?.status === 'APPROVED') {
        return res.status(400).json({ success: false, message: `${targetIdentity} already approved for this user.` });
      }
      if (duplicate?.status === 'PENDING' || duplicate?.status === 'RESUBMITTED') {
        return res.status(400).json({ success: false, message: `A pending ${targetIdentity} application already exists.` });
      }

      // ── 5. Resolve fee ───────────────────────────────────────────────────────
      const paidRejectedApplication = await prisma.application.findFirst({
        where: {
          userId: targetUser.id,
          targetIdentity,
          status: "REJECTED",
          paymentStatus: "SUCCESS"
        },
        orderBy: { updatedAt: "desc" }
      });

      if (paidRejectedApplication) {
        const resubmitted = await prisma.application.update({
          where: { id: paidRejectedApplication.id },
          data: {
            status: "RESUBMITTED",
            rejectionReason: null,
            submittedData,
            ...geoFields
          }
        });

        await logAction({
          userId: creatorId,
          action: `${targetIdentity}_APP_RESUBMITTED_PAYMENT_REUSED`,
          targetId: resubmitted.id,
          tenantId
        });

        return res.status(201).json({
          success: true,
          message: "Application resubmitted. Previous payment reused.",
          data: { applicationId: resubmitted.id, paymentReused: true }
        });
      }

      const fee = await resolveFee(targetIdentity, tenantId);

      if (duplicate?.status === 'PAYMENT_PENDING') {
        const method = (submittedData.paymentMethod || '').toUpperCase();
        const updatedApp = await prisma.application.update({
          where: { id: duplicate.id },
          data: {
            submittedData,
            paymentAmount: fee,
            ...geoFields
          }
        });

        if (fee === 0 || method === 'CASH') {
          const paidApp = await prisma.application.update({
            where: { id: updatedApp.id },
            data: {
              status: 'PENDING',
              paymentStatus: 'SUCCESS',
              paymentMethod: fee === 0 ? 'FREE' : 'CASH'
            }
          });
          await safeSettleApplicationFeeToCorporateWallet(paidApp, "APPLICATION_CASH_SUBMITTED");
          return res.status(201).json({ success: true, message: "Application submitted.", data: { applicationId: paidApp.id } });
        }

        if (updatedApp.razorpayOrderId && updatedApp.paymentMethod === 'RAZORPAY') {
          return res.status(201).json({
            success: true,
            message: "Please complete payment via Razorpay.",
            paymentMethod: 'RAZORPAY',
            data: {
              applicationId: updatedApp.id,
              orderId: updatedApp.razorpayOrderId,
              amount: fee,
              key: await razorpayService.getKeyId(tenantId)
            }
          });
        }

        try {
          const order = await razorpayService.createOrder(tenantId, fee, 'INR', `app_${updatedApp.id.slice(0, 20)}`);
          await prisma.application.update({
            where: { id: updatedApp.id },
            data: {
              razorpayOrderId: order.id,
              paymentStatus: 'PENDING',
              paymentMethod: 'RAZORPAY'
            }
          });
          return res.status(201).json({
            success: true,
            message: "Please complete payment via Razorpay.",
            paymentMethod: 'RAZORPAY',
            data: {
              applicationId: updatedApp.id,
              orderId: order.id,
              amount: fee,
              key: await razorpayService.getKeyId(tenantId)
            }
          });
        } catch (rzpErr) {
          console.error('[ExistingPendingPayment] Razorpay failed:', rzpErr.message);
          return res.status(400).json({
            success: false,
            message: "Razorpay initialization failed. Please try again.",
            error: rzpErr.message
          });
        }
      }

      // ── 6. ADMIN / WHITE_LABEL_ADMIN / SUB_ADMIN: Cash or Razorpay ──────────
      // All admin-level creators use the same payment flow and go to PENDING queue.
      // Instant (free) upgrade is only via the separate `convert` endpoint.
      if (ADMIN_CREATOR_ROLES.includes(creatorIdentity)) {
        const method = (formData.paymentMethod || '').toUpperCase();
        if (creatorIdentity === 'WHITE_LABEL_ADMIN') {
          if (!['CASH', 'RAZORPAY'].includes(method) && fee > 0) {
            return res.status(400).json({ success: false, message: "WHITE_LABEL_ADMIN can only use CASH or RAZORPAY for membership creation." });
          }
        } else if (!['CASH', 'RAZORPAY', 'WALLET'].includes(method) && fee > 0) {
          return res.status(400).json({ success: false, message: "ADMIN/SUB_ADMIN can only use CASH, RAZORPAY, or WALLET." });
        }

        const app = await prisma.application.create({
          data: {
            id: generateUuid(), userId: targetUser.id, createdById: creatorId, tenantId,
            targetIdentity, status: fee > 0 ? 'PAYMENT_PENDING' : 'PENDING',
            paymentMethod: method || 'CASH', paymentStatus: method === 'CASH' ? 'SUCCESS' : 'NONE',
            paymentAmount: fee,
            submittedData,
            ...geoFields
          }
        });

        if (method === 'CASH' || fee === 0) {
          const updatedApp = await prisma.application.update({ where: { id: app.id }, data: { status: 'PENDING', paymentStatus: 'SUCCESS' } });
          await safeSettleApplicationFeeToCorporateWallet(updatedApp, "APPLICATION_CASH_SUBMITTED");
          return res.status(201).json({ success: true, message: "Application submitted.", data: { applicationId: app.id } });
        }

        if (method === 'WALLET') {
          try {
            const wallet = await walletService.resolveWallet(creatorId, tenantId, creatorIdentity);
            if (!wallet || wallet.balance < fee) {
               return res.status(400).json({ success: false, message: "Insufficient corporate wallet balance." });
            }
            const adminWallet = await prisma.wallet.findFirst({ where: { tenantId, isCorporate: true } });
            await walletService.payCreationFeeWithHistory(
              wallet.id, adminWallet?.id, fee,
              `${targetIdentity} application fee`, app.id, tenantId, 'WALLET', prisma, false
            );
            const updatedApp = await prisma.application.update({ where: { id: app.id }, data: { status: 'PENDING', paymentStatus: 'SUCCESS', paymentMethod: 'WALLET' } });
            await processApplicationCommissionOnce(updatedApp);
            return res.status(201).json({ success: true, message: "Application submitted via corporate wallet.", data: { applicationId: app.id } });
          } catch (walletErr) {
            console.warn('[AdminWalletFallback] Wallet failed, falling back to Razorpay:', walletErr.message);
            try {
              const order = await razorpayService.createOrder(tenantId, fee, 'INR', `app_${app.id.slice(0, 20)}`);
              await prisma.application.update({
                where: { id: app.id },
                data: { razorpayOrderId: order.id, paymentStatus: 'PENDING', paymentMethod: 'RAZORPAY' }
              });
              return res.status(201).json({
                success: true,
                message: "Wallet payment failed. Please complete payment via Razorpay.",
                paymentMethod: 'RAZORPAY',
                data: {
                  applicationId: app.id,
                  orderId: order.id,
                  amount: fee,
                  key: await razorpayService.getKeyId(tenantId)
                }
              });
            } catch (rzpErr) {
              return res.status(400).json({
                success: false,
                message: "Wallet payment failed and Razorpay initialization also failed.",
                error: `${walletErr.message}; ${rzpErr.message}`
              });
            }
          }
        }

        // Razorpay for Admin
        try {
          const order = await razorpayService.createOrder(tenantId, fee, 'INR', `app_${app.id.slice(0, 20)}`);
          await prisma.application.update({ where: { id: app.id }, data: { razorpayOrderId: order.id, paymentStatus: 'PENDING' } });
          return res.status(201).json({
            success: true, message: "Application created. Complete Razorpay payment.",
            data: { applicationId: app.id, orderId: order.id, amount: fee, key: await razorpayService.getKeyId(tenantId) }
          });
        } catch (rzpErr) {
          console.error('[AdminPayment] Razorpay failed:', rzpErr.message);
          return res.status(400).json({ 
            success: false, 
            message: "Razorpay initialization failed. Please use CASH or WALLET.",
            error: rzpErr.message 
          });
        }
      }

      // ── 8. PARTNER/SAATHI/SELF: Wallet first, Razorpay fallback ────────────
      if (creatorIdentity === 'USER') {
        const method = (formData.paymentMethod || '').toUpperCase();
        if (fee > 0 && method !== 'RAZORPAY') {
          return res.status(400).json({ success: false, message: "SELF_APPLY users can only use RAZORPAY." });
        }

        const app = await prisma.application.create({
          data: {
            id: generateUuid(), userId: targetUser.id, createdById: creatorId, tenantId,
            targetIdentity, status: fee > 0 ? 'PAYMENT_PENDING' : 'PENDING',
            paymentMethod: 'RAZORPAY',
            paymentStatus: fee === 0 ? 'SUCCESS' : 'NONE', paymentAmount: fee,
            submittedData,
            ...geoFields
          }
        });

        if (fee === 0) {
          await prisma.application.update({ where: { id: app.id }, data: { status: 'PENDING', paymentStatus: 'SUCCESS', paymentMethod: 'FREE' } });
          return res.status(201).json({ success: true, message: "Application submitted (no fee).", data: { applicationId: app.id } });
        }

        try {
          const order = await razorpayService.createOrder(tenantId, fee, 'INR', `app_${app.id.slice(0, 20)}`);
          await prisma.application.update({ where: { id: app.id }, data: { razorpayOrderId: order.id, paymentStatus: 'PENDING', paymentMethod: 'RAZORPAY' } });
          return res.status(201).json({
            success: true,
            message: "Please complete payment via Razorpay.",
            paymentMethod: 'RAZORPAY',
            data: { applicationId: app.id, orderId: order.id, amount: fee, key: await razorpayService.getKeyId(tenantId) }
          });
        } catch (rzpErr) {
          console.error('[SelfApplyPayment] Razorpay failed:', rzpErr.message);
          return res.status(400).json({
            success: false,
            message: "Razorpay initialization failed. Please try again.",
            error: rzpErr.message
          });
        }
      }

      const app = await prisma.application.create({
        data: {
          id: generateUuid(), userId: targetUser.id, createdById: creatorId, tenantId,
          targetIdentity, status: 'PAYMENT_PENDING', paymentMethod: 'WALLET',
          paymentStatus: 'NONE', paymentAmount: fee,
          submittedData,
          ...geoFields
        }
      });

      if (fee === 0) {
        await prisma.application.update({ where: { id: app.id }, data: { status: 'PENDING', paymentStatus: 'SUCCESS', paymentMethod: 'FREE' } });
        return res.status(201).json({ success: true, message: "Application submitted (no fee).", data: { applicationId: app.id } });
      }

      // Try Wallet
      let walletSuccess = false;
      try {
        const wallet = await walletService.resolveWallet(creatorId, tenantId, creatorIdentity);
        if (wallet && wallet.balance >= fee) {
          const adminWallet = await prisma.wallet.findFirst({ where: { tenantId, isCorporate: true } });
          await walletService.payCreationFeeWithHistory(
            wallet.id, adminWallet?.id, fee,
            `${targetIdentity} application fee`, app.id, tenantId, 'WALLET', prisma, false
          );
          await prisma.application.update({ where: { id: app.id }, data: { status: 'PENDING', paymentStatus: 'SUCCESS', paymentMethod: 'WALLET' } });
          walletSuccess = true;
        }
      } catch (walletErr) {
        console.warn('[PaymentFallback] Wallet failed, falling back to Razorpay:', walletErr.message);
      }

      if (walletSuccess) {
        await logAction({ userId: creatorId, action: `${targetIdentity}_APP_WALLET_PAID`, targetId: app.id, tenantId });
        return res.status(201).json({
          success: true, message: "Application submitted via wallet.", paymentMethod: 'WALLET',
          data: { applicationId: app.id }
        });
      }

      // Razorpay fallback
      try {
        const order = await razorpayService.createOrder(tenantId, fee, 'INR', `app_${app.id.slice(0, 20)}`);
        await prisma.application.update({ where: { id: app.id }, data: { razorpayOrderId: order.id, paymentStatus: 'PENDING', paymentMethod: 'RAZORPAY' } });
        return res.status(201).json({
          success: true, message: "Wallet insufficient. Please complete payment via Razorpay.", paymentMethod: 'RAZORPAY',
          data: { applicationId: app.id, orderId: order.id, amount: fee, key: await razorpayService.getKeyId(tenantId) }
        });
      } catch (rzpErr) {
        console.error('[PaymentFallback] Razorpay failed:', rzpErr.message);
        return res.status(400).json({ 
          success: false, 
          message: "Razorpay initialization failed. Please check your API keys or use another payment method.",
          error: rzpErr.message 
        });
      }

    } catch (err) {
      console.error('[Application.submit] Error:', err);
      if (isUniqueConstraintError(err, "mobile")) {
        return res.status(409).json({
          success: false,
          message: "This mobile number is already registered. Please use a different mobile number."
        });
      }
      res.status(500).json({
        success: false,
        message: err.message || "Internal server error",
        code: err.code || undefined,
        target: err.meta?.target || undefined
      });
    }
  },

  // ── POST /api/applications/verify-payment ──────────────────────────────────
  verifyPayment: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { applicationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    try {
      const app = await prisma.application.findUnique({ where: { id: applicationId } });
      if (!app) return res.status(404).json({ success: false, message: "Application not found" });

      const isValid = await razorpayService.verifyPaymentSignature(tenantId, {
        razorpay_order_id, razorpay_payment_id, razorpay_signature
      });
      if (!isValid) return res.status(400).json({ success: false, message: "Invalid payment signature" });

      await prisma.application.update({
        where: { id: applicationId },
        data: { razorpayPaymentId: razorpay_payment_id, paymentStatus: 'SUCCESS', status: 'PENDING' }
      });

      await settleApplicationFeeToCorporateWallet(
        {
          ...app,
          razorpayPaymentId: razorpay_payment_id,
          paymentStatus: "SUCCESS",
          status: "PENDING"
        },
        "APPLICATION_PAYMENT_VERIFIED"
      );

      await logAction({ userId, action: "APPLICATION_PAYMENT_VERIFIED", targetId: applicationId, tenantId });
      res.json({ success: true, message: "Payment verified. Application is now under review." });
    } catch (err) {
      console.error('[Application.verifyPayment]', err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ── GET /api/applications/status ───────────────────────────────────────────
  getStatus: async (req, res) => {
    const { user_id: userId } = req.user;
    const { targetIdentity } = req.query;
    try {
      const where = { userId, ...(targetIdentity ? { targetIdentity } : {}) };
      const apps = await prisma.application.findMany({ where, orderBy: { createdAt: 'desc' } });
      res.json({ success: true, data: apps });
    } catch (err) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ── GET /api/applications/list (admin) ─────────────────────────────────────
  list: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const { status, targetIdentity, page = 1, limit = 20 } = req.query;
    try {
      const where = { tenantId, ...(status ? { status } : {}), ...(targetIdentity ? { targetIdentity } : {}) };
      if (!['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(adminIdentity)) {
        where.OR = [{ createdById: adminId }, { user: { path: { contains: adminId } } }];
      }
      const [apps, total] = await Promise.all([
        prisma.application.findMany({
          where, include: { user: { select: { id: true, mobile: true, fullName: true, identity: true } }, creator: { select: { id: true, fullName: true, identity: true } } },
          orderBy: { createdAt: 'desc' }, skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit)
        }),
        prisma.application.count({ where })
      ]);
      res.json({ success: true, data: { applications: apps, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } } });
    } catch (err) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ── POST /api/applications/:id/approve ─────────────────────────────────────
  approve: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const { id: applicationId } = req.params;

    if (!['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(adminIdentity)) {
      return res.status(403).json({ success: false, message: "Not authorized to approve applications." });
    }

    try {
      const app = await prisma.application.findUnique({ where: { id: applicationId }, include: { user: true } });
      if (!app) return res.status(404).json({ success: false, message: "Application not found" });
      if (app.status === 'APPROVED') return res.status(400).json({ success: false, message: "Already approved." });
      if (app.paymentStatus !== 'SUCCESS') return res.status(400).json({ success: false, message: "Payment not completed." });

      await prisma.$transaction(async (tx) => {
        await tx.application.update({ where: { id: applicationId }, data: { status: 'APPROVED', approvedBy: adminId, approvedAt: new Date() } });
        await upgradeUserIdentity(app.userId, app.targetIdentity, app.submittedData || {}, tenantId, tx, { skipWalletCreation: true });
      });

      try { await walletService.createWallet(app.userId, tenantId, false); } catch {}

      // Profile creation is important but shouldn't crash the approval if there's a DB schema mismatch
      await createLayeredProfile(app);


      // Settlement and commission distribution
      const settlementAmount = Number(app.paymentAmount || 0);
      if (settlementAmount > 0) {
        // 1) Always credit tenant corporate wallet first. If payment was already
        // settled during verification/rejection, this is a no-op.
        await settleApplicationFeeToCorporateWallet(app, "APPLICATION_APPROVAL");

        // 2) Commission should not rollback wallet settlement.
        const slugMap = { MEMBER: 'membership_fee', SAATHI: 'saathi_fee', BUSINESS_USER: 'business_partner_fee', BUSINESS_PARTNER: 'business_partner_fee' };
        const slug = slugMap[app.targetIdentity];
        if (slug) {
          try {
            const subService = await prisma.commissionSubService.findFirst({
              where: { OR: [{ slug }, { name: { contains: slug.replace('_fee', ''), mode: 'insensitive' } }] }
            });
            if (!subService) return;
            await commissionService.processCommission(
              settlementAmount,
              subService.id,
              app.userId,
              null,
              null,
              {
                referenceId: app.id,
                referenceType: `${app.targetIdentity}_APPLICATION`,
                stopAtUserId: app.createdById || null
              }
            );
          } catch (commErr) {
            console.error('[Commission] Failed after wallet settlement:', commErr);
          }
        }
      }

      await logAction({ userId: adminId, action: `${app.targetIdentity}_APPROVED`, targetId: applicationId, tenantId, metadata: { userId: app.userId } });

      try {
        await prisma.notification.create({
          data: {
            id: generateUuid(),
            userId: app.userId,
            tenantId,
            title: `${app.targetIdentity} Application Approved`,
            message: `Congratulations! Your ${app.targetIdentity} application has been approved. Your account will be upgraded shortly.`,
            type: "APPLICATION_APPROVED",
            metadata: { applicationId: app.id, targetIdentity: app.targetIdentity, approvedAt: new Date() }
          }
        });
      } catch (notifErr) {
        console.error('[Application.approve] Notification creation failed:', notifErr);
      }

      res.json({ success: true, message: `${app.targetIdentity} application approved. Identity upgraded.`, data: { applicationId, userId: app.userId } });
    } catch (err) {
      console.error('[Application.approve]', err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ── POST /api/applications/:id/reject ──────────────────────────────────────
  reject: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const { id: applicationId } = req.params;
    const { reason } = req.body;

    if (!['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(adminIdentity)) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }
    if (!reason?.trim()) return res.status(400).json({ success: false, message: "Rejection reason required." });

    try {
      const app = await prisma.application.findUnique({ where: { id: applicationId } });
      if (!app) return res.status(404).json({ success: false, message: "Application not found" });
      await settleApplicationFeeToCorporateWallet(app, "APPLICATION_REJECTED");
      await prisma.application.update({ where: { id: applicationId }, data: { status: 'REJECTED', rejectionReason: reason } });
      await logAction({ userId: adminId, action: `${app.targetIdentity}_REJECTED`, targetId: applicationId, tenantId });

      try {
        await prisma.notification.create({
          data: {
            id: generateUuid(),
            userId: app.userId,
            tenantId,
            title: `${app.targetIdentity} Application Rejected`,
            message: `Your ${app.targetIdentity} application has been rejected. Reason: ${reason}`,
            type: "APPLICATION_REJECTED",
            metadata: { applicationId: app.id, targetIdentity: app.targetIdentity, rejectionReason: reason }
          }
        });
      } catch (notifErr) {
        console.error('[Application.reject] Notification creation failed:', notifErr);
      }

      res.json({ success: true, message: "Application rejected." });
    } catch (err) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ── POST /api/applications/convert ─────────────────────────────────────────
  // EXCLUSIVE to WHITE_LABEL_ADMIN: Instant free upgrade with no queue, no payment.
  // This is triggered only by the "Upgrade User" / "Convert" button in the admin UI.
  convert: async (req, res) => {
    const { user_id: creatorId, tenant_id: tenantId, identity: creatorIdentity } = req.user;

    if (creatorIdentity !== 'WHITE_LABEL_ADMIN') {
      return res.status(403).json({ success: false, message: "Only WHITE_LABEL_ADMIN can perform instant conversions." });
    }

    const { targetIdentity, targetUserId, geolocation, ...formData } = req.body;
    const submittedData = sanitizeJsonValue(formData);
    const geoFields = buildGeoFields(geolocation);
    if (!targetIdentity || !targetUserId) {
      return res.status(400).json({ success: false, message: "targetIdentity and targetUserId are required." });
    }
    const normalizedTargetIdentity = String(targetIdentity || '').trim().toUpperCase();
    const allowedTargets = new Set(['MEMBER', 'SAATHI', 'BUSINESS_PARTNER', 'BUSINESS_USER']);
    if (!allowedTargets.has(normalizedTargetIdentity)) {
      return res.status(400).json({ success: false, message: `Unsupported targetIdentity: ${targetIdentity}` });
    }

    try {
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser) return res.status(404).json({ success: false, message: "Target user not found." });
      if (targetUser.tenantId !== tenantId) {
        return res.status(403).json({ success: false, message: "Target user does not belong to your tenant." });
      }

      const result = await prisma.$transaction(async (tx) => {
        const newApp = await tx.application.create({
          data: {
            id: generateUuid(), userId: targetUser.id, createdById: creatorId, tenantId,
            targetIdentity: normalizedTargetIdentity, status: 'APPROVED', paymentMethod: 'FREE', paymentStatus: 'SUCCESS',
            paymentAmount: 0, approvedBy: creatorId, approvedAt: new Date(),
            submittedData,
            ...geoFields
          }
        });
        const updatedUser = await upgradeUserIdentity(targetUser.id, normalizedTargetIdentity, formData, tenantId, tx, { skipWalletCreation: true });
        if (updatedUser.identity !== normalizedTargetIdentity || updatedUser.userType !== normalizedTargetIdentity) {
          throw new Error(`Identity persistence mismatch inside transaction: expected ${normalizedTargetIdentity}, got identity=${updatedUser.identity}, userType=${updatedUser.userType}`);
        }
        return { app: newApp, updatedUser };
      });

      // Keep profile creation outside transaction.
      // Profile FK mismatch should never rollback identity conversion.
      await createLayeredProfile(result.app);

      const persistedUser = await prisma.user.findUnique({
        where: { id: targetUser.id },
        select: { id: true, identity: true, userType: true, tenantId: true }
      });
      if (!persistedUser || persistedUser.identity !== normalizedTargetIdentity || persistedUser.userType !== normalizedTargetIdentity) {
        throw new Error(`Identity not persisted after conversion: expected ${normalizedTargetIdentity}, got identity=${persistedUser?.identity}, userType=${persistedUser?.userType}`);
      }

      try { await walletService.createWallet(targetUser.id, tenantId, false); } catch {}

      await logAction({ userId: creatorId, action: `${normalizedTargetIdentity}_DIRECT_CONVERSION`, targetId: result.app.id, tenantId, metadata: { targetUserId } });
      return res.status(201).json({
        success: true,
        message: `User instantly converted to ${normalizedTargetIdentity}.`,
        data: {
          applicationId: result.app.id,
          status: 'APPROVED',
          userId: targetUser.id,
          identity: normalizedTargetIdentity,
          userType: normalizedTargetIdentity
        }
      });
    } catch (err) {
      console.error('[Application.convert]', err);
      res.status(500).json({ success: false, message: err.message || "Internal server error" });
    }
  }
};

module.exports = applicationController;
