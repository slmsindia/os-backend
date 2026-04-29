const prisma = require("../lib/prisma");
const { v4: generateUuid } = require("uuid");

const hierarchyController = {
  /**
   * GET /api/admin/hierarchy/children
   */
  getDirectChildren: async (req, res) => {
    const { user_id: currentUserId, tenant_id: tenantId, identity: creatorIdentity } = req.user;
    const { parentId, identity, startDate, endDate, page = 1, limit = 20 } = req.query;

    try {
      let targetParentId = parentId || currentUserId;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const isTopAdmin = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(creatorIdentity);
      if (!isTopAdmin && targetParentId !== currentUserId) {
        const targetUser = await prisma.user.findUnique({ where: { id: targetParentId }, select: { path: true } });
        if (!targetUser || !targetUser.path || !targetUser.path.includes(currentUserId)) {
          return res.status(403).json({ success: false, message: "Permission denied." });
        }
      }

      const where = { parentId: targetParentId, tenantId };
      if (identity) where.identity = identity;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) {
           const end = new Date(endDate);
           end.setHours(23, 59, 59, 999);
           where.createdAt.lte = end;
        }
      }

      const [children, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true, mobile: true, fullName: true, email: true, gender: true,
            dateOfBirth: true, identity: true, approvalStatus: true,
            profilePhoto: true, createdAt: true,
            wallet: { select: { balance: true } },
            _count: { select: { children: true } }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      res.json({
        success: true,
        data: children.map(c => ({
          ...c,
          hasChildren: c._count.children > 0,
          balance: c.wallet?.balance || 0
        })),
        pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * GET /api/admin/hierarchy/user-history/:targetUserId
   */
  getUserWalletHistory: async (req, res) => {
    const { user_id: currentUserId, tenant_id: tenantId, identity: creatorIdentity } = req.user;
    const { targetUserId } = req.params;
    const { page = 1, limit = 20, startDate, endDate, type, category } = req.query;

    try {
      const isTopAdmin = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(creatorIdentity);
      if (!isTopAdmin && targetUserId !== currentUserId) {
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { path: true } });
        if (!targetUser || !targetUser.path || !targetUser.path.includes(currentUserId)) {
          return res.status(403).json({ success: false, message: "Permission denied." });
        }
      }

      let targetWallet = await prisma.wallet.findUnique({ where: { userId: targetUserId } });
      if (!targetWallet) {
        targetWallet = await prisma.wallet.create({
          data: { id: generateUuid(), userId: targetUserId, tenantId, balance: 0, isCorporate: false }
        });
      }

      const where = { walletId: targetWallet.id };
      if (type) where.type = type;
      if (category) where.category = category;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) {
           const end = new Date(endDate);
           end.setHours(23, 59, 59, 999);
           where.createdAt.lte = end;
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [txns, total] = await Promise.all([
        prisma.walletTransaction.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.walletTransaction.count({ where })
      ]);

      res.json({
        success: true,
        data: txns,
        balance: targetWallet.balance,
        pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * GET /api/admin/hierarchy/members
   * Enhanced with CSV EXPORT
   */
  getDescendants: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId, identity: creatorIdentity } = req.user;
    const { identity, status, search, page = 1, limit = 20, startDate, endDate, parentId, exportCsv = "false" } = req.query;

    try {
      let baseId = parentId || userId;
      const where = { tenantId };
      
      if (baseId !== userId || !['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(creatorIdentity)) {
          where.path = { contains: baseId };
          where.id = { not: baseId };
      } else {
          where.id = { not: userId };
      }

      if (identity) where.identity = identity;
      if (status) where.approvalStatus = status;
      if (search) {
        where.OR = [{ fullName: { contains: search, mode: 'insensitive' } }, { mobile: { contains: search } }];
      }
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) {
           const end = new Date(endDate);
           end.setHours(23, 59, 59, 999);
           where.createdAt.lte = end;
        }
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true, mobile: true, fullName: true, email: true, gender: true,
          dateOfBirth: true, identity: true, approvalStatus: true,
          profilePhoto: true, createdAt: true, path: true,
          wallet: { select: { balance: true } }
        },
        orderBy: { createdAt: 'desc' },
        ...(exportCsv === "true" ? {} : { skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit) })
      });

      const total = await prisma.user.count({ where });

      // Enrichment logic for hierarchy names
      const allPathIds = new Set();
      users.forEach(u => { if (u.path) u.path.split('/').forEach(id => { if (id && id.length > 5) allPathIds.add(id); }); });

      const pathUsers = await prisma.user.findMany({
        where: { id: { in: Array.from(allPathIds) } },
        select: { id: true, fullName: true, identity: true }
      });
      const userMap = Object.fromEntries(pathUsers.map(u => [u.id, u]));

      const enrichedUsers = users.map(u => {
        const pathArray = u.path ? u.path.split('/').filter(id => id && id.length > 5) : [];
        const partners = pathArray.map(id => userMap[id]).filter(Boolean);
        return {
          ...u,
          balance: u.wallet?.balance || 0,
          hierarchyInfo: {
            countryHead: partners.find(p => p.identity.includes('COUNTRY')),
            statePartner: partners.find(p => p.identity.includes('STATE')),
            districtPartner: partners.find(p => p.identity.includes('DISTRICT'))
          }
        };
      });

      // --- CSV EXPORT LOGIC ---
      if (exportCsv === "true") {
        const headers = ["ID", "Name", "Mobile", "Email", "Role", "Gender", "DOB", "Status", "Balance", "Country Head", "State Partner", "District Partner", "Created At"];
        let csv = headers.join(",") + "\n";
        
        enrichedUsers.forEach(u => {
          const values = [
            u.id, u.fullName, u.mobile, u.email || "N/A", u.identity, u.gender,
            u.dateOfBirth?.toISOString() || "N/A", u.approvalStatus, u.balance,
            u.hierarchyInfo.countryHead?.fullName || "N/A",
            u.hierarchyInfo.statePartner?.fullName || "N/A",
            u.hierarchyInfo.districtPartner?.fullName || "N/A",
            u.createdAt.toISOString()
          ];
          csv += values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=hierarchy_report.csv`);
        return res.status(200).send(csv);
      }

      // Identity summary for pagination view
      const identityStats = await prisma.user.groupBy({ by: ['identity'], where: where, _count: { _all: true } });
      const summary = {};
      identityStats.forEach(s => { summary[s.identity] = s._count._all; });

      res.json({
        success: true,
        data: {
          users: enrichedUsers,
          summary,
          pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) }
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = hierarchyController;
