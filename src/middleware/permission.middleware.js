const prisma = require("../lib/prisma");

/**
 * Middleware to check if a user has a specific permission.
 * Admins and Super Admins bypass this and have all permissions.
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const { user_id: userId, identity } = req.user;

      // 1. Bypass for Top Admins
      if (['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(identity)) {
        return next();
      }

      // 2. Only SUB_ADMIN (and potentially others) need explicit permission check
      if (identity !== 'SUB_ADMIN') {
        console.log(`[PermissionDebug] Denied: Identity ${identity} is not SUB_ADMIN and not Top Admin.`);
        return res.status(403).json({ 
          success: false, 
          message: `Forbidden: Your identity (${identity}) does not have access to this feature.` 
        });
      }

      console.log(`[PermissionDebug] Checking ${requiredPermission} for Sub-Admin ID: ${userId}`);

      // 3. Check Database for Sub-Admin permissions
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

      // Extract all permission names
      const permissions = userPermissions.flatMap(ur => 
        ur.role.permissions.map(p => p.permission.name)
      );

      console.log(`[PermissionDebug] Found Permissions for User: [${permissions.join(', ')}]`);

      if (!permissions.includes(requiredPermission)) {
        console.log(`[PermissionDebug] ACCESS DENIED: Required ${requiredPermission} not found in user permissions.`);
        return res.status(403).json({ 
          success: false, 
          message: `Forbidden: You do not have the required permission (${requiredPermission}) to access this feature.` 
        });
      }

      console.log(`[PermissionDebug] ACCESS GRANTED for ${requiredPermission}`);
      next();
    } catch (err) {
      console.error("Permission Middleware Error:", err);
      res.status(500).json({ success: false, message: "Internal server error during permission check" });
    }
  };
};

module.exports = { checkPermission };
