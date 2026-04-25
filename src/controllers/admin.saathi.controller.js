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
      await prisma.globalSetting.upsert({
        where: { key: 'SAATHI_FEE' },
        update: { value: amount.toString() },
        create: { key: 'SAATHI_FEE', value: amount.toString() }
      });

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
      } else if (mobile) {
        // Check if mobile already exists
        targetUser = await prisma.user.findUnique({ where: { mobile } });
        if (!targetUser) {
          // Create new user record first
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
              identity: 'USER',
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
      if (targetUser.identity === 'SAATHI') {
        return res.status(400).json({ success: false, message: "User is already a SAATHI" });
      }

      const partnerRoles = ['COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'];
      if (partnerRoles.includes(adminIdentity)) {
        // Hierarchy Check: Must be in creator's path
        if (targetUser.parentId !== adminId && (!targetUser.path || !targetUser.path.includes(adminId))) {
          return res.status(403).json({ success: false, message: "You can only onboard Saathi in your own hierarchy" });
        }
      }

      // 3. Payment Validation
      const feeSetting = await prisma.globalSetting.findUnique({ where: { key: 'SAATHI_FEE' } });
      const amount = feeSetting ? parseFloat(feeSetting.value) : 1000;

      if (partnerRoles.includes(adminIdentity)) {
        if (paymentMethod === 'CASH') {
          return res.status(403).json({ success: false, message: "Partners cannot use CASH method. Use Wallet or Razorpay." });
        }
        
        if (paymentMethod === 'WALLET') {
          const wallet = await walletService.resolveWallet(adminId, tenantId, adminIdentity);
          if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient partner wallet balance" });
          }
          await walletService.updateBalance(wallet.id, -amount);
        }
      }

      // 4. Create Application
      const application = await prisma.saathiApplication.create({
        data: {
          id: generateUuid(),
          userId: targetUserId,
          fullName: fullName || targetUser.fullName,
          mobile: mobile || targetUser.mobile,
          gender: (gender || targetUser.gender || 'OTHER').toUpperCase(),
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : targetUser.dateOfBirth,
          address: address || "",
          
          maritalStatus: req.body.maritalStatus || null,
          citizenship: req.body.citizenship || req.body.citizen || null,
          isMigrantWorker: Boolean(req.body.isMigrantWorker || req.body.migrantWorker),
          incomeAboveThreshold: Boolean(req.body.incomeAboveThreshold || req.body.incomeCategory === 'Above Threshold'),
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
          status: 'PENDING',
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

      res.status(201).json({
        success: true,
        message: "Saathi application created successfully.",
        data: { applicationId: application.id, userId: targetUserId }
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
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
    const { user_id: adminId, identity: adminIdentity } = req.user;
    const { applicationId } = req.params;

    try {
      const admin = await prisma.user.findUnique({ where: { id: adminId } });
      if (!['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(adminIdentity) && !admin.canApproveSaathi) {
        return res.status(403).json({ success: false, message: "No approval permission" });
      }

      const application = await prisma.saathiApplication.findUnique({
        where: { id: applicationId },
        include: { payment: true }
      });

      if (!application || application.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: "Application not eligible for approval" });
      }

      // Update User Identity to SAATHI
      await prisma.user.update({
        where: { id: application.userId },
        data: { identity: 'SAATHI' }
      });

      // Update Application
      await prisma.saathiApplication.update({
        where: { id: applicationId },
        data: { status: 'APPROVED', approvedBy: adminId }
      });

      res.json({ success: true, message: "Saathi approved successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Reject Saathi Application
   */
  rejectApplication: async (req, res) => {
    const { user_id: adminId } = req.user;
    const { applicationId } = req.params;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ success: false, message: "Rejection reason required" });

    try {
      await prisma.saathiApplication.update({
        where: { id: applicationId },
        data: { status: 'REJECTED', rejectionReason: reason, approvedBy: adminId }
      });

      res.json({ success: true, message: "Application rejected" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
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
