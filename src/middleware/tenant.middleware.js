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
      // Fallback: Prefer the Main Organization if the domain lookup fails
      const fallbackTenant = await prisma.tenant.findFirst({
        where: { domain: "os.dpinfoserver.co.in" }
      }) || await prisma.tenant.findFirst();

      if (fallbackTenant) {
        req.tenant_id = fallbackTenant.id;
        return next();
      }

      console.warn(`Tenant not found for: ${domain}. Proceeding without tenant context.`);
      return next();
    }

    req.tenant_id = tenant.id;
    next();
  } catch (err) {
    console.error("Tenant error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
