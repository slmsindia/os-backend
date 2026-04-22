const { logAction } = require("../utils/audit");
const { PrismaClient } = require("@prisma/client");
const { generateUuid } = require("../utils/id");
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
    role = await prisma.role.create({ data: { id: generateUuid(), name: roleName } });
  }
  return role;
};

const userController = {
  getProfile: async (req, res) => {
    try {
      const myId = req.user?.user_id;
      const myTenantId = req.user?.tenant_id || req.user?.tenantId;

      if (!myId) return res.status(401).json({ success: false, message: "Unauthorized: User ID missing" });

      const user = await prisma.user.findFirst({
        where: { 
          id: myId,
          ...(myTenantId ? { tenantId: myTenantId } : {})
        },
        include: {
          roles: { include: { role: true } },
          membershipApplications: {
            where: { status: 'APPROVED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { documents: { take: 1 } }
          }
        }
      });

      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const { password, ...safeUser } = user;

      // Fallback logic for missing fields from approved application
      const latestApp = user.membershipApplications?.[0];
      if (latestApp) {
        if (!safeUser.email) safeUser.email = latestApp.email;
        if (!safeUser.profilePhoto) {
          // Fallback to the first document's front image if no profile photo is set
          safeUser.profilePhoto = latestApp.documents?.[0]?.frontImageUrl || null;
        }
      }
      
      // Always cleanup internal fields
      delete safeUser.membershipApplications;

      res.json(safeUser);
    } catch (err) {
      console.error("error in getProfile:", err);
      res.status(500).json({ success: false, message: "Internal server error during profile load" });
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
      // tenant check
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
              create: { id: generateUuid(), roleId: role.id },
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
  },

  updateProfile: async (req, res) => {
    try {
      const myId = req.user?.user_id;
      const myTenantId = req.user?.tenant_id || req.user?.tenantId;
      
      const { firstName, lastName, fullName, gender, dateOfBirth, country, language, phoneNumber } = req.body;

      // Security check: Verify user belongs to the tenant before updating
      if (myTenantId) {
        const checkUser = await prisma.user.findFirst({
          where: { id: myId, tenantId: myTenantId }
        });
        if (!checkUser) return res.status(403).json({ success: false, message: "Access denied" });
      }

      const updateData = {};
      
      if (firstName || lastName) {
        updateData.fullName = `${firstName || ''} ${lastName || ''}`.trim();
      } else if (fullName) {
        updateData.fullName = fullName;
      }

      if (gender) updateData.gender = gender.toUpperCase();
      if (dateOfBirth && !isNaN(new Date(dateOfBirth).getTime())) {
        updateData.dateOfBirth = new Date(dateOfBirth);
      }
      if (country) updateData.country = country;
      if (language) updateData.language = language;
      if (phoneNumber) updateData.mobile = phoneNumber;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: "No fields to update" });
      }

      const updatedUser = await prisma.user.update({
        where: { id: myId }, // Identity is unique identifier
        data: updateData
      });

      await logAction({
        userId: myId,
        action: "PROFILE_UPDATE",
        tenantId: myTenantId,
        metadata: { updatedFields: Object.keys(updateData) }
      });

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser
      });
    } catch (err) {
      console.error("error in updateProfile:", err);
      res.status(500).json({ success: false, message: "Internal server error during profile update" });
    }
  }
};

module.exports = userController;
