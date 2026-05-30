const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const jobsController = {
  // નવી જોબ એડ કરવા માટે
  createJob: async (req, res) => {
    try {
      const {
        title,
        companyName,
        salary,
        experience,
        location,
        skills,
        category,
        description,
        vacancies,
        lastDate,
        jobType,
        workMode,
      } = req.body;

      const tenantId = req.user.tenantId || req.user.tenant_id;
      const adminId = req.user.id || req.user.user_id;

      const newJob = await prisma.job.create({
        data: {
          tenantId,
          title,
          companyName,
          salary,
          experience,
          location,
          skills: Array.isArray(skills)
            ? skills
            : skills.split(",").map((s) => s.trim()),
          category,
          description,
          vacancies: parseInt(vacancies) || 1,
          lastDate: lastDate ? new Date(lastDate) : null,
          jobType,
          workMode,
          createdById: adminId,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Job vacancy added successfully",
        data: newJob,
      });
    } catch (error) {
      console.error("Error in createJob:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },
  getJobById: async (req, res) => {
    try {
      const { id } = req.params;

      const job = await prisma.job.findUnique({
        where: {
          id,
        },

        include: {
          createdBy: true,
          applications: true,
        },
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      console.log(error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  // બધી એક્ટિવ જોબ્સ જોવા માટે
  getJobs: async (req, res) => {
    try {
      const { category, tenantId } = req.query;

      const jobs = await prisma.job.findMany({
        // સાચું કર્યું: findMany
        where: {
          status: "ACTIVE",
          ...(category && { category }),
          ...(tenantId && { tenantId }),
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json({ success: true, data: jobs });
    } catch (error) {
      console.error("Error in getJobs:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },
  // In jobs.controller.js — add this new method
  getJobStats: async (req, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const where = tenantId ? { tenantId } : {};

      const [active, inactive, total] = await Promise.all([
        prisma.job.count({ where: { ...where, status: "ACTIVE" } }),
        prisma.job.count({ where: { ...where, status: "INACTIVE" } }),
        prisma.job.count({ where }),
      ]);

      return res.json({ success: true, data: { active, inactive, total } });
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },
};

module.exports = jobsController;
