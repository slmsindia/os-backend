const prisma = require("../lib/prisma");

/**
 * Middleware to check if a user has a specific permission
 * @param {string} requiredPermission - The name of the permission required (e.g. 'MEMBERSHIP_APPROVE')
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    const { user_id: userId, identity } = req.user;

    // 1. Super Admin and White Label Admin have full access (bypass check)
    if (['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(identity)) {
      return next();
    }

    try {
      // 2. Fetch user's permissions through roles
      const userPermissions = await prisma.userRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true }
              }
            }
          }
        }
      });

      const hasPermission = userPermissions.some(ur => 
        ur.role.permissions.some(rp => rp.permission.name === requiredPermission)
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: `Forbidden: You do not have permission to ${requiredPermission}` 
        });
      }

      next();
    } catch (err) {
      console.error("Permission Middleware Error:", err);
      res.status(500).json({ success: false, message: "Internal server error during permission check" });
    }
  };
};

module.exports = { checkPermission };
