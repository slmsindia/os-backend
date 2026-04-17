const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const adminController = {
  createIdentity: async (req, res, targetIdentity) => {
    // create state/district/agent
    const { mobile, fullName, password, gender, dateOfBirth, parentId } = req.body;
    const { user_id: myId, tenant_id: myTenantId } = req.user;

    if (!mobile || !fullName || !password) {
      return res.status(400).json({ success: false, message: "Fields missing" });
    }

    try {
      let finalParentId = myId;

      // If explicit parentId provided, verify it belongs to same tenant
      if (parentId) {
        const parent = await prisma.user.findFirst({
          where: { id: parentId, tenantId: myTenantId }
        });
        if (!parent) {
          return res.status(400).json({ success: false, message: "Invalid parentId for this tenant" });
        }
        finalParentId = parentId;
      }

      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          id: generateUuid(),
          mobile,
          fullName,
          password: hash,
          gender,
          dateOfBirth: new Date(dateOfBirth),
          identity: targetIdentity,
          tenantId: myTenantId,
          parentId: finalParentId,
          createdBy: myId
        }
      });

      await logAction({
        userId: myId,
        action: `CREATE_${targetIdentity}`,
        targetId: user.id,
        tenantId: myTenantId,
        metadata: { mobile: user.mobile }
      });

      res.status(201).json({ success: true, user: { id: user.id, mobile: user.mobile, identity: user.identity } });
    } catch (err) {
      console.error(err);
      if (err.code === "P2002") {
        return res.status(400).json({ success: false, message: "Mobile already exists" });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  createState: (req, res) => adminController.createIdentity(req, res, "STATE_PARTNER"),
  createDistrict: (req, res) => adminController.createIdentity(req, res, "DISTRICT_PARTNER"),
  createAgent: (req, res) => adminController.createIdentity(req, res, "AGENT"),
  createUser: (req, res) => adminController.createIdentity(req, res, "USER"),

  /**
   * Get all users with filtering and pagination
   * Query params: page, limit, identity, approvalStatus, search
   */
  getAllUsers: async (req, res) => {
    const { user_id: adminId, tenant_id: myTenantId } = req.user;
    const { page = 1, limit = 20, identity, approvalStatus, search } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where = {
        tenantId: myTenantId
      };

      // Filter by identity if provided
      if (identity) {
        where.identity = identity;
      }

      // Filter by approval status if provided
      if (approvalStatus) {
        where.approvalStatus = approvalStatus;
      }

      // Search by mobile or fullName if provided
      if (search) {
        where.OR = [
          { mobile: { contains: search } },
          { fullName: { contains: search } }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: "desc" },
          include: {
            roles: {
              include: { role: true }
            }
          }
        }),
        prisma.user.count({ where })
      ]);

      // Remove sensitive data
      const safeUsers = users.map(user => {
        const { password, ...safeUser } = user;
        return {
          ...safeUser,
          roles: user.roles.map(ur => ur.role.name)
        };
      });

      await logAction({
        userId: adminId,
        action: "VIEW_ALL_USERS",
        tenantId: myTenantId,
        metadata: { page: parseInt(page), limit: parseInt(limit) }
      });

      res.json({
        success: true,
        data: {
          users: safeUsers,
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
   * Get all members (users with membership applications)
   * Query params: page, limit, status (PENDING, APPROVED, REJECTED), search
   */
  getAllMembers: async (req, res) => {
    const { user_id: adminId, tenant_id: myTenantId } = req.user;
    const { page = 1, limit = 20, status, search } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Build where clause for membership applications
      const applicationWhere = {};
      if (status) {
        applicationWhere.status = status;
      }

      const [applications, total] = await Promise.all([
        prisma.membershipApplication.findMany({
          where: applicationWhere,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                mobile: true,
                fullName: true,
                email: true,
                profilePhoto: true,
                identity: true
              }
            },
            payment: true,
            education: true,
            sector: true,
            jobRole: true
          }
        }),
        prisma.membershipApplication.count({ where: applicationWhere })
      ]);

      await logAction({
        userId: adminId,
        action: "VIEW_ALL_MEMBERS",
        tenantId: myTenantId,
        metadata: { page: parseInt(page), limit: parseInt(limit), status }
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
  }
};

module.exports = adminController;
