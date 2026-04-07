const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = async (req, res, next) => {
  const host = req.get("host");
  if (!host) return res.status(400).json({ success: false, message: "Host header missing" });

  const backendDomain = "osapi.dpinfoserver.co.in";
  let domain = host;

  if (host === backendDomain || host.startsWith(backendDomain + ":")) {
    const origin = req.get("origin");
    const referer = req.get("referer");

    if (origin) {
      domain = origin.replace(/^https?:\/\//, "").split("/")[0];
    } else if (referer) {
      domain = referer.replace(/^https?:\/\//, "").split("/")[0];
    } else {
      // Fallback for direct backend access
      domain = "os.dpinfoserver.co.in";
    }
  }

  let tenant = await prisma.tenant.findUnique({ where: { domain } });

  if (!tenant && domain.includes(':')) {
    domain = domain.split(":")[0];
    tenant = await prisma.tenant.findUnique({ where: { domain } });
  }

  try {
    if (!tenant) {
      const fallbackTenant = await prisma.tenant.findFirst({
        where: { domain: "os.dpinfoserver.co.in" }
      }) || await prisma.tenant.findFirst();

      if (process.env.NODE_ENV !== "production" && fallbackTenant) {
        req.tenant_id = fallbackTenant.id;
        return next();
      }

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
