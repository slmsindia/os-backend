const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { generateUuid } = require("../utils/id");
const { logAction } = require("../utils/audit");
const walletService = require("../services/wallet.service");

const prisma = new PrismaClient();

const adminMembershipController = {
  /**
   * Create a user directly (Admin/Partner led)
   */
  createUser: async (req, res) => {
    const { mobile, fullName, gender, dateOfBirth, password, identity = "USER" } = req.body;
    const { user_id: creatorId, tenant_id: tenantId } = req.user;

    if (!mobile || !fullName || !gender || !dateOfBirth || !password) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
      const existing = await prisma.user.findUnique({ where: { mobile } });
      if (existing) {
        return res.status(409).json({ success: false, message: "User with this mobile already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Calculate hierarchy path for scalability
      let path = "";
      if (creatorId) {
        const creator = await prisma.user.findUnique({
          where: { id: creatorId },
          select: { id: true, path: true }
        });
        if (creator) {
          path = creator.path ? `${creator.path}/${creator.id}` : `/${creator.id}`;
        }
      }

      const user = await prisma.user.create({
        data: {
          id: generateUuid(),
          mobile,
          fullName,
          gender,
          dateOfBirth: new Date(dateOfBirth),
          password: hashedPassword,
          identity,
          tenantId,
          parentId: creatorId,
          path: path // Store the path for O(1) hierarchy lookups
        }
      });

      res.status(201).json({
        success: true,
        message: "User created successfully under your hierarchy",
        data: { userId: user.id, mobile: user.mobile }
      });
    } catch (err) {
      console.error("Direct User Creation Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
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
   * Delegate membership approval functionality to a lower role/user
   */
  delegateApproval: async (req, res) => {
    const { user_id: adminId, identity: adminIdentity, tenant_id: tenantId } = req.user;
    const { targetUserId, canApprove } = req.body;

    if (adminIdentity !== 'ADMIN' && adminIdentity !== 'SUPER_ADMIN' && adminIdentity !== 'WHITE_LABEL_ADMIN') {
      return res.status(403).json({
        success: false,
        message: "Only Admins can delegate approval functionality"
      });
    }

    try {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId }
      });

      if (!targetUser || targetUser.tenantId !== tenantId) {
        return res.status(404).json({
          success: false,
          message: "Target user not found in your tenant"
        });
      }

      // Check if target user role is eligible
      const ELIGIBLE_ROLES = ['SUB_ADMIN', 'COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'];
      if (!ELIGIBLE_ROLES.includes(targetUser.identity)) {
        return res.status(400).json({
          success: false,
          message: `Cannot delegate to role: ${targetUser.identity}. Eligible roles: ${ELIGIBLE_ROLES.join(', ')}`
        });
      }

      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          canApproveMembership: !!canApprove,
          membershipApprovalDelegatedBy: canApprove ? adminId : null
        }
      });

      await logAction({
        userId: adminId,
        action: "MEMBERSHIP_APPROVAL_DELEGATED",
        targetId: targetUserId,
        tenantId,
        metadata: { canApprove }
      });

      res.json({
        success: true,
        message: `Approval functionality ${canApprove ? 'delegated to' : 'removed from'} user successfully`
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Helper to get all descendant IDs for a user using indexed path search
   */
  getDescendantIds: async (userId) => {
    // High-performance search: find all users whose path contains this ID
    const descendants = await prisma.user.findMany({
      where: {
        path: {
          contains: userId
        }
      },
      select: { id: true }
    });

    return descendants.map(d => d.id);
  },

  /**
   * Get all membership applications (for admin review)
   */
  getMembershipApplications: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const { status, page = 1, limit = 20 } = req.query;

    try {
      const where = {
        user: {
          tenantId: tenantId
        }
      };

      if (status) {
        where.status = status;
      }

      // Hierarchy Visibility Rule (Scalable Version):
      const topRoles = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'];
      if (!topRoles.includes(adminIdentity)) {
        // Optimized: Single query check using path indexing
        where.OR = [
          { user: { path: { contains: adminId } } },
          { user: { parentId: adminId } },
          { createdById: adminId }
        ];
      }

      const applications = await prisma.membershipApplication.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              fullName: true,
              profilePhoto: true,
              parentId: true
            }
          },
          creator: {
            select: {
              id: true,
              fullName: true,
              identity: true
            }
          },
          payment: true
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
          members: applications,
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
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const { applicationId } = req.params;

    try {
      // Check if user has permission to approve
      const admin = await prisma.user.findUnique({
        where: { id: adminId }
      });

      const canApprove = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(adminIdentity) || 
                        admin.canApproveMembership;

      if (!canApprove) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to approve membership applications"
        });
      }

      const application = await prisma.membershipApplication.findUnique({
        where: { id: applicationId },
        include: { user: true }
      });

      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }

      // STRICT HIERARCHY CHECK: 
      // If not a Top Admin, you can only approve users in your own hierarchy
      const topRoles = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'];
      if (!topRoles.includes(adminIdentity)) {
        const descendantIds = await adminMembershipController.getDescendantIds(adminId);
        if (!descendantIds.includes(application.userId) && application.createdById !== adminId) {
          return res.status(403).json({
            success: false,
            message: "You can only approve applications from users in your own hierarchy"
          });
        }
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

      // Update user profile and identity from application data
      await prisma.user.update({
        where: { id: application.userId },
        data: {
          fullName: `${application.firstName} ${application.lastName}`,
          email: application.email,
          gender: application.gender.toUpperCase(),
          userType: 'MEMBER',
          identity: 'MEMBER',
          approvalStatus: 'APPROVED',
          approvedAt: new Date(),
          roleId: null
        }
      });

      // Create wallet for the new member
      try {
        await walletService.createWallet(application.userId);
      } catch (walletErr) {
        console.error("Failed to create wallet for user:", walletErr);
      }

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
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const { applicationId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required"
      });
    }

    try {
      // Check if user has permission to reject
      const admin = await prisma.user.findUnique({
        where: { id: adminId }
      });

      const canReject = adminIdentity === 'SUPER_ADMIN' || 
                        adminIdentity === 'WHITE_LABEL_ADMIN' || 
                        adminIdentity === 'ADMIN' || 
                        admin.canApproveMembership;

      if (!canReject) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to reject membership applications"
        });
      }

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
          rejectionReason: reason,
          approvedBy: adminId // Store who rejected it
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
