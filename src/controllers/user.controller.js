const { PrismaClient } = require("@prisma/client");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const prisma = new PrismaClient();

const VALID_ROLE_NAMES = [
  "USER",
  "MEMBER",
  "SAATHI",
  "BUSINESS_PARTNER",
  "SUB_ADMIN",
  "COUNTRY_HEAD",
  "STATE_PARTNER",
  "DISTRICT_PARTNER",
  "AGENT",
  "ADMIN",
  "SUPER_ADMIN"
];

const ROLE_TO_IDENTITY = {
  ADMIN: "ADMIN",
  STATE_PARTNER: "STATE_PARTNER",
  DISTRICT_PARTNER: "DISTRICT_PARTNER",
  AGENT: "AGENT",
  USER: "USER",
  MEMBER: "USER",
  SAATHI: "USER",
  BUSINESS_PARTNER: "USER",
  SUB_ADMIN: "USER",
  COUNTRY_HEAD: "USER",
  SUPER_ADMIN: "ADMIN"
};

const normalizeRoleName = (value) => {
  if (!value || typeof value !== "string") return "USER";
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
};

const getOrCreateRole = async (roleName) => {
  let role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    role = await prisma.role.create({
      data: {
        id: generateUuid(),
        name: roleName
      }
    });
  }

  return role;
};

const mapUserResponse = (user) => ({
  id: user.id,
  mobile: user.mobile,
  fullName: user.fullName,
  identity: user.identity,
  requestedRole: user.requestedRole,
  approvalStatus: user.approvalStatus,
  approvedAt: user.approvedAt,
  createdAt: user.createdAt,
  roles: Array.isArray(user.roles) ? user.roles.map((entry) => entry.role.name) : [],
  wallet: user.wallet
    ? {
        id: user.wallet.id,
        balance: user.wallet.balance,
        createdAt: user.wallet.createdAt,
        updatedAt: user.wallet.updatedAt
      }
    : null
});

const loadTenantUser = (id, tenantId, include = {}) =>
  prisma.user.findFirst({
    where: { id, tenantId },
    include
  });

const assignRoleToUser = async (tx, userId, roleName) => {
  const role = await tx.role.upsert({
    where: { name: roleName },
    update: {},
    create: {
      id: generateUuid(),
      name: roleName
    }
  });

  await tx.userRole.upsert({
    where: {
      userId_roleId: {
        userId,
        roleId: role.id
      }
    },
    update: {},
    create: {
      id: generateUuid(),
      userId,
      roleId: role.id
    }
  });

  return role;
};

const userController = {
  getProfile: async (req, res) => {
    const { user_id: myId, tenant_id: myTenantId } = req.user;

    try {
      const user = await prisma.user.findFirst({
        where: { id: myId, tenantId: myTenantId },
        include: {
          roles: { include: { role: true } },
          wallet: true
        }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      return res.json({
        success: true,
        user: mapUserResponse(user)
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  changeRole: async (req, res) => {
    const { id } = req.params;
    const { roleName } = req.body;
    const { user_id: myId, tenant_id: myTenantId } = req.user;

    const normalizedRoleName = normalizeRoleName(roleName);
    if (!VALID_ROLE_NAMES.includes(normalizedRoleName)) {
      return res.status(400).json({ success: false, message: "Valid roleName is required" });
    }

    try {
      const targetUser = await loadTenantUser(id, myTenantId);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: "User not found in tenant" });
      }

      const updatedUser = await prisma.$transaction(async (tx) => {
        await assignRoleToUser(tx, id, normalizedRoleName);

        return tx.user.update({
          where: { id },
          data: {
            identity: ROLE_TO_IDENTITY[normalizedRoleName] || targetUser.identity,
            requestedRole: null,
            approvalStatus: "APPROVED",
            approvedAt: new Date()
          },
          include: {
            roles: { include: { role: true } },
            wallet: true
          }
        });
      });

      await logAction({
        userId: myId,
        action: "ROLE_ASSIGNMENT",
        targetId: id,
        tenantId: myTenantId,
        metadata: { roleName: normalizedRoleName }
      });

      return res.json({
        success: true,
        message: "Role assigned successfully",
        user: mapUserResponse(updatedUser)
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  listPendingApprovals: async (req, res) => {
    const { tenant_id: myTenantId } = req.user;

    try {
      const users = await prisma.user.findMany({
        where: {
          tenantId: myTenantId,
          approvalStatus: "PENDING"
        },
        orderBy: { createdAt: "desc" },
        include: {
          roles: { include: { role: true } },
          wallet: true
        }
      });

      return res.json({
        success: true,
        users: users.map(mapUserResponse)
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  approveUser: async (req, res) => {
    const { id } = req.params;
    const { approve = true } = req.body;
    const { user_id: myId, tenant_id: myTenantId } = req.user;

    try {
      const existing = await loadTenantUser(id, myTenantId, {
        roles: { include: { role: true } },
        wallet: true
      });

      if (!existing) {
        return res.status(404).json({ success: false, message: "User not found in tenant" });
      }

      if (!approve) {
        const rejected = await prisma.user.update({
          where: { id },
          data: {
            approvalStatus: "REJECTED",
            approvedAt: null
          },
          include: {
            roles: { include: { role: true } },
            wallet: true
          }
        });

        await logAction({
          userId: myId,
          action: "USER_APPROVAL_REJECTED",
          targetId: id,
          tenantId: myTenantId,
          metadata: { requestedRole: existing.requestedRole }
        });

        return res.json({
          success: true,
          message: "User request rejected",
          user: mapUserResponse(rejected)
        });
      }

      const targetRoleName = normalizeRoleName(
        existing.requestedRole ||
        existing.roles?.[0]?.role?.name ||
        existing.identity ||
        "USER"
      );

      const approved = await prisma.$transaction(async (tx) => {
        await assignRoleToUser(tx, id, targetRoleName);

        return tx.user.update({
          where: { id },
          data: {
            identity: ROLE_TO_IDENTITY[targetRoleName] || existing.identity,
            approvalStatus: "APPROVED",
            approvedAt: new Date(),
            requestedRole: null
          },
          include: {
            roles: { include: { role: true } },
            wallet: true
          }
        });
      });

      await logAction({
        userId: myId,
        action: "USER_APPROVED",
        targetId: id,
        tenantId: myTenantId,
        metadata: { approvedRole: targetRoleName }
      });

      return res.json({
        success: true,
        message: "User approved successfully",
        user: mapUserResponse(approved)
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  setUserType: async (req, res) => {
    const { id } = req.params;
    const { userType } = req.body;
    const { user_id: myId, tenant_id: myTenantId } = req.user;

    const normalizedRoleName = normalizeRoleName(userType);
    if (!VALID_ROLE_NAMES.includes(normalizedRoleName)) {
      return res.status(400).json({ success: false, message: "Invalid userType" });
    }

    try {
      const existing = await loadTenantUser(id, myTenantId);
      if (!existing) {
        return res.status(404).json({ success: false, message: "User not found in tenant" });
      }

      const needsApproval = normalizedRoleName !== "USER";
      const updated = await prisma.user.update({
        where: { id },
        data: {
          requestedRole: normalizedRoleName,
          approvalStatus: needsApproval ? "PENDING" : "APPROVED",
          approvedAt: needsApproval ? null : new Date(),
          identity: needsApproval ? existing.identity : ROLE_TO_IDENTITY[normalizedRoleName] || existing.identity
        },
        include: {
          roles: { include: { role: true } },
          wallet: true
        }
      });

      if (!needsApproval) {
        await prisma.$transaction(async (tx) => {
          await assignRoleToUser(tx, id, normalizedRoleName);
        });
      }

      await logAction({
        userId: myId,
        action: "USER_TYPE_UPDATED",
        targetId: id,
        tenantId: myTenantId,
        metadata: {
          requestedRole: normalizedRoleName,
          approvalStatus: needsApproval ? "PENDING" : "APPROVED"
        }
      });

      const refreshedUser = await prisma.user.findUnique({
        where: { id },
        include: {
          roles: { include: { role: true } },
          wallet: true
        }
      });

      return res.json({
        success: true,
        message: needsApproval
          ? "User role request submitted for approval"
          : "User type updated successfully",
        user: mapUserResponse(refreshedUser)
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = userController;
