const prisma = require("../lib/prisma");

module.exports = async (req, res, next) => {
  try {
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
    console.error("CRITICAL: Tenant Middleware Database Error:", err.message);
    
    // In development mode, provide a hardcoded fallback if DB is completely unreachable
    if (process.env.NODE_ENV !== "production") {
      console.warn("Using hardcoded fallback tenant_id due to database error");
      req.tenant_id = "default-tenant-id"; // Adjust if you have a specific UUID format
      return next();
    }

    // If it's a connection error, inform the user
    if (err.message.includes("too many clients") || err.message.includes("connection")) {
       return res.status(503).json({ 
         success: false, 
         message: "Database busy or connection limit reached. Please try again in a few seconds." 
       });
    }
    res.status(500).json({ success: false, message: "Internal server error during tenant resolution" });
  }
};
