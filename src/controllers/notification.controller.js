const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");

const notificationController = {
  /**
   * Get Current User's Notifications
   */
  getNotifications: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId, identity: myIdentity } = req.user;
    try {
      // 1. Fetch user specific private notifications
      const privateNotifications = await prisma.notification.findMany({
        where: { userId, tenantId },
        orderBy: { createdAt: "desc" },
        take: 20
      });

      const unreadCountPrivate = await prisma.notification.count({
        where: { userId, tenantId, isRead: false }
      });

      // 2. Fetch targeted dynamic announcements of type NOTIFICATION
      const activeMarketingNotifications = await prisma.marketingContent.findMany({
        where: {
          tenantId,
          type: "NOTIFICATION",
          isActive: true,
          isGlobalDeactivated: false
        },
        include: {
          creator: { select: { path: true, identity: true } }
        }
      });

      const me = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          path: true, 
          identity: true,
          registrationState: true,
          registrationCity: true,
          registrationPincode: true,
          memberProfile: { select: { currentCountry: true } },
          partnerProfile: { select: { currentCountry: true } }
        }
      });

      let mergedNotifications = [...privateNotifications];

      if (me) {
        const now = new Date();
        const filteredMarketing = activeMarketingNotifications.filter(item => {
          // Creator Exclusion: The user who created the notification does not get it
          if (item.creatorId === userId) {
            return false;
          }

          // WHITE_LABEL_ADMIN does not receive dynamic notifications from themselves or downlines
          if (myIdentity === 'WHITE_LABEL_ADMIN') {
            return false;
          }

          // Hierarchy check
          const creatorIdentity = item.creator?.identity;
          const isSuperAdmin = creatorIdentity === 'SUPER_ADMIN';
          const isWhiteLabelAdmin = creatorIdentity === 'WHITE_LABEL_ADMIN';
          const isSelf = item.creatorId === userId;
          const isInPath = me.path && me.path.includes(item.creatorId);

          const isCreatorAbove = isSuperAdmin || isWhiteLabelAdmin || isSelf || isInPath;
          if (!isCreatorAbove) return false;

          // Validity Schedule Check
          if (item.startDate && now < new Date(item.startDate)) return false;
          if (item.endDate && now > new Date(item.endDate)) return false;

          // Targeting Check
          switch (item.targetType) {
            case 'ALL':
              return true;
            case 'IDENTITY':
              if (!item.targetIdentity) return false;
              return item.targetIdentity.split(',').includes(myIdentity);
            case 'BRANCH':
              return userId === item.targetUserId || (me.path && me.path.includes(item.targetUserId));
            case 'SPECIFIC':
              return userId === item.targetUserId;
            case 'LOCATION': {
              if (item.targetCountries && item.targetCountries.length > 0) {
                const userCountry = me.memberProfile?.currentCountry || me.partnerProfile?.currentCountry || "India";
                if (!item.targetCountries.includes(userCountry)) return false;
              }
              if (item.targetStates && item.targetStates.length > 0) {
                const userState = me.registrationState;
                if (!userState || !item.targetStates.includes(userState)) return false;
              }
              const cityTargets = [...(item.targetCities || []), ...(item.targetDistricts || [])];
              if (cityTargets.length > 0) {
                const userCity = me.registrationCity;
                if (!userCity || !cityTargets.includes(userCity)) return false;
              }
              if (item.targetPincodes && item.targetPincodes.length > 0) {
                const userPincode = me.registrationPincode;
                if (!userPincode || !item.targetPincodes.includes(userPincode)) return false;
              }
              // Optional role filter within location targeting
              if (item.targetIdentity && item.targetIdentity !== 'ALL') {
                const allowedRoles = item.targetIdentity.split(',');
                if (!allowedRoles.includes(myIdentity)) return false;
              }
              return true;
            }
            default:
              return false;
          }
        });

        // Map dynamic announcements to standard notification objects
        const mappedMarketing = filteredMarketing.map(item => ({
          id: item.id,
          userId: userId,
          title: item.title || "Announcement",
          message: item.content || "",
          type: "MARKETING",
          isRead: false, // will be resolved by client
          createdAt: item.createdAt,
          isDynamic: true,
          tenantId
        }));

        mergedNotifications = [...mergedNotifications, ...mappedMarketing];
      }

      // Sort by createdAt descending
      mergedNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Limit to top 20
      const finalNotifications = mergedNotifications.slice(0, 20);

      res.json({
        success: true,
        data: {
          notifications: finalNotifications,
          unreadCount: unreadCountPrivate
        }
      });
    } catch (err) {
      console.error("Get Notifications Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Mark Notification as Read
   */
  markAsRead: async (req, res) => {
    const { id } = req.params;
    const { user_id: userId } = req.user;
    try {
      await prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true }
      });
      res.json({ success: true, message: "Notification marked as read" });
    } catch (err) {
      console.error("Mark Read Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Mark All as Read
   */
  markAllRead: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    try {
      await prisma.notification.updateMany({
        where: { userId, tenantId, isRead: false },
        data: { isRead: true }
      });
      res.json({ success: true, message: "All notifications marked as read" });
    } catch (err) {
      console.error("Mark All Read Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = notificationController;
