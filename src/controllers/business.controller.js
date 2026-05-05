const prisma = require("../lib/prisma");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");
const walletService = require("../services/wallet.service");

const businessController = {
  /**
   * Apply to become a Business Partner
   */
  apply: async (req, res) => {
    const { 
      businessName, brandName, ownerName, email, contactNumber1, contactNumber2,
      sectorId, businessType, employerType, amount, paymentMode, razorPayReferenceNo,
      address, documents 
    } = req.body;
    const { user_id: userId, tenant_id: tenantId } = req.user;

    try {
      // 1. Verify User Identity (Restriction removed to allow any identity to apply)
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      /*
      if (!["USER", "SAATHI", "MEMBER"].includes(user.identity)) {
        return res.status(403).json({ success: false, message: "Only Users, Saathi, or Members can apply for Business Partnership" });
      }
      */

      // 2. Verify Sector ID
      const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
      if (!sector) {
        return res.status(400).json({ success: false, message: "Invalid Sector ID. Please provide a valid ID from the Sector list." });
      }

      const payAmount = parseFloat(amount || 0);
      const payMode = parseInt(paymentMode || 1);

      // 3 & 4. Handle Application and Payment in Transaction
      const application = await prisma.$transaction(async (tx) => {
        // Create Application first
        const app = await tx.businessApplication.create({
          data: {
            id: generateUuid(),
            userId,
            businessName,
            brandName,
            ownerName,
            email,
            contactNumber1,
            contactNumber2,
            sectorId,
            amount: parseFloat(amount || 0),
            paymentMode: parseInt(paymentMode || 1),
            razorPayReferenceNo,
            address,
            documents,
            status: "PENDING"
          }
        });

        // If Wallet, deduct now
        if (payMode === 2) { // WALLET
          const wallet = await walletService.resolveWallet(userId, tenantId, user.identity);
          if (!wallet || wallet.balance < payAmount) {
            throw new Error("Insufficient wallet balance.");
          }

          const adminWallet = await tx.wallet.findFirst({ where: { tenantId, isCorporate: true } });
          if (!adminWallet) throw new Error("Admin wallet not found");

          // Deduct from user and credit to admin
          await walletService.payCreationFeeWithHistory(
            wallet.id,
            adminWallet.id,
            payAmount,
            `Business Partner Application Fee for ${businessName}`,
            app.id,
            tenantId,
            'WALLET',
            tx
          );
        }

        return app;
      });

      await logAction({
        userId,
        action: "APPLY_BUSINESS_PARTNER",
        targetId: application.id,
        tenantId,
        metadata: { businessName }
      });

      res.status(201).json({ success: true, message: "Application submitted successfully", application });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Post a Job
   */
  postJob: async (req, res) => {
    const { 
      jobDescription, jobType, payStructure, offeredAmount, educationId, experience,
      gender, minAge, maxAge, officeStartTime, officeEndTime, address, facilities,
      isJoiningFees, joiningAmount, joiningFeeReason, contactName, contactNumber,
      isUrgentHiring, noOfOpenings, shiftType, weekOffDays, skillIds, sectorId,
      jobRoleId, applicationCloseDate 
    } = req.body;
    const { user_id: userId, tenant_id: tenantId } = req.user;

    try {
      // Check if user has an approved business profile
      const profile = await prisma.businessProfile.findUnique({ where: { userId } });
      if (!profile) {
        return res.status(403).json({ success: false, message: "Only approved Business Partners can post jobs" });
      }

      const job = await prisma.jobPost.create({
        data: {
          id: generateUuid(),
          businessId: profile.id,
          creatorId: userId,
          jobDescription,
          jobType,
          payStructure,
          offeredAmount,
          educationId,
          experience,
          gender,
          minAge,
          maxAge,
          officeStartTime,
          officeEndTime,
          address,
          facilities,
          isJoiningFees,
          joiningAmount,
          joiningFeeReason,
          contactName,
          contactNumber,
          isUrgentHiring,
          noOfOpenings,
          shiftType,
          weekOffDays,
          skillIds,
          sectorId,
          jobRoleId,
          applicationCloseDate: new Date(applicationCloseDate)
        }
      });

      await logAction({
        userId,
        action: "POST_JOB",
        targetId: job.id,
        tenantId,
        metadata: { jobDescription: jobDescription.substring(0, 50) }
      });

      res.status(201).json({ success: true, message: "Job posted successfully", job });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get own business status
   */
  getBusinessStatus: async (req, res) => {
    const { user_id: userId } = req.user;
    try {
      const profile = await prisma.businessProfile.findUnique({ where: { userId } });
      const latestApplication = await prisma.businessApplication.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" }
      });

      res.json({
        success: true,
        isBusinessPartner: !!profile,
        profile,
        latestApplication
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get all jobs (for browsing)
   */
  getJobs: async (req, res) => {
    try {
      const jobs = await prisma.jobPost.findMany({
        where: { status: 'ACTIVE' },
        include: {
          business: { select: { businessName: true, brandName: true, address: true } },
          sector: true,
          jobRole: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: jobs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get jobs posted by the current user
   */
  getMyJobs: async (req, res) => {
    const { user_id: userId } = req.user;
    try {
      const profile = await prisma.businessProfile.findUnique({ where: { userId } });
      if (!profile) {
        return res.status(403).json({ success: false, message: "No business profile found" });
      }

      const jobs = await prisma.jobPost.findMany({
        where: { businessId: profile.id },
        include: {
          sector: true,
          jobRole: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: jobs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = businessController;
