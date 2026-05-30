const prisma = require("../lib/prisma");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");
const walletService = require("../services/wallet.service");

const ADMIN_IDENTITIES = [
  "SUPER_ADMIN",
  "WHITE_LABEL_ADMIN",
  "ADMIN",
  "SUB_ADMIN",
];

const businessController = {
  /**
   * Apply to become a Business Partner
   */
  apply: async (req, res) => {
    const {
      businessName, brandName, ownerName, email, contactNumber1, contactNumber2,
      sectorId, businessType, employerType, amount, paymentMode, razorPayReferenceNo,
      address, documents,
    } = req.body;
    const { user_id: userId, tenant_id: tenantId } = req.user;

    try {
      // 1. Verify User Identity (Restriction removed to allow any identity to apply)
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
      if (!sector) {
        return res.status(400).json({ success: false, message: "Invalid Sector ID." });
      }

      const payAmount = parseFloat(amount || 0);
      const payMode = parseInt(paymentMode || 1);

      const application = await prisma.$transaction(async (tx) => {
        const existing = await tx.businessApplication.findFirst({
          where: { userId, status: "PENDING" },
        });

        let app;
        if (existing) {
          app = await tx.businessApplication.update({
            where: { id: existing.id },
            data: {
              businessName, brandName, ownerName, email,
              contactNumber1, contactNumber2, sectorId,
              amount: parseFloat(amount || 0),
              paymentMode: parseInt(paymentMode || 1),
              razorPayReferenceNo, address, documents,
            },
          });
        } else {
          app = await tx.businessApplication.create({
            data: {
              id: generateUuid(), userId, businessName, brandName, ownerName, email,
              contactNumber1, contactNumber2, sectorId,
              amount: parseFloat(amount || 0),
              paymentMode: parseInt(paymentMode || 1),
              razorPayReferenceNo, address, documents,
              status: "PENDING",
            },
          });
        }

        if (payMode === 2) {
          const wallet = await walletService.resolveWallet(userId, tenantId, user.identity);
          if (!wallet || wallet.balance < payAmount) {
            throw new Error("Insufficient wallet balance.");
          }
          const adminWallet = await tx.wallet.findFirst({ where: { tenantId, isCorporate: true } });
          if (!adminWallet) throw new Error("Admin wallet not found");
          await walletService.payCreationFeeWithHistory(
            wallet.id, adminWallet.id, payAmount,
            `Business Partner Application Fee for ${businessName}`,
            app.id, tenantId, "WALLET", tx
          );
        }

        return app;
      });

      await logAction({
        userId, action: "APPLY_BUSINESS_PARTNER",
        targetId: application.id, tenantId, metadata: { businessName },
      });

      res.status(201).json({ success: true, message: "Application submitted successfully", application });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Post a Job — accessible by Business Partners AND Admins
   */
  postJob: async (req, res) => {
    const {
      jobDescription, jobType, payStructure, offeredAmount, educationId, experience,
      gender, minAge, maxAge, officeStartTime, officeEndTime, address, facilities,
      isJoiningFees, joiningAmount, joiningFeeReason, contactName, contactNumber,
      isUrgentHiring, noOfOpenings, shiftType, weekOffDays, skillIds, sectorId,
      jobRoleId, applicationCloseDate,
    } = req.body;
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const userIdentity = req.user.identity || req.user.role || "";
    const isAdmin = ADMIN_IDENTITIES.includes(userIdentity);

    try {
      // Admins can post without a business profile; partners need one
      const profile = await prisma.businessProfile.findUnique({ where: { userId } });

      if (!isAdmin && !profile) {
        return res.status(403).json({
          success: false,
          message: "Only approved Business Partners can post jobs",
        });
      }

      const job = await prisma.jobPost.create({
        data: {
          id: generateUuid(),
          // null for admins without a profile, profile.id for business partners
          businessId: profile?.id ?? null,
          creatorId: userId,
          jobDescription,
          jobType,
          payStructure,
          offeredAmount: parseFloat(offeredAmount),
          educationId,
          experience,
          gender,
          minAge: parseInt(minAge) || 18,
          maxAge: parseInt(maxAge) || 60,
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
          noOfOpenings: parseInt(noOfOpenings) || 1,
          shiftType,
          weekOffDays,
          skillIds,
          sectorId,
          jobRoleId,
          applicationCloseDate: new Date(applicationCloseDate),
        },
      });

      await logAction({
        userId, action: "POST_JOB",
        targetId: job.id, tenantId,
        metadata: { jobDescription: jobDescription.substring(0, 50) },
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
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        isBusinessPartner: !!profile,
        profile,
        latestApplication,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get all active jobs (for public browsing)
   */
  getJobs: async (req, res) => {
    try {
      const jobs = await prisma.jobPost.findMany({
        where: { status: "ACTIVE" },
        include: {
          business: {
            select: { businessName: true, brandName: true, address: true },
          },
          sector: true,
          jobRole: true,
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ success: true, data: jobs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get jobs posted by the current user
   * — Admins see ALL jobs in the system
   * — Business Partners see only their own jobs
   */
  getMyJobs: async (req, res) => {
    const { user_id: userId } = req.user;
    const userIdentity = req.user.identity || req.user.role || "";
    const isAdmin = ADMIN_IDENTITIES.includes(userIdentity);

    try {
      let whereClause = {};

      if (isAdmin) {
        // Admins see everything — no filter needed
        whereClause = {};
      } else {
        // Business partners see only their own profile's jobs
        const profile = await prisma.businessProfile.findUnique({ where: { userId } });
        if (!profile) {
          return res.status(403).json({
            success: false,
            message: "No business profile found",
          });
        }
        whereClause = { businessId: profile.id };
      }

      const jobs = await prisma.jobPost.findMany({
        where: whereClause,
        include: {
          sector: true,
          jobRole: true,
          business: {
            select: { businessName: true, brandName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ success: true, data: jobs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get job stats (active / inactive / total) — for Admin Dashboard
   */
  getJobStats: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    try {
      const [active, inactive, total] = await Promise.all([
        prisma.jobPost.count({ where: { status: "ACTIVE" } }),
        prisma.jobPost.count({ where: { status: { not: "ACTIVE" } } }),
        prisma.jobPost.count(),
      ]);

      res.json({ success: true, data: { active, inactive, total } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Update a job post
   */
  updateJob: async (req, res) => {
    const { id } = req.params;
    const { user_id: userId } = req.user;
    const userIdentity = req.user.identity || req.user.role || "";
    const isAdmin = ADMIN_IDENTITIES.includes(userIdentity);

    try {
      const job = await prisma.jobPost.findUnique({ where: { id } });
      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found" });
      }

      // Only the creator or an admin can update
      if (!isAdmin && job.creatorId !== userId) {
        return res.status(403).json({ success: false, message: "Not authorized to update this job" });
      }

      const updated = await prisma.jobPost.update({
        where: { id },
        data: {
          ...req.body,
          offeredAmount: req.body.offeredAmount ? parseFloat(req.body.offeredAmount) : undefined,
          noOfOpenings: req.body.noOfOpenings ? parseInt(req.body.noOfOpenings) : undefined,
          applicationCloseDate: req.body.applicationCloseDate
            ? new Date(req.body.applicationCloseDate)
            : undefined,
        },
      });

      res.json({ success: true, message: "Job updated successfully", data: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Delete / close a job post
   */
  deleteJob: async (req, res) => {
    const { id } = req.params;
    const { user_id: userId } = req.user;
    const userIdentity = req.user.identity || req.user.role || "";
    const isAdmin = ADMIN_IDENTITIES.includes(userIdentity);

    try {
      const job = await prisma.jobPost.findUnique({ where: { id } });
      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found" });
      }

      if (!isAdmin && job.creatorId !== userId) {
        return res.status(403).json({ success: false, message: "Not authorized to delete this job" });
      }

      // Soft-close rather than hard delete
      await prisma.jobPost.update({
        where: { id },
        data: { status: "CLOSED" },
      });

      res.json({ success: true, message: "Job closed successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};

module.exports = businessController;
