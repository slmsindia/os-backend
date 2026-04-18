const { PrismaClient } = require("@prisma/client");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const prisma = new PrismaClient();

const businessController = {
  // Create or update business profile
  upsertBusiness: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const {
      companyName,
      registrationNo,
      gstNumber,
      email,
      website,
      address,
      city,
      state,
      country,
      pincode,
      industry,
      companySize,
    } = req.body;

    // Validation
    if (!companyName || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "Company name, address, city, state, and pincode are required",
      });
    }

    try {
      const business = await prisma.business.upsert({
        where: { userId },
        update: {
          companyName,
          registrationNo: registrationNo || undefined,
          gstNumber: gstNumber || undefined,
          email: email || undefined,
          website: website || undefined,
          address,
          city,
          state,
          country: country || "India",
          pincode,
          industry: industry || undefined,
          companySize: companySize || undefined,
        },
        create: {
          id: generateUuid(),
          userId,
          companyName,
          registrationNo: registrationNo || null,
          gstNumber: gstNumber || null,
          email: email || null,
          website: website || null,
          address,
          city,
          state,
          country: country || "India",
          pincode,
          industry: industry || null,
          companySize: companySize || null,
          isVerified: false,
        },
      });

      await logAction({
        userId,
        action: "BUSINESS_PROFILE_UPDATED",
        tenantId,
        metadata: { companyName, city, industry },
      });

      return res.json({
        success: true,
        message: business.isVerified
          ? "Business profile updated"
          : "Business profile created. Awaiting admin verification.",
        business,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get my business profile
  getMyBusiness: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;

    try {
      const business = await prisma.business.findUnique({
        where: { userId },
        include: {
          jobs: {
            where: { status: { not: "CLOSED" } },
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
              _count: { select: { applications: true } },
            },
          },
          schemes: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              title: true,
              category: true,
              createdAt: true,
            },
          },
        },
      });

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Business profile not found. Please create one first.",
        });
      }

      return res.json({
        success: true,
        business,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // List all businesses (public)
  listBusinesses: async (req, res) => {
    const { city, industry, verified } = req.query;
    const { tenant_id: tenantId } = req.user || {};

    try {
      const where = {
        isVerified: verified === "true" ? true : undefined,
        city: city || undefined,
        industry: industry || undefined,
      };

      // Remove undefined values
      Object.keys(where).forEach((key) => {
        if (where[key] === undefined) delete where[key];
      });

      const businesses = await prisma.business.findMany({
        where,
        select: {
          id: true,
          companyName: true,
          industry: true,
          city: true,
          state: true,
          isVerified: true,
          website: true,
          _count: { select: { jobs: { where: { status: "ACTIVE" } } } },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        success: true,
        count: businesses.length,
        businesses,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get business by ID (public)
  getBusinessById: async (req, res) => {
    const { id } = req.params;

    try {
      const business = await prisma.business.findUnique({
        where: { id },
        select: {
          id: true,
          companyName: true,
          industry: true,
          companySize: true,
          city: true,
          state: true,
          country: true,
          website: true,
          isVerified: true,
          jobs: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              title: true,
              employmentType: true,
              city: true,
              salaryMin: true,
              salaryMax: true,
              createdAt: true,
            },
          },
        },
      });

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Business not found",
        });
      }

      return res.json({
        success: true,
        business,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Admin: Verify business
  verifyBusiness: async (req, res) => {
    const { id } = req.params;
    const { verified } = req.body;
    const { user_id: adminId } = req.user;

    try {
      const business = await prisma.business.update({
        where: { id },
        data: {
          isVerified: verified,
          verifiedAt: verified ? new Date() : null,
        },
      });

      await logAction({
        userId: adminId,
        action: verified ? "BUSINESS_VERIFIED" : "BUSINESS_UNVERIFIED",
        targetId: id,
        metadata: { companyName: business.companyName },
      });

      return res.json({
        success: true,
        message: verified
          ? "Business verified successfully"
          : "Business unverified",
        business,
      });
    } catch (err) {
      if (err.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Business not found",
        });
      }
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ==================== JOB MANAGEMENT ====================

  // Create job posting
  createJob: async (req, res) => {
    const { user_id: userId } = req.user;
    const {
      // Support both old and new field names
      title,
      jobRole,
      description,
      jobDescription,
      requirements,
      requiredSkills,
      location,
      fullAddress,
      city,
      district,
      state,
      employmentType,
      jobType,
      payStructure,
      salaryMin,
      offeredAmount,
      salaryMax,
      experienceMin,
      experience,
      experienceMax,
      maxApplicants,
      openings,
      shift,
      urgentHiring,
      education,
      gender,
      minAge,
      maxAge,
      country,
      pincode,
      weekOffDays,
      facilities,
      joiningFees,
      contactName,
      contactNumber,
    } = req.body;

    // Use new field names if provided, fallback to old ones
    const jobTitle = jobRole || title;
    const jobDesc = jobDescription || description;
    const jobReqs = requiredSkills || requirements;
    const jobLocation = fullAddress || location;
    const jobCity = district || city;
    const empType = jobType || employmentType || payStructure;
    const minSalary = offeredAmount || salaryMin;
    const maxSalary = salaryMax || offeredAmount;
    const minExp = experience || experienceMin;
    const maxExp = experienceMax;
    const maxApps = openings || maxApplicants;

    // Validation
    if (!jobTitle || !jobDesc || !jobLocation || !jobCity || !state) {
      return res.status(400).json({
        success: false,
        message: "Title, description, location, city, and state are required",
      });
    }

    try {
      // Check if user has a business
      const business = await prisma.business.findUnique({
        where: { userId },
      });

      if (!business) {
        return res.status(400).json({
          success: false,
          message: "Please create a business profile first",
        });
      }

      if (!business.isVerified) {
        return res.status(403).json({
          success: false,
          message: "Your business must be verified before posting jobs",
        });
      }

      const job = await prisma.job.create({
        data: {
          id: generateUuid(),
          business: { connect: { id: business.id } },
          postedBy: { connect: { id: userId } },
          postedByRole: "BUSINESS_PARTNER",
          jobRole: jobTitle,
          jobDescription: jobDesc,
          requiredSkills: jobReqs || [],
          fullAddress: jobLocation,
          district: jobCity,
          state,
          jobType: empType || "Full Time",
          payStructure: empType || "Full Time",
          offeredAmount: minSalary || null,
          openings: maxApps || 1,
          shift: shift || null,
          urgentHiring: urgentHiring || false,
          education: education || null,
          experience: minExp || 0,
          gender: gender || null,
          minAge: minAge || null,
          maxAge: maxAge || null,
          country: country || "India",
          pincode: pincode || null,
          weekOffDays: weekOffDays || null,
          facilities: facilities || [],
          joiningFees: joiningFees || false,
          contactName: contactName || null,
          contactNumber: contactNumber || null,
          status: "ACTIVE",
        },
      });

      await logAction({
        userId,
        action: "JOB_CREATED",
        targetId: job.id,
        metadata: { title, city },
      });

      return res.status(201).json({
        success: true,
        message: "Job posted successfully",
        job,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get my jobs
  getMyJobs: async (req, res) => {
    const { user_id: userId } = req.user;
    const { status } = req.query;

    try {
      const business = await prisma.business.findUnique({
        where: { userId },
      });

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Business profile not found",
        });
      }

      const jobs = await prisma.job.findMany({
        where: {
          businessId: business.id,
          status: status || undefined,
        },
        include: {
          _count: { select: { applications: true } },
          applications: {
            select: {
              id: true,
              status: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  profile: {
                    select: {
                      title: true,
                      experience: true,
                      skills: true,
                    },
                  },
                },
              },
            },
            take: 5,
            orderBy: { appliedAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        success: true,
        count: jobs.length,
        jobs,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Update job
  updateJob: async (req, res) => {
    const { user_id: userId } = req.user;
    const { id } = req.params;
    const updateData = req.body;

    try {
      const business = await prisma.business.findUnique({
        where: { userId },
      });

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Business profile not found",
        });
      }

      // Check job belongs to this business
      const existingJob = await prisma.job.findFirst({
        where: { id, businessId: business.id },
      });

      if (!existingJob) {
        return res.status(404).json({
          success: false,
          message: "Job not found or you don't have permission",
        });
      }

      const job = await prisma.job.update({
        where: { id },
        data: updateData,
      });

      return res.json({
        success: true,
        message: "Job updated successfully",
        job,
      });
    } catch (err) {
      if (err.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Close job
  closeJob: async (req, res) => {
    const { user_id: userId } = req.user;
    const { id } = req.params;

    try {
      const business = await prisma.business.findUnique({
        where: { userId },
      });

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Business profile not found",
        });
      }

      const job = await prisma.job.updateMany({
        where: { id, businessId: business.id },
        data: { status: "CLOSED" },
      });

      if (job.count === 0) {
        return res.status(404).json({
          success: false,
          message: "Job not found or you don't have permission",
        });
      }

      return res.json({
        success: true,
        message: "Job closed successfully",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get job applicants
  getJobApplicants: async (req, res) => {
    const { user_id: userId } = req.user;
    const { id } = req.params;
    const { status } = req.query;

    try {
      const business = await prisma.business.findUnique({
        where: { userId },
      });

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Business profile not found",
        });
      }

      // Verify job belongs to this business
      const job = await prisma.job.findFirst({
        where: { id, businessId: business.id },
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found or you don't have permission",
        });
      }

      const applications = await prisma.jobApplication.findMany({
        where: {
          jobId: id,
          status: status || undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              mobile: true,
              profile: {
                select: {
                  title: true,
                  bio: true,
                  experience: true,
                  skills: true,
                  city: true,
                  education: true,
                },
              },
            },
          },
        },
        orderBy: { appliedAt: "desc" },
      });

      return res.json({
        success: true,
        count: applications.length,
        applications,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Update application status
  updateApplicationStatus: async (req, res) => {
    const { user_id: userId } = req.user;
    const { id, applicationId } = req.params;
    const { status } = req.body;

    const validStatuses = ["PENDING", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    try {
      const business = await prisma.business.findUnique({
        where: { userId },
      });

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Business profile not found",
        });
      }

      // Verify job belongs to this business
      const job = await prisma.job.findFirst({
        where: { id, businessId: business.id },
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found or you don't have permission",
        });
      }

      const application = await prisma.jobApplication.updateMany({
        where: { id: applicationId, jobId: id },
        data: { status },
      });

      if (application.count === 0) {
        return res.status(404).json({
          success: false,
          message: "Application not found",
        });
      }

      return res.json({
        success: true,
        message: "Application status updated",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};

module.exports = businessController;
