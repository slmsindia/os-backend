const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = async (req, res, next) => {
  const host = req.get("host");
  if (!host) return res.status(400).json({ success: false, message: "Host header missing" });

  // Try both 'localhost' and 'localhost:port' for dev
  let domain = host;
  // Try exact match first
  let tenant = await prisma.tenant.findUnique({ where: { domain } });
  // If not found, try without port (for localhost)
  if (!tenant && domain.includes(':')) {
    domain = domain.split(":")[0];
    tenant = await prisma.tenant.findUnique({ where: { domain } });
  }

  try {
    if (!tenant) {
      console.warn(`Tenant not found for: ${host}`);
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
