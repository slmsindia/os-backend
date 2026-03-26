const { logAction } = require("../utils/audit");

const superAdminController = {
  createTenant: async (req, res) => {
    const { name, domain } = req.body;

    if (!name || !domain) {
      return res.status(400).json({ success: false, message: "name and domain are required" });
    }

    try {
      const tenant = await prisma.tenant.create({
        data: { name, domain }
      });

      await logAction({
        action: "CREATE_TENANT",
        targetId: tenant.id,
        metadata: { name, domain }
      });

      res.status(201).json({ success: true, tenant });
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
