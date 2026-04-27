const prisma = require("../lib/prisma");
const bcrypt = require("bcrypt");
const { generateUuid } = require("../utils/id");
const { logAction } = require("../utils/audit");
const walletService = require("../services/wallet.service");

const adminSaathiController = {
  /**
   * Set Saathi Fee
   */
  updateSaathiFee: async (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: "Invalid amount" });

    try {
      const setting = prisma.globalSetting ? await prisma.globalSetting.upsert({
        where: { key: 'SAATHI_FEE' },
        update: { value: amount.toString() },
        create: { key: 'SAATHI_FEE', value: amount.toString() }
      }) : null;

      res.json({ success: true, message: "Saathi fee updated successfully", amount });
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
    const { userId: providedUserId, fullName, mobile, gender, dateOfBirth, address, paymentMethod } = req.body;

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
        targetUser = await prisma.user.findUnique({ where: { mobile } });
        if (targetUser) {
          if (targetUser.identity === 'SAATHI') return res.status(400).json({ success: false, message: "User is already a SAATHI" });
          // Existing user → no immediate upgrade, wait for approval
        } else {
          const creator = await prisma.user.findUnique({ where: { id: adminId }, select: { id: true, path: true } });
          const path = creator.path ? `${creator.path}/${creator.id}` : `/${creator.id}`;
          const hashedPassword = await bcrypt.hash("DefaultPassword123", 10);

          targetUser = await prisma.user.create({
            data: {
              id: generateUuid(),
              mobile,
              fullName,
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
        targetUserId = targetUser.id;
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
      // 3. Check for previous paid but rejected application
      const existingApplication = await prisma.saathiApplication.findFirst({
        where: { userId: targetUserId },
        include: { payment: true },
        orderBy: { createdAt: 'desc' }
      });

      const isPaidResubmission = existingApplication && 
                                existingApplication.status === 'REJECTED' && 
                                (existingApplication.payment?.status === 'SUCCESS' || existingApplication.payment?.status === 'PAID');

      // 4. Payment Validation & Transaction
      const feeSetting = prisma.globalSetting ? await prisma.globalSetting.findUnique({ where: { key: 'SAATHI_FEE' } }) : null;
      const amount = feeSetting ? parseFloat(feeSetting.value) : 1000;

      const application = await prisma.$transaction(async (tx) => {
        if (!isPaidResubmission && partnerRoles.includes(adminIdentity) && paymentMethod === 'WALLET') {
          const wallet = await walletService.resolveWallet(adminId, tenantId, adminIdentity);
          if (!wallet || wallet.balance < amount) {
            throw new Error("Insufficient partner wallet balance");
          }
          await walletService.updateBalance(wallet.id, -amount, tx);
          
          const adminWallet = await walletService.resolveWallet(null, tenantId, 'ADMIN');
          await walletService.updateBalance(adminWallet.id, amount, tx);
        }

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

        if (isPaidResubmission) {
          return await tx.saathiApplication.update({
            where: { id: existingApplication.id },
            data: { ...appData, rejectionReason: null }
          });
        } else {
          return await tx.saathiApplication.create({
            data: {
              ...appData,
              id: generateUuid(),
              userId: targetUserId,
              payment: {
                create: {
                  id: generateUuid(),
                  amount,
                  method: paymentMethod,
                  status: (paymentMethod === 'WALLET' || paymentMethod === 'CASH') ? 'SUCCESS' : 'PENDING',
                  paidAt: (paymentMethod === 'WALLET' || paymentMethod === 'CASH') ? new Date() : null
                }
              }
            }
          });
        }
      });

      res.status(201).json({
        success: true,
        message: "Saathi application created successfully.",
        data: { applicationId: application.id, userId: targetUserId }
      });

    } catch (err) {
      console.error(err);
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
      const canView = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(adminIdentity) || 
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
      const isTopAdmin = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(adminIdentity);
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

      // 2. Financial Credit to Admin Wallet (If Razorpay was used and successful)
      if (application.payment?.status === 'SUCCESS' && application.payment?.method === 'RAZORPAY') {
        const sharedWallet = await walletService.resolveWallet(null, tenantId, 'ADMIN');
        await walletService.updateBalance(sharedWallet.id, application.payment.amount);
      }

      // 3. Finalize Approval
      await prisma.$transaction([
        prisma.user.update({
          where: { id: application.userId },
          data: { identity: 'SAATHI' }
        }),
        prisma.saathiApplication.update({
          where: { id: applicationId },
          data: { status: 'APPROVED', approvedBy: adminId }
        })
      ]);

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
  }
};

module.exports = adminSaathiController;
