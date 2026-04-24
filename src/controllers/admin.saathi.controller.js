const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
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
    const { userId, fullName, mobile, gender, dateOfBirth, address, paymentMethod } = req.body;

    try {
      const feeSetting = await prisma.globalSetting.findUnique({ where: { key: 'SAATHI_FEE' } });
      const amount = feeSetting ? parseFloat(feeSetting.value) : 1000;

      // 1. Validation for Partners
      const partnerRoles = ['COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'];
      if (partnerRoles.includes(adminIdentity)) {
        if (paymentMethod === 'CASH') {
          return res.status(403).json({ success: false, message: "Partners cannot use CASH method. Use Wallet or Razorpay." });
        }
        
        if (paymentMethod === 'WALLET') {
          const wallet = await walletService.resolveWallet(adminId, tenantId, adminIdentity);
          if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ success: false, message: "Insufficient partner wallet balance" });
          }
          await walletService.updateBalance(wallet.id, -amount); // Deduct from resolved wallet
        }
      }

      // 2. Validation for Admins
      const adminRoles = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'];
      if (adminRoles.includes(adminIdentity)) {
        // Admins can use CASH (Fees Adjustment) or Razorpay
        if (paymentMethod === 'WALLET') {
          return res.status(400).json({ success: false, message: "Admins should use CASH or Razorpay" });
        }
      }

      // 3. Create Application (Auto-Approved if created by Admin)
      const application = await prisma.saathiApplication.create({
        data: {
          id: generateUuid(),
          userId,
          fullName,
          mobile,
          gender,
          dateOfBirth: new Date(dateOfBirth),
          address,
          createdById: adminId,
          paymentType: paymentMethod,
          status: 'PENDING', // Still needs to be approved by ADMIN as per request
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
        message: "Saathi application created. Awaiting Admin approval.",
        data: { applicationId: application.id }
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
