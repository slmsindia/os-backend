const prisma = require("../lib/prisma");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");
const walletService = require("../services/wallet.service");

<<<<<<< HEAD
const ADMIN_IDENTITIES = [
  "SUPER_ADMIN",
  "WHITE_LABEL_ADMIN",
  "ADMIN",
  "SUB_ADMIN",
];

=======
>>>>>>> origin/main
const businessController = {
  /**
   * Apply to become a Business Partner
   */
  apply: async (req, res) => {
<<<<<<< HEAD
    const {
      businessName, brandName, ownerName, email, contactNumber1, contactNumber2,
      sectorId, businessType, employerType, amount, paymentMode, razorPayReferenceNo,
      address, documents,
=======
    const { 
      businessName, brandName, ownerName, email, contactNumber1, contactNumber2,
      sectorId, businessType, employerType, amount, paymentMode, razorPayReferenceNo,
      address, documents 
>>>>>>> origin/main
    } = req.body;
    const { user_id: userId, tenant_id: tenantId } = req.user;

    try {
<<<<<<< HEAD
=======
      // 1. Verify User Identity (Restriction removed to allow any identity to apply)
>>>>>>> origin/main
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

<<<<<<< HEAD
      const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
      if (!sector) {
        return res.status(400).json({ success: false, message: "Invalid Sector ID." });
=======
      /*
      if (!["USER", "SAATHI", "MEMBER"].includes(user.identity)) {
        return res.status(403).json({ success: false, message: "Only Users, Saathi, or Members can apply for Business Partnership" });
      }
      */

      // 2. Verify Sector ID
      const sector = await prisma.sector.findUnique({ where: { id: sectorId } });
      if (!sector) {
        return res.status(400).json({ success: false, message: "Invalid Sector ID. Please provide a valid ID from the Sector list." });
>>>>>>> origin/main
      }

      const payAmount = parseFloat(amount || 0);
      const payMode = parseInt(paymentMode || 1);

<<<<<<< HEAD
      const application = await prisma.$transaction(async (tx) => {
        const existing = await tx.businessApplication.findFirst({
          where: { userId, status: "PENDING" },
=======
      // 3 & 4. Handle Application and Payment in Transaction
      const application = await prisma.$transaction(async (tx) => {
        // Check for existing pending application
        const existing = await tx.businessApplication.findFirst({
          where: { userId, status: "PENDING" }
>>>>>>> origin/main
        });

        let app;
        if (existing) {
<<<<<<< HEAD
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
=======
          // Update existing
          app = await tx.businessApplication.update({
            where: { id: existing.id },
            data: {
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
              documents
            }
          });
        } else {
          // Create Application first
          app = await tx.businessApplication.create({
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
        }

        // If Wallet, deduct now
        if (payMode === 2) { // WALLET
>>>>>>> origin/main
          const wallet = await walletService.resolveWallet(userId, tenantId, user.identity);
          if (!wallet || wallet.balance < payAmount) {
            throw new Error("Insufficient wallet balance.");
          }
<<<<<<< HEAD
          const adminWallet = await tx.wallet.findFirst({ where: { tenantId, isCorporate: true } });
          if (!adminWallet) throw new Error("Admin wallet not found");
          await walletService.payCreationFeeWithHistory(
            wallet.id, adminWallet.id, payAmount,
            `Business Partner Application Fee for ${businessName}`,
            app.id, tenantId, "WALLET", tx
=======

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
>>>>>>> origin/main
          );
        }

        return app;
      });

      await logAction({
<<<<<<< HEAD
        userId, action: "APPLY_BUSINESS_PARTNER",
        targetId: application.id, tenantId, metadata: { businessName },
=======
        userId,
        action: "APPLY_BUSINESS_PARTNER",
        targetId: application.id,
        tenantId,
        metadata: { businessName }
>>>>>>> origin/main
      });

      res.status(201).json({ success: true, message: "Application submitted successfully", application });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
<<<<<<< HEAD
   * Post a Job — accessible by Business Partners AND Admins
   */
  postJob: async (req, res) => {
    const {
=======
   * Post a Job
   */
  postJob: async (req, res) => {
    const { 
>>>>>>> origin/main
      jobDescription, jobType, payStructure, offeredAmount, educationId, experience,
      gender, minAge, maxAge, officeStartTime, officeEndTime, address, facilities,
      isJoiningFees, joiningAmount, joiningFeeReason, contactName, contactNumber,
      isUrgentHiring, noOfOpenings, shiftType, weekOffDays, skillIds, sectorId,
<<<<<<< HEAD
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
=======
      jobRoleId, applicationCloseDate 
    } = req.body;
    const { user_id: userId, tenant_id: tenantId } = req.user;

    try {
      // Check if user has an approved business profile
      const profile = await prisma.businessProfile.findUnique({ where: { userId } });
      if (!profile) {
        return res.status(403).json({ success: false, message: "Only approved Business Partners can post jobs" });
>>>>>>> origin/main
      }

      const job = await prisma.jobPost.create({
        data: {
          id: generateUuid(),
<<<<<<< HEAD
          // null for admins without a profile, profile.id for business partners
          businessId: profile?.id ?? null,
=======
          businessId: profile.id,
>>>>>>> origin/main
          creatorId: userId,
          jobDescription,
          jobType,
          payStructure,
<<<<<<< HEAD
          offeredAmount: parseFloat(offeredAmount),
          educationId,
          experience,
          gender,
          minAge: parseInt(minAge) || 18,
          maxAge: parseInt(maxAge) || 60,
=======
          offeredAmount,
          educationId,
          experience,
          gender,
          minAge,
          maxAge,
>>>>>>> origin/main
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
<<<<<<< HEAD
          noOfOpenings: parseInt(noOfOpenings) || 1,
=======
          noOfOpenings,
>>>>>>> origin/main
          shiftType,
          weekOffDays,
          skillIds,
          sectorId,
          jobRoleId,
<<<<<<< HEAD
          applicationCloseDate: new Date(applicationCloseDate),
        },
      });

      await logAction({
        userId, action: "POST_JOB",
        targetId: job.id, tenantId,
        metadata: { jobDescription: jobDescription.substring(0, 50) },
=======
          applicationCloseDate: new Date(applicationCloseDate)
        }
      });

      await logAction({
        userId,
        action: "POST_JOB",
        targetId: job.id,
        tenantId,
        metadata: { jobDescription: jobDescription.substring(0, 50) }
>>>>>>> origin/main
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
<<<<<<< HEAD
        orderBy: { createdAt: "desc" },
=======
        orderBy: { createdAt: "desc" }
>>>>>>> origin/main
      });

      res.json({
        success: true,
        isBusinessPartner: !!profile,
        profile,
<<<<<<< HEAD
        latestApplication,
=======
        latestApplication
>>>>>>> origin/main
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
<<<<<<< HEAD
   * Get all active jobs (for public browsing)
=======
   * Get all jobs (for browsing)
>>>>>>> origin/main
   */
  getJobs: async (req, res) => {
    try {
      const jobs = await prisma.jobPost.findMany({
<<<<<<< HEAD
        where: { status: "ACTIVE" },
        include: {
          business: {
            select: { businessName: true, brandName: true, address: true },
          },
          sector: true,
          jobRole: true,
        },
        orderBy: { createdAt: "desc" },
=======
        where: { status: 'ACTIVE' },
        include: {
          business: { select: { businessName: true, brandName: true, address: true } },
          sector: true,
          jobRole: true
        },
        orderBy: { createdAt: 'desc' }
>>>>>>> origin/main
      });

      res.json({ success: true, data: jobs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get jobs posted by the current user
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main
      });

      res.json({ success: true, data: jobs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
<<<<<<< HEAD
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
=======
  }
};

module.exports = businessController;
>>>>>>> origin/main
