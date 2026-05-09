const { logAction } = require("../utils/audit");
const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");

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

      const user = await prisma.user.findUnique({
        where: { id: myId },
        include: {
          tenant: true,
          wallet: true,
          parent: { select: { fullName: true } },
          roles: { 
            include: { 
              role: { 
                include: { 
                  permissions: { 
                    include: { permission: true } 
                  } 
                } 
              } 
            } 
          },
          membershipApplications: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { education: true, sector: true, jobRole: true, documents: true }
          },
          saathiApplications: { orderBy: { createdAt: 'desc' }, take: 1 },
          businessPartnerApps: { orderBy: { createdAt: 'desc' }, take: 1 },
          // NEW: Layered identity profiles
          memberProfile: true,
          saathiProfile: true,
          partnerProfile: true,
          // NEW: Unified application history
          applications: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, targetIdentity: true, status: true, paymentStatus: true, paymentMethod: true, createdAt: true, approvedAt: true } }
        }
      });

      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const { password, ...safeUser } = user;

      // Logic to pick profile photo from application if not in user record
      if (!safeUser.profilePhoto) {
        const latestMemberApp = user.membershipApplications?.[0];
        if (latestMemberApp?.profilePhoto) {
          safeUser.profilePhoto = latestMemberApp.profilePhoto;
        } else if (latestMemberApp?.documents?.[0]?.frontImageUrl) {
          safeUser.profilePhoto = latestMemberApp.documents[0].frontImageUrl;
        }
      }
      
      // Logic to pick email from application if not in user record
      if (!safeUser.email) {
        const latestMemberApp = user.membershipApplications?.[0];
        if (latestMemberApp?.email) {
          safeUser.email = latestMemberApp.email;
        } else {
          const latestBpApp = user.businessPartnerApps?.[0];
          if (latestBpApp?.email) {
            safeUser.email = latestBpApp.email;
          }
        }
      }

      // Add a summary object for easy frontend consumption
      safeUser.parentUserName = user.parent?.fullName || "System Administrator";

      // Enhanced Permission Logic: Combine role-based permissions and identity-based fallbacks
      let permissions = user.roles.flatMap(ur => 
        ur.role.permissions.map(p => p.permission.name)
      );

      // Fallback: If no explicit roles linked, try fetching permissions for the identity-named role 
      // or a custom sub-admin role based on mobile (standardized naming)
      if (permissions.length === 0 && user.identity) {
          const fallbackRoleNames = [user.identity, `ROLE_${user.identity}_${user.mobile}`];
          
          const fallbackRoles = await prisma.role.findMany({
              where: { name: { in: fallbackRoleNames } },
              include: { permissions: { include: { permission: true } } }
          });

          if (fallbackRoles.length > 0) {
              permissions = fallbackRoles.flatMap(role => 
                role.permissions.map(p => p.permission.name)
              );
          }
      }

      safeUser.summary = {
        isMember: user.identity === 'MEMBER' || user.membershipApplications.some(a => a.status === 'APPROVED'),
        isSaathi: user.identity === 'SAATHI' || user.saathiApplications.some(a => a.status === 'APPROVED'),
        isBusinessPartner: user.identity === 'BUSINESS_PARTNER' || user.businessPartnerApps.some(a => a.status === 'APPROVED'),
        walletBalance: user.wallet?.balance || 0,
        activeRole: user.identity,
        permissions: [...new Set(permissions)] // Unique permissions
      };

      res.json({
        success: true,
        data: safeUser
      });
    } catch (err) {
      console.error("error in getProfile:", err);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error during profile load",
        error: err.message,
        stack: err.stack
      });
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
        createdAt: user.createdAt,
        registrationState: user.registrationState,
        registrationCity: user.registrationCity,
        registrationPincode: user.registrationPincode,
        registrationLat: user.registrationLat,
        registrationLong: user.registrationLong
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
      if (req.body.email) updateData.email = req.body.email;

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
