const { PrismaClient } = require("@prisma/client");
const { generateUuid } = require("../utils/id");
const { logAction } = require("../utils/audit");

const prisma = new PrismaClient();

const adminMembershipController = {
  /**
   * Update membership price
   */
  updateMembershipPrice: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId } = req.user;
    const { price } = req.body;

    if (!price || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid price"
      });
    }

    try {
      // Deactivate old config
      await prisma.membershipConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });

      // Create new config
      const config = await prisma.membershipConfig.create({
        data: {
          id: generateUuid(),
          membershipPrice: parseFloat(price),
          currency: 'INR',
          isActive: true
        }
      });

      await logAction({
        userId: adminId,
        action: "MEMBERSHIP_PRICE_UPDATED",
        tenantId,
        metadata: { price: config.membershipPrice }
      });

      res.json({
        success: true,
        message: "Membership price updated successfully",
        data: {
          price: config.membershipPrice,
          currency: config.currency
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get all membership applications (for admin review)
   */
  getMembershipApplications: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId } = req.user;
    const { status, page = 1, limit = 20 } = req.query;

    try {
      const where = {};
      if (status) {
        where.status = status;
      }

      const applications = await prisma.membershipApplication.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              fullName: true
            }
          },
          payment: true,
          education: true,
          sector: true,
          jobRole: true,
          documents: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      });

      const total = await prisma.membershipApplication.count({ where });

      await logAction({
        userId: adminId,
        action: "VIEW_MEMBERSHIP_APPLICATIONS",
        tenantId
      });

      res.json({
        success: true,
        data: {
          applications,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get single membership application details
   */
  getApplicationDetails: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId } = req.user;
    const { applicationId } = req.params;

    try {
      const application = await prisma.membershipApplication.findUnique({
        where: { id: applicationId },
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              fullName: true
            }
          },
          payment: true,
          education: true,
          sector: true,
          jobRole: true,
          documents: true
        }
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found"
        });
      }

      await logAction({
        userId: adminId,
        action: "VIEW_MEMBERSHIP_APPLICATION",
        targetId: applicationId,
        tenantId
      });

      res.json({
        success: true,
        data: application
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Approve membership application
   */
  approveApplication: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId } = req.user;
    const { applicationId } = req.params;

    try {
      const application = await prisma.membershipApplication.findUnique({
        where: { id: applicationId },
        include: {
          payment: true
        }
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found"
        });
      }

      if (application.payment?.status !== 'SUCCESS') {
        return res.status(400).json({
          success: false,
          message: "Payment not completed for this application"
        });
      }

      if (application.status === 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: "Application already approved"
        });
      }

      // Update application status
      const updated = await prisma.membershipApplication.update({
        where: { id: applicationId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: adminId
        }
      });

      // Update user type to MEMBER
      await prisma.user.update({
        where: { id: application.userId },
        data: {
          userType: 'MEMBER'
        }
      });

      await logAction({
        userId: adminId,
        action: "MEMBERSHIP_APPLICATION_APPROVED",
        targetId: applicationId,
        tenantId,
        metadata: { userId: application.userId }
      });

      res.json({
        success: true,
        message: "Membership application approved successfully",
        data: {
          applicationId: updated.id,
          userId: application.userId
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Reject membership application
   */
  rejectApplication: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId } = req.user;
    const { applicationId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required"
      });
    }

    try {
      const application = await prisma.membershipApplication.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found"
        });
      }

      if (application.status === 'REJECTED') {
        return res.status(400).json({
          success: false,
          message: "Application already rejected"
        });
      }

      // Update application status
      const updated = await prisma.membershipApplication.update({
        where: { id: applicationId },
        data: {
          status: 'REJECTED',
          rejectionReason: reason
        }
      });

      await logAction({
        userId: adminId,
        action: "MEMBERSHIP_APPLICATION_REJECTED",
        targetId: applicationId,
        tenantId,
        metadata: { reason, userId: application.userId }
      });

      res.json({
        success: true,
        message: "Membership application rejected",
        data: {
          applicationId: updated.id,
          rejectionReason: reason
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Education Management
   */
  createEducation: async (req, res) => {
    const { user_id: adminId } = req.user;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Education name is required"
      });
    }

    try {
      const education = await prisma.education.create({
        data: {
          id: generateUuid(),
          name: name.trim()
        }
      });

      await logAction({
        userId: adminId,
        action: "EDUCATION_CREATED",
        targetId: education.id
      });

      res.status(201).json({
        success: true,
        message: "Education created successfully",
        data: education
      });
    } catch (err) {
      console.error(err);
      if (err.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: "Education already exists"
        });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getEducations: async (req, res) => {
    try {
      const educations = await prisma.education.findMany({
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: educations
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Sector Management
   */
  createSector: async (req, res) => {
    const { user_id: adminId } = req.user;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Sector name is required"
      });
    }

    try {
      const sector = await prisma.sector.create({
        data: {
          id: generateUuid(),
          name: name.trim()
        }
      });

      await logAction({
        userId: adminId,
        action: "SECTOR_CREATED",
        targetId: sector.id
      });

      res.status(201).json({
        success: true,
        message: "Sector created successfully",
        data: sector
      });
    } catch (err) {
      console.error(err);
      if (err.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: "Sector already exists"
        });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getSectors: async (req, res) => {
    try {
      const sectors = await prisma.sector.findMany({
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: sectors
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Job Role Management
   */
  createJobRole: async (req, res) => {
    const { user_id: adminId } = req.user;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Job role name is required"
      });
    }

    try {
      const jobRole = await prisma.jobRole.create({
        data: {
          id: generateUuid(),
          name: name.trim()
        }
      });

      await logAction({
        userId: adminId,
        action: "JOB_ROLE_CREATED",
        targetId: jobRole.id
      });

      res.status(201).json({
        success: true,
        message: "Job role created successfully",
        data: jobRole
      });
    } catch (err) {
      console.error(err);
      if (err.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: "Job role already exists"
        });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getJobRoles: async (req, res) => {
    try {
      const jobRoles = await prisma.jobRole.findMany({
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: jobRoles
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Document Type Management
   */
  createDocumentType: async (req, res) => {
    const { user_id: adminId } = req.user;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Document type name is required"
      });
    }

    try {
      const documentType = await prisma.documentType.create({
        data: {
          id: generateUuid(),
          name: name.trim()
        }
      });

      await logAction({
        userId: adminId,
        action: "DOCUMENT_TYPE_CREATED",
        targetId: documentType.id
      });

      res.status(201).json({
        success: true,
        message: "Document type created successfully",
        data: documentType
      });
    } catch (err) {
      console.error(err);
      if (err.code === 'P2002') {
        return res.status(400).json({
          success: false,
          message: "Document type already exists"
        });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getDocumentTypes: async (req, res) => {
    try {
      const documentTypes = await prisma.documentType.findMany({
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: documentTypes
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = adminMembershipController;
