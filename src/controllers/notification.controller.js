const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");

const notificationController = {
  /**
   * Get Current User's Notifications
   */
  getNotifications: async (req, res) => {
    // Ensure we use the correct tenantId from req.user (set by auth middleware)
    const { user_id: userId, tenant_id: tenantId } = req.user;
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId, tenantId },
        orderBy: { createdAt: "desc" },
        take: 20
      });

      const unreadCount = await prisma.notification.count({
        where: { userId, tenantId, isRead: false }
      });

      res.json({
        success: true,
        data: {
          notifications,
          unreadCount
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
