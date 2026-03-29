const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = async (req, res, next) => {
  const host = req.get("host");
  if (!host) return res.status(400).json({ success: false, message: "Host header missing" });

  const domain = host.split(":")[0];

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { domain }
    });

    if (!tenant) {
      console.warn(`Tenant not found for: ${domain}`);
      return res.status(403).json({ 
        success: false, 
        message: "Invalid domain" 
      });
    }

    req.tenant_id = tenant.id;
    next();
  } catch (err) {
    console.error("Tenant error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
