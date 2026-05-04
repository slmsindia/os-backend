const prisma = require("../lib/prisma");

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
    const { tenant_id: tenantId } = req.user;
    try {
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
    const { user_id: partnerId, tenant_id: tenantId, identity } = req.user;
    
    try {
      // Find all users in this partner's hierarchy using path search
      const hierarchyScope = {
        OR: [
          { path: { contains: partnerId } },
          { parentId: partnerId }
        ]
      };

      const [userStats, appStats, personalWallet, recentCommissions] = await Promise.all([
        dashboardController.getUserStats({ ...hierarchyScope, tenantId }),
        dashboardController.getApplicationStats({
          membership: { OR: [ { user: hierarchyScope }, { createdById: partnerId } ] },
          saathi: { OR: [ { user: hierarchyScope }, { createdById: partnerId } ] },
          business: { OR: [ { createdById: partnerId } ] }
        }),
        prisma.wallet.findUnique({ where: { userId: partnerId } }),
        prisma.walletTransaction.findMany({
          where: { wallet: { userId: partnerId }, category: 'COMMISSION' },
          take: 5,
          orderBy: { createdAt: 'desc' }
        })
      ]);

      // Calculate total earnings (commission)
      const earnings = await prisma.walletTransaction.aggregate({
        where: { wallet: { userId: partnerId }, category: 'COMMISSION', type: 'CREDIT' },
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
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = dashboardController;
