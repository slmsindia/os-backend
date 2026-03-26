const { logAction } = require("../utils/audit");

const userController = {
  getProfile: async (req, res) => {
    const { user_id: myId, tenant_id: myTenantId } = req.user;
    try {
      const user = await prisma.user.findFirst({
        where: { id: myId, tenantId: myTenantId },
        include: { roles: { include: { role: true } } }
      });

      if (!user) return res.status(404).json({ message: "user not found" });

      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "error" });
    }
  },

  changeRole: async (req, res) => {
    const { id } = req.params;
    const { roleName } = req.body;
    const { user_id: myId, tenant_id: myTenantId } = req.user;

    if (!roleName) {
      return res.status(400).json({ success: false, message: "roleName is required" });
    }

    try {
      // 1. Domain/Tenant scoped user check
      const targetUser = await prisma.user.findFirst({
        where: { id, tenantId: myTenantId }
      });

      if (!targetUser) {
        return res.status(404).json({ success: false, message: "User not found in tenant" });
      }

      const role = await prisma.role.findUnique({
        where: { name: roleName }
      });

      if (!role) {
        return res.status(404).json({ success: false, message: "Role not found" });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          roles: {
            upsert: {
              where: { userId_roleId: { userId: id, roleId: role.id } },
              create: { roleId: role.id },
              update: {}
            }
          }
        },
        include: { roles: { include: { role: true } } }
      });

      await logAction({
        userId: myId,
        action: "ROLE_ASSIGNMENT",
        targetId: id,
        tenantId: myTenantId,
        metadata: { roleName }
      });

      res.json({
        success: true,
        message: "Role assigned successfully",
        user: {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          roles: updatedUser.roles.map(ur => ur.role.name)
        }
      });
    } catch (err) {
      console.error(err);
      if (err.code === 'P2025') {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = userController;
