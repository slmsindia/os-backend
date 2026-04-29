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

  /**
   * Get all tenants
   */
  getAllTenants: async (req, res) => {
    try {
      const tenants = await prisma.tenant.findMany({
        include: {
          _count: { select: { users: true } }
        }
      });
      res.json({ success: true, data: tenants });
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
        where: { OR: [{ id: targetUserId }, { path: { contains: targetUserId } }] }
      });

      const allIds = descendants.map(u => u.id);

      await prisma.$transaction(async (tx) => {
        const newRootPrefix = newParent.path ? `${newParent.path}/${newParent.id}` : `/${newParent.id}`;
        
        for (const u of descendants) {
          let newPath = "";
          if (u.id === targetUserId) {
            newPath = newRootPrefix;
          } else {
            const relativePath = u.path.substring(u.path.indexOf(targetUserId));
            newPath = `${newRootPrefix}/${relativePath}`.replace(/\/\//g, '/');
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

        // Update Wallets, Apps, etc.
        await tx.wallet.updateMany({ where: { userId: { in: allIds } }, data: { tenantId: newTenantId } });
        await tx.membershipApplication.updateMany({ where: { userId: { in: allIds } }, data: { tenantId: newTenantId } });
        await tx.saathiApplication.updateMany({ where: { userId: { in: allIds } }, data: { tenantId: newTenantId } });
        await tx.businessPartnerApplication.updateMany({ where: { userId: { in: allIds } }, data: { tenantId: newTenantId } });
        await tx.walletTransaction.updateMany({
           where: { wallet: { userId: { in: allIds } } },
           data: { tenantId: newTenantId }
        });
      });

      res.json({ success: true, message: `Transferred ${allIds.length} users to ${newTenant.name}` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

module.exports = superAdminController;
