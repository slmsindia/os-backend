const { PrismaClient } = require("@prisma/client");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const prisma = new PrismaClient();

const jobsController = {
  searchJobs: async (req, res) => {
    const { user_id: userId } = req.user || {};
    const { keyword, city, state, skills, minSalary, maxSalary, experience, employmentType, page = 1, limit = 10 } = req.query;

    try {
      const where = { status: "ACTIVE", OR: [{ business: { isVerified: true } }, { businessId: null }] };

      if (keyword) {
        where.OR = [
          { jobRole: { contains: keyword, mode: "insensitive" } },
          { jobDescription: { contains: keyword, mode: "insensitive" } },
        ];
      }
      if (city) where.district = { contains: city, mode: "insensitive" };
      if (state) where.state = { contains: state, mode: "insensitive" };
      if (skills) {
        const skillArray = skills.split(",").map((s) => s.trim());
        where.requiredSkills = { hasSome: skillArray };
      }
      if (minSalary || maxSalary) {
        where.AND = where.AND || [];
        if (minSalary) where.AND.push({ offeredAmount: { gte: parseFloat(minSalary) } });
        if (maxSalary) where.AND.push({ offeredAmount: { lte: parseFloat(maxSalary) } });
      }
      if (experience) where.experience = { lte: parseInt(experience) };
      if (employmentType) where.jobType = employmentType;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where,
          include: { business: { select: { id: true, companyName: true, industry: true, city: true, isVerified: true } }, _count: { select: { applications: true } } },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit),
        }),
        prisma.job.count({ where }),
      ]);

      let jobsWithApplicationStatus = jobs;
      if (userId) {
        const userApplications = await prisma.jobApplication.findMany({ where: { userId }, select: { jobId: true, status: true } });
        const appliedJobIds = new Map(userApplications.map((a) => [a.jobId, a.status]));
        jobsWithApplicationStatus = jobs.map((job) => ({ ...job, hasApplied: appliedJobIds.has(job.id), applicationStatus: appliedJobIds.get(job.id) || null }));
      }

      return res.json({ success: true, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }, jobs: jobsWithApplicationStatus });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getJobDetails: async (req, res) => {
    const { id } = req.params;
    const { user_id: userId } = req.user || {};
    try {
      const job = await prisma.job.findUnique({
        where: { id },
        include: { business: { select: { id: true, companyName: true, industry: true, companySize: true, city: true, state: true, website: true, isVerified: true } }, _count: { select: { applications: true } } },
      });
      if (!job) return res.status(404).json({ success: false, message: "Job not found" });

      let hasApplied = false, applicationStatus = null;
      if (userId) {
        const application = await prisma.jobApplication.findFirst({ where: { jobId: id, userId } });
        if (application) { hasApplied = true; applicationStatus = application.status; }
      }
      return res.json({ success: true, job: { ...job, hasApplied, applicationStatus } });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  applyToJob: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { id } = req.params;
    const { coverLetter, resumeUrl } = req.body;
    try {
      const job = await prisma.job.findUnique({ where: { id }, include: { _count: { select: { applications: true } } } });
      if (!job) return res.status(404).json({ success: false, message: "Job not found" });
      if (job.status !== "ACTIVE") return res.status(400).json({ success: false, message: "This job is no longer accepting applications" });

      const existingApplication = await prisma.jobApplication.findFirst({ where: { jobId: id, userId } });
      if (existingApplication) return res.status(400).json({ success: false, message: "You have already applied to this job", application: existingApplication });

      const application = await prisma.jobApplication.create({ data: { id: generateUuid(), jobId: id, userId, coverLetter: coverLetter || null, resumeUrl: resumeUrl || null, status: "PENDING" } });
      await logAction({ userId, action: "JOB_APPLIED", targetId: id, tenantId, metadata: { jobTitle: job.jobRole } });
      return res.status(201).json({ success: true, message: "Application submitted successfully", application });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getMyApplications: async (req, res) => {
    const { user_id: userId } = req.user;
    const { status } = req.query;
    try {
      const applications = await prisma.jobApplication.findMany({
        where: { userId, status: status || undefined },
        include: { job: { select: { id: true, jobRole: true, jobDescription: true, fullAddress: true, district: true, state: true, offeredAmount: true, jobType: true, openings: true, status: true, business: { select: { companyName: true } } } } },
        orderBy: { appliedAt: "desc" },
      });
      return res.json({ success: true, count: applications.length, applications });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  withdrawApplication: async (req, res) => {
    const { user_id: userId } = req.user;
    const { id } = req.params;
    try {
      const application = await prisma.jobApplication.findFirst({ where: { id, userId } });
      if (!application) return res.status(404).json({ success: false, message: "Application not found" });
      if (application.status !== "PENDING") return res.status(400).json({ success: false, message: "Cannot withdraw application that is already being processed" });
      await prisma.jobApplication.delete({ where: { id } });
      return res.json({ success: true, message: "Application withdrawn successfully" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getRecommendedJobs: async (req, res) => {
    const { user_id: userId } = req.user;
    const { limit = 10 } = req.query;
    try {
      const userProfile = await prisma.userProfile.findUnique({ where: { userId } });
      if (!userProfile) return res.status(400).json({ success: false, message: "Please create a profile first to get job recommendations" });

      const where = { status: "ACTIVE", business: { isVerified: true } };
      if (userProfile.skills && userProfile.skills.length > 0) where.requiredSkills = { hasSome: userProfile.skills };
      if (userProfile.preferredLocation && userProfile.preferredLocation.length > 0) {
        where.OR = [{ district: { in: userProfile.preferredLocation, mode: "insensitive" } }, { state: { in: userProfile.preferredLocation, mode: "insensitive" } }];
      }

      const jobs = await prisma.job.findMany({
        where,
        include: { business: { select: { id: true, companyName: true, industry: true, city: true, isVerified: true } }, _count: { select: { applications: true } } },
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      });

      return res.json({ success: true, count: jobs.length, jobs });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};

module.exports = jobsController;
