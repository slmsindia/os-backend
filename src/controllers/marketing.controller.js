const prisma = require("../lib/prisma");

const marketingController = {
  /**
   * Create Marketing Content (Admin only)
   */
  createContent: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { type, title, content, imageUrl, linkUrl, targetType, targetIdentity, targetUserId } = req.body;

    try {
      const marketing = await prisma.marketingContent.create({
        data: {
          type,
          title,
          content,
          imageUrl,
          linkUrl,
          targetType,
          targetIdentity,
          targetUserId,
          creatorId: userId,
          tenantId
        }
      });

      res.status(201).json({ success: true, message: "Marketing content created", data: marketing });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get Content for Current User (Targeted)
   */
  getContentForMe: async (req, res) => {
    const { user_id: userId, identity: myIdentity, tenant_id: tenantId } = req.user;

    try {
      const me = await prisma.user.findUnique({
        where: { id: userId },
        select: { path: true, identity: true }
      });

      // Find all active marketing content for this tenant
      const allContent = await prisma.marketingContent.findMany({
        where: {
          tenantId,
          isActive: true,
          isGlobalDeactivated: false
        },
        include: {
          creator: { select: { path: true } }
        }
      });

      // Filter content based on hierarchical targeting rules
      const myContent = allContent.filter(item => {
        // 1. Hierarchy Check: Is the creator above me in the tree?
        // (If creator is SUPER_ADMIN, it's global for the tenant. Otherwise must be in my path)
        const isCreatorAbove = item.creatorId === userId || (me.path && me.path.includes(item.creatorId));
        
        if (!isCreatorAbove) return false;

        // 2. Targeting Check
        switch (item.targetType) {
          case 'ALL':
            return true;
          case 'IDENTITY':
            return myIdentity === item.targetIdentity;
          case 'BRANCH':
            // Target specific branch: Me or someone in my path must be the targetUserId
            return userId === item.targetUserId || (me.path && me.path.includes(item.targetUserId));
          case 'SPECIFIC':
            return userId === item.targetUserId;
          default:
            return false;
        }
      });

      res.json({ success: true, data: myContent });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Admin: List my created content
   */
  getMyContent: async (req, res) => {
    const { user_id: userId } = req.user;
    try {
      const content = await prisma.marketingContent.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: content });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Admin: Update/Toggle content
   */
  updateContent: async (req, res) => {
    const { user_id: userId } = req.user;
    const { id } = req.params;
    const { isActive, title, content, imageUrl, linkUrl } = req.body;

    try {
      const existing = await prisma.marketingContent.findUnique({ where: { id } });
      if (!existing || existing.creatorId !== userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      const updated = await prisma.marketingContent.update({
        where: { id },
        data: { isActive, title, content, imageUrl, linkUrl }
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Super Admin: Master Deactivation
   */
  superAdminToggle: async (req, res) => {
    const { identity } = req.user;
    const { id } = req.params;
    const { isGlobalDeactivated } = req.body;

    if (identity !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: "Only Super Admin can perform this action" });
    }

    try {
      const updated = await prisma.marketingContent.update({
        where: { id },
        data: { isGlobalDeactivated }
      });

      res.json({ success: true, message: "Global status updated", data: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Super Admin: List all marketing content for review
   */
  superAdminListAll: async (req, res) => {
    const { identity } = req.user;
    if (identity !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    try {
      const all = await prisma.marketingContent.findMany({
        include: { creator: { select: { fullName: true, identity: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ success: true, data: all });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = marketingController;
