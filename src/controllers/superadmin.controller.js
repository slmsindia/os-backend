const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const superAdminController = {
  createTenant: async (req, res) => {
    const { name, domain, adminMobile, adminName, adminPassword } = req.body;

    if (!name || !domain || !adminMobile || !adminName || !adminPassword) {
      return res.status(400).json({ success: false, message: "tenant and admin details are required" });
    }

    try {
      // Use a transaction to ensure both tenant and admin are created
      const result = await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { id: generateUuid(), name, domain }
        });

        const hash = await bcrypt.hash(adminPassword, 10);
        const admin = await tx.user.create({
          data: {
            id: generateUuid(),
            mobile: adminMobile,
            fullName: adminName,
            password: hash,
            gender: "MALE",
            dateOfBirth: new Date("1990-01-01"),
            identity: "ADMIN",
            tenantId: tenant.id
          }
        });

        return { tenant, admin };
      });

      await logAction({
        action: "CREATE_TENANT",
        targetId: result.tenant.id,
        metadata: { name, domain, adminMobile }
      });

      res.status(201).json({
        success: true,
        message: "Tenant and Admin created successfully",
        tenant: result.tenant,
        admin: { id: result.admin.id, mobile: result.admin.mobile }
      });
    } catch (err) {
      console.error(err);
      if (err.code === "P2002") {
        return res.status(400).json({ success: false, message: "Domain already exists" });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = superAdminController;
