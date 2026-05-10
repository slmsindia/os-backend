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
async function upgradeUserIdentity(userId, targetIdentity, applicationData, tenantId, tx) {
  const db = tx || prisma;
  await db.user.update({
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
  try { await walletService.createWallet(userId, tenantId, false); } catch {}
}

// ═════════════════════════════════════════════════════════════════════════════
// CONTROLLER METHODS
// ═════════════════════════════════════════════════════════════════════════════
const applicationController = {

  // ── POST /api/applications/submit ──────────────────────────────────────────
  submit: async (req, res) => {
    const { user_id: creatorId, tenant_id: tenantId, identity: creatorIdentity } = req.user;
    const { targetIdentity, targetMobile, targetUserId: explicitTargetId, geolocation, ...formData } = req.body;

    if (!targetIdentity) return res.status(400).json({ success: false, message: "targetIdentity is required" });

    try {
      // ── 1. Resolve target user ──────────────────────────────────────────────
      let targetUser = null;
      if (explicitTargetId) {
        targetUser = await prisma.user.findUnique({ where: { id: explicitTargetId } });
      } else if (targetMobile) {
        targetUser = await prisma.user.findFirst({ where: { mobile: targetMobile, tenantId } });
      }

      if (!targetUser && !targetMobile) {
        // Self-apply
        targetUser = await prisma.user.findUnique({ where: { id: creatorId } });
      }

      // Update password for existing targetUser if provided
      if (targetUser && formData.password) {
        const hashedPwd = await bcrypt.hash(formData.password, 10);
        targetUser = await prisma.user.update({
          where: { id: targetUser.id },
          data: { password: hashedPwd }
        });
      }

      // ── 2. Auto-create base USER if not found (admin/partner creating for new person) ──
      if (!targetUser && targetMobile && ALL_ADMIN_ROLES.includes(creatorIdentity)) {
        const creator = await prisma.user.findUnique({ where: { id: creatorId }, select: { path: true } });
        const path = creator?.path ? `${creator.path}/${creatorId}` : `/${creatorId}`;
        const password = formData.password || targetMobile.slice(-4);
        const hashedPwd = await bcrypt.hash(password, 10);
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
      }

      if (!targetUser) return res.status(404).json({ success: false, message: "Target user not found. Provide targetMobile or targetUserId." });

      // ── 3. Block if already has this or higher identity ─────────────────────
      const currentLevel = ROLE_HIERARCHY[targetUser.identity] || 0;
      const targetLevel  = ROLE_HIERARCHY[targetIdentity] || 0;
      if (currentLevel >= targetLevel) {
        return res.status(400).json({ success: false, message: `User already has identity ${targetUser.identity}. Use the Convert action to upgrade directly.` });
      }

      // ── 4. Block duplicate pending application ──────────────────────────────
      const duplicate = await prisma.application.findFirst({
        where: { userId: targetUser.id, targetIdentity, status: { in: ['PENDING', 'PAYMENT_PENDING', 'APPROVED'] } }
      });
      if (duplicate?.status === 'APPROVED') {
        return res.status(400).json({ success: false, message: `${targetIdentity} already approved for this user.` });
      }
      if (duplicate?.status === 'PENDING') {
        return res.status(400).json({ success: false, message: `A pending ${targetIdentity} application already exists.` });
      }

      // ── 5. Resolve fee ───────────────────────────────────────────────────────
      const fee = await resolveFee(targetIdentity, tenantId);

      // ── 6. ADMIN / WHITE_LABEL_ADMIN / SUB_ADMIN: Cash or Razorpay ──────────
      // All admin-level creators use the same payment flow and go to PENDING queue.
      // Instant (free) upgrade is only via the separate `convert` endpoint.
      if (ADMIN_CREATOR_ROLES.includes(creatorIdentity)) {
        const method = (formData.paymentMethod || '').toUpperCase();
        if (!['CASH', 'RAZORPAY', 'WALLET'].includes(method) && fee > 0) {
          return res.status(400).json({ success: false, message: "ADMIN/SUB_ADMIN can only use CASH, RAZORPAY, or WALLET." });
        }

        const app = await prisma.application.create({
          data: {
            id: generateUuid(), userId: targetUser.id, createdById: creatorId, tenantId,
            targetIdentity, status: fee > 0 ? 'PAYMENT_PENDING' : 'PENDING',
            paymentMethod: method || 'CASH', paymentStatus: method === 'CASH' ? 'SUCCESS' : 'NONE',
            paymentAmount: fee,
            submittedData: formData,
            geoLat: geolocation?.lat, geoLng: geolocation?.lng,
            geoAccuracy: geolocation?.accuracy, geoAddress: geolocation?.address,
            geoCapturedAt: geolocation?.capturedAt ? new Date(geolocation.capturedAt) : new Date()
          }
        });

        if (method === 'CASH' || fee === 0) {
          await prisma.application.update({ where: { id: app.id }, data: { status: 'PENDING', paymentStatus: 'SUCCESS' } });
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
            await prisma.application.update({ where: { id: app.id }, data: { status: 'PENDING', paymentStatus: 'SUCCESS', paymentMethod: 'WALLET' } });
            return res.status(201).json({ success: true, message: "Application submitted via corporate wallet.", data: { applicationId: app.id } });
          } catch (walletErr) {
            return res.status(500).json({ success: false, message: "Wallet payment failed: " + walletErr.message });
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
      const app = await prisma.application.create({
        data: {
          id: generateUuid(), userId: targetUser.id, createdById: creatorId, tenantId,
          targetIdentity, status: 'PAYMENT_PENDING', paymentMethod: 'WALLET',
          paymentStatus: 'NONE', paymentAmount: fee,
          submittedData: formData,
          geoLat: geolocation?.lat, geoLng: geolocation?.lng,
          geoAccuracy: geolocation?.accuracy, geoAddress: geolocation?.address,
          geoCapturedAt: geolocation?.capturedAt ? new Date(geolocation.capturedAt) : new Date()
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
      res.status(500).json({ success: false, message: err.message || "Internal server error" });
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
        await upgradeUserIdentity(app.userId, app.targetIdentity, app.submittedData || {}, tenantId, tx);
      });

      // Profile creation is important but shouldn't crash the approval if there's a DB schema mismatch
      await createLayeredProfile(app);


      // Commission distribution
      try {
        if (app.paymentAmount > 0) {
          const slugMap = { MEMBER: 'membership_fee', SAATHI: 'saathi_fee', BUSINESS_USER: 'business_partner_fee', BUSINESS_PARTNER: 'business_partner_fee' };
          const slug = slugMap[app.targetIdentity];

          await prisma.$transaction(async (tx) => {
            const adminWallet = await tx.wallet.findFirst({ where: { tenantId: app.tenantId, isCorporate: true } }) || await tx.wallet.create({
              data: {
                id: generateUuid(),
                userId: null,
                tenantId: app.tenantId,
                isCorporate: true,
                balance: 0,
                currency: "INR",
                isActive: true
              }
            });

            await tx.wallet.update({
              where: { id: adminWallet.id },
              data: { balance: { increment: app.paymentAmount } }
            });

            await tx.walletTransaction.create({
              data: {
                id: generateUuid(),
                walletId: adminWallet.id,
                amount: app.paymentAmount,
                type: "CREDIT",
                category: "SERVICE_CHARGE",
                status: "SUCCESS",
                referenceId: app.id,
                description: `${app.targetIdentity} application fee received from user ${app.userId}`,
                tenantId: app.tenantId,
                metadata: {
                  trigger: "APPLICATION_APPROVAL",
                  applicationId: app.id,
                  userId: app.userId
                }
              }
            });


            if (slug) {
              const subService = await tx.commissionSubService.findFirst({
                where: { OR: [{ slug }, { name: { contains: slug.replace('_fee', ''), mode: 'insensitive' } }] }
              });
              if (subService) {
                await commissionService.processCommission(
                  app.paymentAmount,
                  subService.id,
                  app.userId,
                  null,
                  tx,
                  {
                    referenceId: app.id,
                    referenceType: `${app.targetIdentity}_APPLICATION`
                  }
                );
              }
            }
          });
        }
      } catch (commErr) { console.error('[Commission] Failed:', commErr); }

      await logAction({ userId: adminId, action: `${app.targetIdentity}_APPROVED`, targetId: applicationId, tenantId, metadata: { userId: app.userId } });
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
      await prisma.application.update({ where: { id: applicationId }, data: { status: 'REJECTED', rejectionReason: reason } });
      await logAction({ userId: adminId, action: `${app.targetIdentity}_REJECTED`, targetId: applicationId, tenantId });
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
    if (!targetIdentity || !targetUserId) {
      return res.status(400).json({ success: false, message: "targetIdentity and targetUserId are required." });
    }

    try {
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!targetUser) return res.status(404).json({ success: false, message: "Target user not found." });

      const app = await prisma.$transaction(async (tx) => {
        const newApp = await tx.application.create({
          data: {
            id: generateUuid(), userId: targetUser.id, createdById: creatorId, tenantId,
            targetIdentity, status: 'APPROVED', paymentMethod: 'FREE', paymentStatus: 'SUCCESS',
            paymentAmount: 0, approvedBy: creatorId, approvedAt: new Date(),
            submittedData: formData,
            geoLat: geolocation?.lat, geoLng: geolocation?.lng,
            geoAccuracy: geolocation?.accuracy, geoAddress: geolocation?.address,
            geoCapturedAt: geolocation?.capturedAt ? new Date(geolocation.capturedAt) : new Date()
          }
        });
        await upgradeUserIdentity(targetUser.id, targetIdentity, formData, tenantId, tx);
        await createLayeredProfile(newApp, tx);
        return newApp;
      });

      await logAction({ userId: creatorId, action: `${targetIdentity}_DIRECT_CONVERSION`, targetId: app.id, tenantId, metadata: { targetUserId } });
      return res.status(201).json({
        success: true,
        message: `User instantly converted to ${targetIdentity}.`,
        data: { applicationId: app.id, status: 'APPROVED', userId: targetUser.id }
      });
    } catch (err) {
      console.error('[Application.convert]', err);
      res.status(500).json({ success: false, message: err.message || "Internal server error" });
    }
  }
};

module.exports = applicationController;
