const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const userController = {
  getProfile: async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.user_id },
        include: { role: true }
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

    if (!roleName) {
      return res.status(400).json({ success: false, message: "roleName is required" });
    }

    try {
      const role = await prisma.role.findUnique({
        where: { name: roleName }
      });

      if (!role) {
        return res.status(404).json({ success: false, message: "Role not found" });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: { roleId: role.id },
        include: { role: true }
      });

      res.json({
        success: true,
        message: "Role updated successfully",
        user: {
          id: updatedUser.id,
          fullName: updatedUser.fullName,
          role: updatedUser.role.name
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
