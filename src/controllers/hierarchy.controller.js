const prisma = require("../lib/prisma");

const hierarchyController = {
  /**
   * Get all descendant users in the hierarchy with filtering
   */
  getDescendants: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId, identity: creatorIdentity } = req.user;
    const { 
      identity, 
      status, 
      search, 
      page = 1, 
      limit = 20 
    } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      // Base filter: must be in the same tenant
      const where = {
        tenantId: tenantId,
        id: { not: userId } // Don't include self
      };

      // 1. Hierarchy Filter: 
      // If NOT a Top-Admin, only show users whose path contains the current user's ID
      const topRoles = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'];
      if (!topRoles.includes(creatorIdentity)) {
        where.path = { contains: userId };
      }

      // 2. Identity Filter (e.g., only STATE_PARTNER)
      if (identity) {
        where.identity = identity;
      }

      // 3. Status Filter (e.g., only PENDING)
      if (status) {
        where.approvalStatus = status;
      }

      // 4. Search Filter (Name or Mobile)
      if (search) {
        where.OR = [
          { fullName: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search } }
        ];
      }

      // Debug log
      console.log("[Hierarchy] Fetching descendants for:", { userId, creatorIdentity, where });

      // Execute query
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            mobile: true,
            fullName: true,
            identity: true,
            approvalStatus: true,
            profilePhoto: true,
            createdAt: true,
            parentId: true,
            path: true,
            // Include parent details for context
            parent: {
              select: {
                id: true,
                fullName: true,
                identity: true
              }
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (err) {
      console.error("Hierarchy Fetch Error:", err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  /**
   * Get direct children only (one level down)
   */
  getDirectChildren: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { identity } = req.query;

    try {
      const where = {
        parentId: userId,
        tenantId
      };

      if (identity) {
        where.identity = identity;
      }

      const children = await prisma.user.findMany({
        where,
        select: {
          id: true,
          mobile: true,
          fullName: true,
          identity: true,
          approvalStatus: true,
          profilePhoto: true
        },
        orderBy: { fullName: 'asc' }
      });

      res.json({
        success: true,
        data: children
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = hierarchyController;
