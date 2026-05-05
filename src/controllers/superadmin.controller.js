const prisma = require("../lib/prisma");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const superAdminController = {
  /**
   * Create a new White Label (Tenant)
   */
  createTenant: async (req, res) => {
    const { name, domain, adminEmail, adminName, adminPassword, adminMobile } = req.body;
    const { user_id: superAdminId } = req.user;

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Create Tenant
        const tenant = await tx.tenant.create({
          data: {
            id: generateUuid(),
            name,
            domain,
            isActive: true
          }
        });

        // 2. Create White Label Admin for this tenant
        const bcrypt = require("bcrypt");
        const hash = await bcrypt.hash(adminPassword, 10);

        const admin = await tx.user.create({
          data: {
            id: generateUuid(),
            mobile: adminMobile,
            fullName: adminName,
            email: adminEmail,
            password: hash,
            identity: "WHITE_LABEL_ADMIN",
            tenantId: tenant.id,
            approvalStatus: "APPROVED",
            dateOfBirth: new Date(),
            gender: "OTHER"
          }
        });

        // 3. Create initial wallet
        await tx.wallet.create({
          data: {
             id: generateUuid(),
             userId: admin.id,
             tenantId: tenant.id,
             isCorporate: true,
             balance: 0
          }
        });

        return { tenant, admin };
      });

      await logAction({
        userId: superAdminId,
        action: "CREATE_TENANT",
        targetId: result.tenant.id,
        metadata: { domain, adminEmail }
      });

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getAllTenants: async (req, res) => {
    try {
      const [tenants, userStats] = await Promise.all([
        prisma.tenant.findMany({
          include: {
            _count: { select: { users: true } },
            users: {
              where: { identity: 'WHITE_LABEL_ADMIN' },
              select: { id: true, fullName: true, mobile: true },
              take: 1
            }
          }
        }),
        prisma.user.groupBy({
          by: ['tenantId', 'identity'],
          _count: { _all: true }
        })
      ]);
      
      const formattedTenants = tenants.map(t => {
        // Build identity distribution for this specific tenant
        const stats = userStats
          .filter(s => s.tenantId === t.id)
          .reduce((acc, s) => {
            acc[s.identity] = s._count._all;
            return acc;
          }, {});

        return {
          ...t,
          adminId: t.users[0]?.id || null,
          adminName: t.users[0]?.fullName || "N/A",
          adminMobile: t.users[0]?.mobile || "N/A",
          identityStats: stats,
          users: undefined 
        };
      });

      res.json({ success: true, data: formattedTenants });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * Get main identities (Country Heads) of a tenant for hierarchy transfer
   */
  getTenantRoots: async (req, res) => {
    const { tenantId } = req.params;
    try {
      // 1. Find the White Label Admin for this tenant
      const admin = await prisma.user.findFirst({
        where: { tenantId, identity: 'WHITE_LABEL_ADMIN' }
      });

      if (!admin) {
        return res.json({ success: true, data: [], message: "No White Label Admin found for this tenant." });
      }

      // 2. Find all "Root" users of the operational hierarchy
      // We look for users who are NOT the admin AND (have no parent OR report to the admin)
      const roots = await prisma.user.findMany({
        where: { 
          tenantId, 
          id: { not: admin.id },
          OR: [
            { parentId: null },
            { parentId: admin.id }
          ]
        },
        select: { 
          id: true, 
          fullName: true, 
          mobile: true, 
          identity: true,
          email: true
        }
      });

      res.json({ success: true, data: roots, adminId: admin.id });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * Transfer a user and their entire hierarchy subtree to a new White Label (Tenant)
   */
  transferHierarchy: async (req, res) => {
    const { targetUserId, newTenantId, newParentId } = req.body;
    const { user_id: adminId, identity } = req.user;

    if (identity !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "Only Super Admin allowed" });
    }

    try {
      const [targetUser, newTenant, newParent] = await Promise.all([
        prisma.user.findUnique({ where: { id: targetUserId } }),
        prisma.tenant.findUnique({ where: { id: newTenantId } }),
        newParentId ? prisma.user.findUnique({ where: { id: newParentId } }) : prisma.user.findFirst({
          where: { tenantId: newTenantId, identity: { in: ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'] } },
          orderBy: { createdAt: 'asc' }
        })
      ]);

      if (!targetUser || !newTenant || !newParent) {
        return res.status(404).json({ success: false, message: "Required entities not found" });
      }

      const descendants = await prisma.user.findMany({
        where: { OR: [{ id: targetUserId }, { path: { contains: targetUserId } }] },
        include: { wallet: true }
      });

      const allIds = descendants.map(u => u.id);
      const allWalletIds = descendants.map(u => u.wallet?.id).filter(Boolean);
      const descendantMobiles = descendants.map(u => u.mobile);

      // 3. Check for mobile conflicts in the target tenant
      const collisions = await prisma.user.findMany({
        where: {
          tenantId: newTenantId,
          mobile: { in: descendantMobiles },
          id: { notIn: allIds }
        },
        select: { mobile: true, fullName: true }
      });

      if (collisions.length > 0) {
        const conflictList = collisions.map(c => `${c.fullName} (${c.mobile})`).join(", ");
        return res.status(400).json({
          success: false,
          message: `Transfer failed: The following users already exist in the target organization: ${conflictList}. Please resolve these duplicates before transferring.`
        });
      }

      await prisma.$transaction(async (tx) => {
        const newRootPrefix = newParent.path ? `${newParent.path}/${newParent.id}` : `/${newParent.id}`;
        
        for (const u of descendants) {
          let newPath = "";
          if (u.id === targetUserId) {
            newPath = newRootPrefix;
          } else {
            const currentPath = u.path || "";
            const targetIndex = currentPath.indexOf(targetUserId);
            
            if (targetIndex !== -1) {
              const relativePath = currentPath.substring(targetIndex);
              newPath = `${newRootPrefix}/${relativePath}`.replace(/\/\//g, '/');
            } else {
              // Fallback: If path is broken, just put them directly under the target user
              newPath = `${newRootPrefix}/${targetUserId}/${u.id}`.replace(/\/\//g, '/');
            }
          }

          await tx.user.update({
            where: { id: u.id },
            data: {
              tenantId: newTenantId,
              path: newPath,
              ...(u.id === targetUserId ? { parentId: newParent.id } : {})
            }
          });
        }

        // Update Wallets, Transactions, etc.
        await tx.wallet.updateMany({ where: { userId: { in: allIds } }, data: { tenantId: newTenantId } });
        if (allWalletIds.length > 0) {
          await tx.walletTransaction.updateMany({
            where: { walletId: { in: allWalletIds } },
            data: { tenantId: newTenantId }
          });
        }
      });

      res.json({ success: true, message: `Transferred ${allIds.length} users to ${newTenant.name}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  },
  
  /**
   * Update Razorpay credentials for a specific White Label
   */
  updateTenantRazorpay: async (req, res) => {
    const { tenantId, razorpayKeyId, razorpayKeySecret } = req.body;
    const { user_id: adminId, identity } = req.user;

    if (identity !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "Only Super Admin allowed" });
    }

    try {
      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          razorpayKeyId,
          razorpayKeySecret
        }
      });

      await logAction({
        userId: adminId,
        action: "UPDATE_TENANT_RAZORPAY",
        targetId: tenantId,
        metadata: { keyId: razorpayKeyId }
      });

      res.json({ success: true, message: `Razorpay credentials updated for ${tenant.name}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

module.exports = superAdminController;
