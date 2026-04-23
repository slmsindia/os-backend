const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const adminBusinessController = {
  /**
   * Get all business applications
   */
  getApplications: async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const { tenant_id: tenantId } = req.user;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = {
        ...(status ? { status } : {}),
        user: { tenantId } // Admin only sees applications in their tenant
      };

      const [applications, total] = await Promise.all([
        prisma.businessApplication.findMany({
          where,
          include: {
            user: {
              select: { fullName: true, mobile: true, identity: true }
            },
            sector: true
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: "desc" }
        }),
        prisma.businessApplication.count({ where })
      ]);

      res.json({
        success: true,
        data: applications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Approve or Reject Business Application
   */
  processApplication: async (req, res) => {
    const { id } = req.params;
    const { status, rejectionReason } = req.body; // status: APPROVED or REJECTED
    const { user_id: adminId, tenant_id: tenantId } = req.user;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    if (status === "REJECTED" && !rejectionReason) {
      return res.status(400).json({ success: false, message: "Rejection reason is required" });
    }

    try {
      const application = await prisma.businessApplication.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Update application status
        const updatedApp = await tx.businessApplication.update({
          where: { id },
          data: {
            status,
            rejectionReason: status === "REJECTED" ? rejectionReason : null,
            approvedBy: adminId
          }
        });

        if (status === "APPROVED") {
          // 1. Update user identity to BUSINESS_PARTNER (optional, but requested to gain rights)
          // The user said: "become BUISNESS_PARTNER as well as they are USER,SAATHI, MEMBER"
          // We can set identity to BUSINESS_PARTNER or use a different flag.
          // Let's set it to BUSINESS_PARTNER to grant job posting rights.
          await tx.user.update({
            where: { id: application.userId },
            data: { identity: "BUSINESS_PARTNER" }
          });

          // 2. Create Business Profile
          await tx.businessProfile.upsert({
            where: { userId: application.userId },
            update: {
              businessName: application.businessName,
              brandName: application.brandName,
              ownerName: application.ownerName,
              email: application.email,
              contactNumber1: application.contactNumber1,
              contactNumber2: application.contactNumber2,
              sectorId: application.sectorId,
              address: application.address
            },
            create: {
              id: generateUuid(),
              userId: application.userId,
              businessName: application.businessName,
              brandName: application.brandName,
              ownerName: application.ownerName,
              email: application.email,
              contactNumber1: application.contactNumber1,
              contactNumber2: application.contactNumber2,
              sectorId: application.sectorId,
              address: application.address
            }
          });
        }

        return updatedApp;
      });

      await logAction({
        userId: adminId,
        action: `BUSINESS_APP_${status}`,
        targetId: application.userId,
        tenantId,
        metadata: { applicationId: id, reason: rejectionReason }
      });

      res.json({ success: true, message: `Application ${status.toLowerCase()} successfully` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Master Data Management (Skills, Facilities, Locations)
   */
  createMasterData: async (req, res, modelName) => {
    const { name, code, countryId, stateId, districtId } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const modelMap = {
      skill: 'skill',
      jobFacility: 'jobFacility',
      country: 'country',
      state: 'state',
      district: 'district',
      municipality: 'municipality'
    };

    const prismaModel = modelMap[modelName] || modelName;

    try {
      const data = { 
        id: generateUuid(), 
        name, 
        isActive: true,
        ...(code ? { code } : {}),
        ...(countryId ? { countryId } : {}),
        ...(stateId ? { stateId } : {}),
        ...(districtId ? { districtId } : {})
      };
      
      const item = await prisma[prismaModel].create({ data });
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      console.error(`Master Data Creation Error (${prismaModel}):`, err);
      if (err.code === 'P2002') {
        return res.status(400).json({ success: false, message: `${modelName} with this name already exists` });
      }
      res.status(500).json({ success: false, message: `Error creating ${modelName}`, error: err.message });
    }
  },

  getMasterData: async (req, res, modelName) => {
    // Mapping model names to Prisma Client properties if they differ
    const modelMap = {
      skill: 'skill',
      jobFacility: 'jobFacility',
      country: 'country',
      state: 'state',
      district: 'district',
      municipality: 'municipality'
    };

    const prismaModel = modelMap[modelName] || modelName;

    try {
      if (!prisma[prismaModel]) {
        throw new Error(`Model ${prismaModel} not found in Prisma Client`);
      }

      const items = await prisma[prismaModel].findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      res.json({ success: true, data: items });
    } catch (err) {
      const availableModels = Object.keys(prisma).filter(k => !k.startsWith('_') && typeof prisma[k] === 'object');
      console.error(`Master Data Fetch Error (${prismaModel}):`, err);
      res.status(500).json({ 
        success: false, 
        message: `Error fetching ${modelName}`,
        error: process.env.NODE_ENV !== 'production' ? err.message : undefined,
        debug: process.env.NODE_ENV !== 'production' ? { availableModels } : undefined
      });
    }
  }
};

module.exports = adminBusinessController;
