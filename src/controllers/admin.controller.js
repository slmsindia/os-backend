const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const hasGlobalAdminScope = (user = {}) => {
  const identity = String(user?.identity || '').toUpperCase();
  return identity === "SUPER_ADMIN";
};

const adminController = {
  createIdentity: async (req, res, targetIdentity) => {
    // create state/district/agent
    const { mobile, fullName, password, gender, dateOfBirth, parentId } = req.body;
    const { user_id: myId, tenant_id: myTenantId } = req.user;

    if (!mobile || !fullName || !password) {
      return res.status(400).json({ success: false, message: "Fields missing" });
    }

    try {
      const myIdentity = String(req.user?.identity || '').toUpperCase();

      // Role Ranking Definition (Lower number = Higher Power)
      const roleRank = {
        "SUPER_ADMIN": 0,
        "WHITE_LABEL_ADMIN": 1,
        "ADMIN": 2,
        "SUB_ADMIN": 3,
        "SUPPORT_TEAM": 4,
        "COUNTRY_HEAD": 5,
        "STATE_PARTNER": 6,
        "DISTRICT_PARTNER": 7,
        "BUSINESS_PARTNER": 8,
        "SAATHI": 9,
        "MEMBER": 10,
        "AGENT": 11,
        "USER": 12
      };

      const myRank = roleRank[myIdentity] ?? 99;
      const targetRank = roleRank[targetIdentity] ?? 99;

      // Permission Check: Can only create roles BELOW yourself
      // Exception: Super Admin can create anything, and we allow same-level creation for some roles if needed, 
      // but based on your request, it's a strict top-down hierarchy.
      if (myRank >= targetRank && myIdentity !== "SUPER_ADMIN") {
        return res.status(403).json({
          success: false,
          message: `Your role (${myIdentity}) does not have permission to create a ${targetIdentity}`
        });
      }

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

  createWhiteLabelAdmin: (req, res) => adminController.createIdentity(req, res, "WHITE_LABEL_ADMIN"),
  createAdmin: (req, res) => adminController.createIdentity(req, res, "ADMIN"),
  createSubAdmin: (req, res) => adminController.createIdentity(req, res, "SUB_ADMIN"),
  createCountryHead: (req, res) => adminController.createIdentity(req, res, "COUNTRY_HEAD"),
  createState: (req, res) => adminController.createIdentity(req, res, "STATE_PARTNER"),
  createDistrict: (req, res) => adminController.createIdentity(req, res, "DISTRICT_PARTNER"),
  createAgent: (req, res) => adminController.createIdentity(req, res, "AGENT"),
  createUser: (req, res) => adminController.createIdentity(req, res, "USER"),

  /**
   * Get all users with filtering and pagination
   * Query params: page, limit, identity, approvalStatus, search
   */
  getAllUsers: async (req, res) => {
    const { user_id: adminId } = req.user;
    const myTenantId = req.user?.tenant_id || req.user?.tenantId || req.tenant_id || null;
    const useTenantScope = !hasGlobalAdminScope(req.user);
    const { page = 1, limit = 20, identity, approvalStatus, search, tenantId, parentId } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const andFilters = [];

      // If not SuperAdmin, force tenant scope
      if (useTenantScope && myTenantId) {
        andFilters.push({ tenantId: myTenantId });
      } else if (tenantId) {
        // SuperAdmin can filter by specific tenant
        andFilters.push({ tenantId });
      }

      // Filter by parent/creator
      if (parentId) {
        andFilters.push({ parentId });
      }

      // Filter by identity if provided
      if (identity && String(identity).trim()) {
        const normalizedIdentity = String(identity).trim().toUpperCase();

        if (normalizedIdentity === "MEMBER") {
          andFilters.push({
            OR: [
              { identity: "MEMBER" },
              { membershipApplications: { some: { status: "APPROVED" } } }
            ]
          });
        } else {
          andFilters.push({ identity: normalizedIdentity });
        }
      } else {
        // Hierarchy Visibility Logic
        const myIdentity = String(req.user?.identity || '').toUpperCase();
        if (myIdentity === "ADMIN") {
          // ADMIN only sees SUB_ADMIN and below (Agents, Users)
          andFilters.push({ identity: { in: ["SUB_ADMIN", "AGENT", "USER", "MEMBER"] } });
        } else if (myIdentity === "WHITE_LABEL_ADMIN") {
          // WHITE_LABEL_ADMIN sees everyone in tenant (Admins, SubAdmins, etc)
          // (Tenant filter already applied above)
        }
      }

      // Filter by approval status if provided
      if (approvalStatus) {
        andFilters.push({ approvalStatus });
      }

      // Search by mobile or fullName if provided
      if (search) {
        andFilters.push({
          OR: [
            { mobile: { contains: search } },
            { fullName: { contains: search } },
            { email: { contains: search } }
          ]
        });
      }

      const where = andFilters.length ? { AND: andFilters } : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: "desc" },
          include: {
            wallet: {
              select: {
                balance: true
              }
            },
            membershipApplications: {
              where: { status: "APPROVED" },
              orderBy: { approvedAt: "desc" },
              take: 1
            },
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
          walletBalance: user.wallet?.balance || 0,
          approvedAt: user.membershipApplications?.[0]?.approvedAt || safeUser.approvedAt || null,
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
          },
          filters: {
            tenantId: useTenantScope ? myTenantId : null,
            scope: useTenantScope ? "tenant" : "global",
            identity: identity ? String(identity).trim().toUpperCase() : null,
            approvalStatus: approvalStatus || null,
            search: search || null
          }
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get specific user details by ID
   */
  getUserById: async (req, res) => {
    const { id } = req.params;
    const { user_id: adminId } = req.user;
    const myTenantId = req.user?.tenant_id || req.user?.tenantId || req.tenant_id || null;
    const useTenantScope = !hasGlobalAdminScope(req.user);

    try {
      const whereClause = { id };
      if (useTenantScope && myTenantId) {
        whereClause.tenantId = myTenantId;
      }

      const user = await prisma.user.findFirst({
        where: whereClause,
        include: {
          wallet: {
            select: {
              balance: true
            }
          },
          membershipApplications: {
            where: { status: "APPROVED" },
            orderBy: { approvedAt: "desc" },
            take: 1,
            include: {
              documents: { take: 1 },
              payment: true,
              education: true,
              sector: true,
              jobRole: true
            }
          },
          roles: {
            include: { role: true }
          }
        }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Remove sensitive data
      const { password, ...safeUser } = user;
      
      // Format the response
      const userWithDetails = {
        ...safeUser,
        walletBalance: user.wallet?.balance || 0,
        approvedAt: user.membershipApplications?.[0]?.approvedAt || safeUser.approvedAt || null,
        roles: user.roles.map(ur => ur.role.name),
        // Include membership application details if available
        membershipApplication: user.membershipApplications?.[0] || null
      };

      await logAction({
        userId: adminId,
        action: "VIEW_USER_DETAILS",
        targetId: id,
        tenantId: myTenantId,
        metadata: { userId: id }
      });

      res.json({
        success: true,
        data: userWithDetails
      });
    } catch (err) {
      console.error("Error fetching user details:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get all members (users with membership applications)
   * Query params: page, limit, status (PENDING, APPROVED, REJECTED), search
   */
  getAllMembers: async (req, res) => {
    const { user_id: adminId } = req.user;
    const myTenantId = req.user?.tenant_id || req.user?.tenantId || req.tenant_id || null;
    const useTenantScope = !hasGlobalAdminScope(req.user);
    const { page = 1, limit = 20, status, search } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Build where clause for membership applications
      const applicationWhere = {};
      if (status) {
        applicationWhere.status = status;
      }

      if (useTenantScope && myTenantId) {
        applicationWhere.user = {
          ...(applicationWhere.user || {}),
          tenantId: myTenantId
        };
      }

      if (search && String(search).trim()) {
        const searchValue = String(search).trim();
        applicationWhere.OR = [
          { firstName: { contains: searchValue } },
          { lastName: { contains: searchValue } },
          { email: { contains: searchValue } },
          {
            user: {
              ...(useTenantScope && myTenantId ? { tenantId: myTenantId } : {}),
              mobile: { contains: searchValue }
            }
          },
          {
            user: {
              ...(useTenantScope && myTenantId ? { tenantId: myTenantId } : {}),
              fullName: { contains: searchValue }
            }
          }
        ];
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
          },
          filters: {
            tenantId: useTenantScope ? myTenantId : null,
            scope: useTenantScope ? "tenant" : "global",
            status: status || null,
            search: search || null
          }
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get dashboard statistics
   */
  getStats: async (req, res) => {
    try {
      const myId = req.user?.user_id;
      // Safeguard against undefined which can crash Prisma 6 queries
      const myTenantId = req.user?.tenant_id || req.user?.tenantId || null;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Perform counts with safer 'where' clauses
      const [totalUsers, activeUsersRaw, totalApps, securityAlerts, recentActivity] = await Promise.all([
        // Total Users
        prisma.user.count({ 
          where: { 
            ...(myTenantId ? { tenantId: myTenantId } : {})
          } 
        }),

        // Active Users (Distinct users with logins in last 30 days)
        prisma.auditLog.groupBy({
          by: ['userId'],
          where: {
            ...(myTenantId ? { tenantId: myTenantId } : {}),
            action: 'USER_LOGIN',
            createdAt: { gte: thirtyDaysAgo }
          }
        }),

        // Total Membership Applications
        prisma.membershipApplication.count({ 
          where: { 
            user: { 
                ...(myTenantId ? { tenantId: myTenantId } : {})
            } 
          } 
        }),

        // "Security Alerts" (Significant audit actions)
        prisma.auditLog.count({
          where: {
            ...(myTenantId ? { tenantId: myTenantId } : {}),
            action: { in: ['ROLE_ASSIGNMENT', 'IDENTITY_UPGRADE', 'UNAUTHORIZED_ACCESS'] }
          }
        }),

        // Recent Activity (Removed 'include: user' because relation is not defined in schema)
        prisma.auditLog.findMany({
          where: { 
            ...(myTenantId ? { tenantId: myTenantId } : {})
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        })
      ]);

      // Manual join: fetch users for the recent activity feed
      const userIds = [...new Set(recentActivity.map(log => log.userId).filter(Boolean))];
      const actors = userIds.length > 0 
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true, mobile: true }
          })
        : [];
      
      const actorMap = Object.fromEntries(actors.map(u => [u.id, u.fullName || u.mobile]));

      res.json({
        totalUsers,
        activeUsers: activeUsersRaw.length,
        totalApps,
        securityAlerts,
        recentActivity: recentActivity.map(log => ({
          id: log.id,
          action: log.action.replace(/_/g, ' '),
          actor: actorMap[log.userId] || 'System',
          createdAt: log.createdAt
        }))
      });
    } catch (err) {
      console.error("Error fetching admin stats:", err);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error during stats aggregation",
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  }
};

module.exports = adminController;
