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
      } 
      // Case 2: No User ID provided, creating for a NEW person (Admin/Partner led)
      else if (body.contactNumber1 && body.ownerName) {
        // Check if a user with this contact number already exists
        targetUser = await prisma.user.findUnique({ where: { mobile: body.contactNumber1 } });
        
        if (!targetUser) {
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

      // Ensure no pending application exists
      const existing = await prisma.businessPartnerApplication.findFirst({
        where: { userId: targetUserId, status: 'PENDING' }
      });

      if (existing) {
        return res.status(400).json({ success: false, message: "User already has a pending Business Partner application" });
      }

      const feeSetting = await prisma.globalSetting.findUnique({ where: { key: 'BUSINESS_PARTNER_FEE' } });
      const amount = feeSetting ? parseFloat(feeSetting.value) : 2000;
      
      const paymentMethod = body.paymentMode === 1 ? 'RAZORPAY' : 'WALLET';

      // If created by a Partner, deduct from their wallet
      if (partnerRoles.includes(adminIdentity) && paymentMethod === 'WALLET') {
        const wallet = await walletService.resolveWallet(adminId, tenantId, adminIdentity);
        if (!wallet || wallet.balance < amount) {
          return res.status(400).json({ success: false, message: "Insufficient partner wallet balance" });
        }
        await walletService.updateBalance(wallet.id, -amount);
      }

      const application = await prisma.businessPartnerApplication.create({
        data: {
          id: generateUuid(),
          userId: targetUserId,
          
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
          
          status: 'PENDING',
          createdById: adminId
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
    const { user_id: adminId } = req.user;

    try {
      const application = await prisma.businessPartnerApplication.findUnique({
        where: { id: applicationId }
      });

      if (!application || application.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: "Application not eligible for approval" });
      }

      await prisma.user.update({
        where: { id: application.userId },
        data: { identity: 'BUSINESS_PARTNER' }
      });

      await prisma.businessPartnerApplication.update({
        where: { id: applicationId },
        data: { status: 'APPROVED', approvedBy: adminId }
      });

      res.json({ success: true, message: "Business Partner approved successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  rejectApplication: async (req, res) => {
    const { applicationId } = req.params;
    const { user_id: adminId } = req.user;
    const { reason } = req.body;

    try {
      await prisma.businessPartnerApplication.update({
        where: { id: applicationId },
        data: { status: 'REJECTED', rejectionReason: reason, approvedBy: adminId }
      });
      res.json({ success: true, message: "Application rejected" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = businessPartnerController;
