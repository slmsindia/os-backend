const prisma = require("../lib/prisma");
const { normalizeIdentity } = require("../utils/identity");

const resolveTenantId = async (req) => {
  let tenantId = req.user?.tenant_id || req.user?.tenantId || req.tenant_id || null;
  const userId = req.user?.user_id;
  if (!tenantId && userId) {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { tenantId: true }
    });
    tenantId = row?.tenantId || null;
  }
  return tenantId;
};

const dashboardController = {
  /**
   * Helper to get user counts by identity within a specific scope (tenant or hierarchy)
   */
  getUserStats: async (scope) => {
    const users = await prisma.user.groupBy({
      by: ['identity'],
      where: scope,
      _count: { id: true }
    });
    
    const stats = {};
    users.forEach(u => {
      stats[u.identity] = u._count.id;
    });
    return stats;
  },

  /**
   * Helper to get application stats within a specific scope
   */
  getApplicationStats: async (scope) => {
    const [membership, saathi, business] = await Promise.all([
      prisma.membershipApplication.groupBy({ by: ['status'], where: scope.membership || {}, _count: { id: true } }),
      prisma.saathiApplication.groupBy({ by: ['status'], where: scope.saathi || {}, _count: { id: true } }),
      prisma.businessPartnerApplication.groupBy({ by: ['status'], where: scope.business || {}, _count: { id: true } })
    ]);

    const format = (data) => {
      const res = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
      data.forEach(d => { res[d.status] = d._count.id; });
      return res;
    };

    return {
      membership: format(membership),
      saathi: format(saathi),
      business: format(business)
    };
  },

  /**
   * 1. SUPER_ADMIN Dashboard
   */
  getSuperAdminStats: async (req, res) => {
    try {
      const [totalTenants, userStats, appStats, walletStats] = await Promise.all([
        prisma.tenant.count(),
        dashboardController.getUserStats({}),
        dashboardController.getApplicationStats({}),
        prisma.wallet.aggregate({ _sum: { balance: true } })
      ]);

      res.json({
        success: true,
        data: {
          totalTenants,
          users: userStats,
          applications: appStats,
          totalSystemBalance: walletStats._sum.balance || 0
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 2. WHITE_LABEL_ADMIN / ADMIN Dashboard
   */
  getAdminStats: async (req, res) => {
    try {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: "Missing tenant context for dashboard stats."
        });
      }

      const [userStats, appStats, corporateWallet] = await Promise.all([
        dashboardController.getUserStats({ tenantId }),
        dashboardController.getApplicationStats({
          membership: { user: { tenantId } },
          saathi: { user: { tenantId } },
          business: { user: { tenantId } }
        }),
        prisma.wallet.findFirst({ where: { tenantId, isCorporate: true } })
      ]);

      res.json({
        success: true,
        data: {
          users: userStats,
          applications: appStats,
          corporateBalance: corporateWallet?.balance || 0
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 3. SUB_ADMIN Dashboard (Similar to Admin but maybe restricted)
   */
  getSubAdminStats: async (req, res) => {
    // For now, same as Admin but can be customized
    return dashboardController.getAdminStats(req, res);
  },

  /**
   * 4. Partner Dashboard (COUNTRY_HEAD, STATE_PARTNER, DISTRICT_PARTNER)
   */
  getPartnerStats: async (req, res) => {
    const { user_id: partnerId, identity: rawIdentity } = req.user;
    const identity = normalizeIdentity(rawIdentity);

    try {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: "Missing tenant context for dashboard stats."
        });
      }

      const hierarchyScope = {
        tenantId,
        OR: [{ path: { contains: partnerId } }, { parentId: partnerId }]
      };

      const userStats = await dashboardController.getUserStats(hierarchyScope);
      const appStats = await dashboardController.getApplicationStats({
        membership: { OR: [{ user: hierarchyScope }, { createdById: partnerId }] },
        saathi: { OR: [{ user: hierarchyScope }, { createdById: partnerId }] },
        business: { OR: [{ createdById: partnerId }] }
      });
      const personalWallet = await prisma.wallet.findUnique({ where: { userId: partnerId } });
      const recentCommissions = await prisma.walletTransaction.findMany({
        where: { wallet: { userId: partnerId }, category: "COMMISSION" },
        take: 5,
        orderBy: { createdAt: "desc" }
      });
      const earnings = await prisma.walletTransaction.aggregate({
        where: { wallet: { userId: partnerId }, category: "COMMISSION", type: "CREDIT" },
        _sum: { amount: true }
      });

      res.json({
        success: true,
        data: {
          identity,
          users: userStats,
          applications: appStats,
          walletBalance: personalWallet?.balance || 0,
          totalEarnings: earnings._sum.amount || 0,
          recentCommissions
        }
      });
    } catch (err) {
      console.error("getPartnerStats error:", err);
      const isPoolExhausted =
        err?.code === "P2037" || String(err?.message || "").includes("too many clients");
      res.status(isPoolExhausted ? 503 : 500).json({
        success: false,
        message: isPoolExhausted
          ? "Database is busy. Please restart the API server and try again."
          : "Internal server error",
        ...(process.env.NODE_ENV === "development" && { details: err.message })
      });
    }
  }
};

module.exports = dashboardController;
