const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const VALID_USER_TYPES = [
  "USER",
  "MEMBER",
  "SAATHI",
  "BUSINESS_PARTNER",
  "STATE_PARTNER",
  "DISTRICT_PARTNER",
  "COUNTRY_HEAD",
  "ADMIN"
];

const normalizeUserType = (value) => {
  if (!value || typeof value !== "string") return "USER";
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
};

const getOrCreateRole = async (roleName) => {
  let role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    role = await prisma.role.create({ data: { name: roleName } });
  }
  return role;
};

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
  },

  listPendingApprovals: async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { approvalStatus: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: { role: true }
      });

      const data = users.map((user) => ({
        id: user.id,
        mobile: user.mobile,
        fullName: user.fullName,
        userType: user.userType,
        role: user.role?.name,
        approvalStatus: user.approvalStatus,
        createdAt: user.createdAt
      }));

      res.json({ success: true, users: data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  approveUser: async (req, res) => {
    const { id } = req.params;
    const { approve = true } = req.body;

    try {
      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: "User not found" });

      if (!approve) {
        const rejected = await prisma.user.update({
          where: { id },
          data: { approvalStatus: "REJECTED", approvedAt: null },
          include: { role: true }
        });

        return res.json({
          success: true,
          message: "User request rejected",
          user: {
            id: rejected.id,
            fullName: rejected.fullName,
            userType: rejected.userType,
            approvalStatus: rejected.approvalStatus,
            role: rejected.role?.name
          }
        });
      }

      const role = await getOrCreateRole(existing.userType);
      const approved = await prisma.user.update({
        where: { id },
        data: {
          approvalStatus: "APPROVED",
          approvedAt: new Date(),
          roleId: role.id
        },
        include: { role: true }
      });

      return res.json({
        success: true,
        message: "User approved successfully",
        user: {
          id: approved.id,
          fullName: approved.fullName,
          userType: approved.userType,
          approvalStatus: approved.approvalStatus,
          role: approved.role?.name
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  setUserType: async (req, res) => {
    const { id } = req.params;
    const { userType } = req.body;

    const normalizedUserType = normalizeUserType(userType);
    if (!VALID_USER_TYPES.includes(normalizedUserType)) {
      return res.status(400).json({ success: false, message: "Invalid userType" });
    }

    try {
      const role = await getOrCreateRole(normalizedUserType);
      const approvalStatus = normalizedUserType === "USER" ? "APPROVED" : "PENDING";

      const updated = await prisma.user.update({
        where: { id },
        data: {
          userType: normalizedUserType,
          roleId: role.id,
          approvalStatus,
          approvedAt: approvalStatus === "APPROVED" ? new Date() : null
        },
        include: { role: true }
      });

      res.json({
        success: true,
        message: "User type updated successfully",
        user: {
          id: updated.id,
          fullName: updated.fullName,
          userType: updated.userType,
          approvalStatus: updated.approvalStatus,
          role: updated.role?.name
        }
      });
    } catch (err) {
      console.error(err);
      if (err.code === "P2025") {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = userController;
