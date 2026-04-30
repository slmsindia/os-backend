const prisma = require("../lib/prisma");
const { v4: generateUuid } = require("uuid");

const permissionController = {
  /**
   * Initialize standard permissions in the database
   */
  syncPermissions: async (req, res) => {
    const standardPermissions = [
      "HIERARCHY_VIEW",
      "REPORT_VIEW",
      "REPORT_EXPORT",
      "MEMBERSHIP_APPROVE",
      "SAATHI_APPROVE",
      "BUSINESS_APPROVE",
      "WALLET_MANAGE",
      "USER_TOGGLE_STATUS",
      "COMMISSION_VIEW"
    ];

    try {
      for (const pName of standardPermissions) {
        await prisma.permission.upsert({
          where: { name: pName },
          update: {},
          create: { id: generateUuid(), name: pName }
        });
      }
      res.json({ success: true, message: "Standard permissions synced." });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * Get all available permissions in the system
   */
  getAvailablePermissions: async (req, res) => {
    try {
      const permissions = await prisma.permission.findMany();
      res.json({ success: true, data: permissions });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * Assign specific permissions to a Sub-Admin
   */
  assignPermissionsToSubAdmin: async (req, res) => {
    const { subAdminId, permissionIds } = req.body; // Array of permission IDs
    const { user_id: adminId, tenant_id: tenantId } = req.user;

    try {
      // 1. Verify Sub-Admin exists in the same tenant
      const subAdmin = await prisma.user.findFirst({
        where: { id: subAdminId, tenantId, identity: "SUB_ADMIN" }
      });

      if (!subAdmin) {
        return res.status(404).json({ success: false, message: "Sub-Admin not found in your tenant." });
      }

      // 2. Create or find a "Custom Role" for this Sub-Admin
      // In this logic, we'll create a unique role for the user to keep it simple
      const roleName = `ROLE_SUBADMIN_${subAdmin.mobile}`;
      
      let role = await prisma.role.findUnique({ where: { name: roleName } });
      if (!role) {
        role = await prisma.role.create({
          data: { id: generateUuid(), name: roleName }
        });
      }

      // 3. Clear existing and set new permissions
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      
      const newRolePermissions = permissionIds.map(pId => ({
        id: generateUuid(),
        roleId: role.id,
        permissionId: pId
      }));

      await prisma.rolePermission.createMany({ data: newRolePermissions });

      // 4. Link Role to User if not already linked
      const existingUserRole = await prisma.userRole.findFirst({
        where: { userId: subAdminId, roleId: role.id }
      });

      if (!existingUserRole) {
        await prisma.userRole.create({
          data: { id: generateUuid(), userId: subAdminId, roleId: role.id }
        });
      }

      res.json({ success: true, message: "Permissions updated successfully for Sub-Admin." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error assigning permissions" });
    }
  },

  /**
   * Get permissions of a specific Sub-Admin
   */
  getSubAdminPermissions: async (req, res) => {
    const { subAdminId } = req.params;
    try {
      const userRoles = await prisma.userRole.findMany({
        where: { userId: subAdminId },
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

      const permissions = userRoles.flatMap(ur => ur.role.permissions.map(p => p.permission));
      res.json({ success: true, data: permissions });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

module.exports = permissionController;
