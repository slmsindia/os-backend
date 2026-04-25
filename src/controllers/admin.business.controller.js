const { PrismaClient } = require("@prisma/client");
const { generateUuid } = require("../utils/id");
const walletService = require("../services/wallet.service");

const prisma = new PrismaClient();

const businessPartnerController = {
  createApplication: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const body = req.body;

    try {
      if (!body.userId) {
        return res.status(400).json({ success: false, message: "userId is required" });
      }

      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id: body.userId } });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Ensure no pending application exists
      const existing = await prisma.businessPartnerApplication.findFirst({
        where: { userId: body.userId, status: 'PENDING' }
      });

      if (existing) {
        return res.status(400).json({ success: false, message: "User already has a pending Business Partner application" });
      }

      const feeSetting = await prisma.globalSetting.findUnique({ where: { key: 'BUSINESS_PARTNER_FEE' } });
      const amount = feeSetting ? parseFloat(feeSetting.value) : 2000;
      
      const paymentMethod = body.paymentMode === 1 ? 'RAZORPAY' : 'WALLET';

      // If created by a Partner, deduct from their wallet
      const partnerRoles = ['COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'];
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
          userId: body.userId,
          
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
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
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
      res.status(500).json({ success: false, message: "Internal server error" });
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
      res.status(500).json({ success: false, message: "Internal server error" });
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
