const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");
const bcrypt = require("bcrypt");
const { logAction } = require("../utils/audit");
const walletService = require("../services/wallet.service");

const businessPartnerController = {
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
        
        // Upgrade existing user
        await prisma.user.update({
          where: { id: targetUser.id },
          data: { identity: 'BUSINESS_PARTNER', approvalStatus: 'APPROVED', approvedAt: new Date() }
        });
      } 
      // Case 2: No User ID provided, creating for a NEW person (Admin/Partner led)
      else if (body.contactNumber1 && body.ownerName) {
        // Check if a user with this contact number already exists
        targetUser = await prisma.user.findUnique({ where: { mobile: body.contactNumber1 } });
        
        if (targetUser) {
          if (targetUser.identity === 'BUSINESS_PARTNER') return res.status(400).json({ success: false, message: "User is already a BUSINESS_PARTNER" });
          
          // Existing user → upgrade identity to BUSINESS_PARTNER immediately
          await prisma.user.update({
            where: { id: targetUser.id },
            data: { identity: 'BUSINESS_PARTNER', approvalStatus: 'APPROVED', approvedAt: new Date() }
          });
        } else {
          // Double check to ensure no race condition or existing mobile
          const mobileExists = await prisma.user.findUnique({ where: { mobile: body.contactNumber1 } });
          if (mobileExists) {
            return res.status(409).json({ success: false, message: "User with this mobile number already exists." });
          }

          // Create a new User account first
          const creator = await prisma.user.findUnique({ where: { id: adminId }, select: { id: true, path: true } });
          const path = creator.path ? `${creator.path}/${creator.id}` : `/${creator.id}`;
          const hashedPassword = await bcrypt.hash("DefaultPassword123", 10);

          targetUser = await prisma.user.create({
            data: {
              id: generateUuid(),
              mobile: body.contactNumber1,
              fullName: body.ownerName,
              email: body.email,
              password: hashedPassword,
              gender: "OTHER",
              dateOfBirth: new Date(),
              identity: 'BUSINESS_PARTNER',  // Set directly — admin is creating, no approval step needed
              approvalStatus: 'APPROVED',
              approvedAt: new Date(),
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




      // 3. Check for previous paid but rejected application
      const existingApplication = await prisma.businessPartnerApplication.findFirst({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'desc' }
      });

      // For BP, since payment is inside the same table/model, we check its own status or a linked payment
      // Note: In BP model, status is 'REJECTED' and we assume if it's there it was paid or handled
      const isPaidResubmission = existingApplication && existingApplication.status === 'REJECTED';

      const feeSetting = await prisma.globalSetting.findUnique({ where: { key: 'BUSINESS_PARTNER_FEE' } });
      const amount = feeSetting ? parseFloat(feeSetting.value) : 2000;
      
      const paymentMethod = body.paymentMode === 1 ? 'RAZORPAY' : 'WALLET';

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
          status: 'APPROVED',    // Admin direct creation → auto-approved, no separate approval step needed
          createdById: adminId
        };

        if (isPaidResubmission) {
          return await tx.businessPartnerApplication.update({
            where: { id: existingApplication.id },
            data: { ...appData, rejectionReason: null }
          });
        } else {
          return await tx.businessPartnerApplication.create({
            data: {
              ...appData,
              id: generateUuid(),
              userId: targetUserId
            }
          });
        }
      });

      res.status(201).json({
        success: true,
        message: "Business Partner application created successfully.",
        data: { applicationId: application.id }
      });

      await logAction({
        userId: adminId,
        action: "BUSINESS_PARTNER_APP_CREATED",
        targetId: application.id,
        tenantId,
        metadata: { userId: targetUserId, businessName: application.businessName }
      });
    } catch (err) {
      console.error(err);
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
      const isTopAdmin = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(adminIdentity);
      if (!isTopAdmin) {
        const approver = await prisma.user.findUnique({ where: { id: adminId } });
        if (!approver.canApproveSaathi) { 
          return res.status(403).json({ success: false, message: "No approval permission" });
        }
        if (application.user.parentId !== adminId && (!application.user.path || !application.user.path.includes(adminId))) {
          return res.status(403).json({ success: false, message: "You can only approve applications within your own hierarchy." });
        }
      }

      // 2. Financial Credit to Admin Wallet (If Razorpay was used)
      if (application.paymentMode === 1) { 
        const sharedWallet = await walletService.resolveWallet(null, tenantId, 'ADMIN');
        await walletService.updateBalance(sharedWallet.id, application.amount);
      }

      // 3. Finalize Approval
      await prisma.$transaction([
        prisma.user.update({
          where: { id: application.userId },
          data: { identity: 'BUSINESS_PARTNER' }
        }),
        prisma.businessPartnerApplication.update({
          where: { id: applicationId },
          data: { status: 'APPROVED', approvedBy: adminId }
        })
      ]);

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
  }
};

module.exports = businessPartnerController;
