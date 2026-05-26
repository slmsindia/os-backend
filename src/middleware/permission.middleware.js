const prisma = require("../lib/prisma");
const { normalizeIdentity } = require("../utils/identity");

/**
 * Middleware to check if a user has a specific permission.
 * Admins and Super Admins bypass this and have all permissions.
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const requiredPermissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
      const { user_id: userId, identity } = req.user;
      const normalizedIdentity = normalizeIdentity(identity);

      // 1. Bypass Logic
      // - Top Admins always bypass.
      // - Other identities (Country Head, State Partner, etc.) bypass because this 
      //   granular permission system is currently specialized for Sub-Admin delegation only.
      if (normalizedIdentity !== 'SUB_ADMIN') {
        return next();
      }

      console.log(`[PermissionDebug] Checking ${requiredPermissions.join(' or ')} for Sub-Admin ID: ${userId}`);

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

      if (!requiredPermissions.some(permission => permissions.includes(permission))) {
        console.log(`[PermissionDebug] ACCESS DENIED: Required ${requiredPermissions.join(' or ')} not found in user permissions.`);
        return res.status(403).json({ 
          success: false, 
          message: `Forbidden: You do not have the required permission (${requiredPermissions.join(' or ')}) to access this feature.` 
        });
      }

      console.log(`[PermissionDebug] ACCESS GRANTED for ${requiredPermissions.join(' or ')}`);
      next();
    } catch (err) {
      console.error("Permission Middleware Error:", err);
      res.status(500).json({ success: false, message: "Internal server error during permission check" });
    }
  };
};

module.exports = { checkPermission };
