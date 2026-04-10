const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = async (req, res, next) => {
  const host = req.get("host");
  if (!host) return res.status(400).json({ success: false, message: "Host header missing" });

  const backendDomain = "osapi.dpinfoserver.co.in";
  const frontendDomain = "os.dpinfoserver.co.in";
  const productionTenantId = "8adbcbe8-92d7-4c4b-96b5-20be7005b1a9";
  
  // FAIL-SAFE: Hardcode production domains to their tenant ID
  if (host === backendDomain || host === frontendDomain || host.includes("dpinfoserver.co.in")) {
    req.tenant_id = productionTenantId;
    return next();
  }

  let domain = host;
  // If host is the backend domain (but not the hardcoded one somehow), try to identify tenant from Origin or Referer
  if (host === backendDomain || host.startsWith(backendDomain + ":")) {
    const origin = req.get("origin");
    const referer = req.get("referer");

    if (origin) {
      domain = origin.replace(/^https?:\/\//, "").split("/")[0];
    } else if (referer) {
      domain = referer.replace(/^https?:\/\//, "").split("/")[0];
    } else {
      domain = frontendDomain;
    }
  }

  let tenant = await prisma.tenant.findUnique({ where: { domain } });

  if (!tenant && domain.includes(':')) {
    domain = domain.split(":")[0];
    tenant = await prisma.tenant.findUnique({ where: { domain } });
  }

  try {
    if (!tenant) {
      console.warn(`Tenant not found for: ${host} - Falling back to default production tenant.`);
      req.tenant_id = productionTenantId;
      return next();
    }
    req.tenant_id = tenant.id;
    next();
  } catch (err) {
    console.error("Tenant error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
