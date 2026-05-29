<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main
const prisma = require("../lib/prisma");

// Simple in-memory cache to avoid DB hits on every request
const tenantCache = new Map();
const CACHE_TTL = 60000; // 1 minute

module.exports = async (req, res, next) => {
  try {
    // 1. Prioritize 'Origin' header (where the frontend is running)
    // 2. Fallback to 'Referer' header
    // 3. Last fallback to 'Host' header
    const origin = req.get("origin") || req.get("referer") || req.get("host");
    if (!origin) return res.status(400).json({ success: false, message: "Origin/Host header missing" });

    // Extract domain from origin (removes http://, https:// and trailing slashes)
    let domain = origin.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Check cache first
    const cached = tenantCache.get(domain);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      req.tenant_id = cached.id;
      return next();
    }

    // Try exact match first
    let tenant = await prisma.tenant.findUnique({ where: { domain } });
    
    // If not found, try without port (for localhost development)
    if (!tenant && domain.includes(':')) {
      const domainWithoutPort = domain.split(":")[0];
      tenant = await prisma.tenant.findUnique({ where: { domain: domainWithoutPort } });
    }

<<<<<<< HEAD
=======
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
>>>>>>> main
=======
>>>>>>> origin/main
    if (!tenant) {
      const fallbackTenant = await prisma.tenant.findFirst({
        where: { domain: "os.dpinfoserver.co.in" }
      }) || await prisma.tenant.findFirst();

      if (process.env.NODE_ENV !== "production" && fallbackTenant) {
<<<<<<< HEAD
<<<<<<< HEAD
        tenantCache.set(domain, { id: fallbackTenant.id, timestamp: Date.now() });
=======
>>>>>>> main
=======
        tenantCache.set(domain, { id: fallbackTenant.id, timestamp: Date.now() });
>>>>>>> origin/main
        req.tenant_id = fallbackTenant.id;
        return next();
      }

<<<<<<< HEAD
<<<<<<< HEAD
      console.warn(`Tenant not found for: ${domain}`);
=======
      console.warn(`Tenant not found for: ${host}`);
>>>>>>> main
=======
      console.warn(`Tenant not found for: ${domain}`);
>>>>>>> origin/main
      return res.status(403).json({
        success: false,
        message: "Invalid domain"
      });
    }
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main

    if (tenant) {
      tenantCache.set(domain, { id: tenant.id, timestamp: Date.now() });
      req.tenant_id = tenant.id;
      return next();
    }
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
<<<<<<< HEAD
=======
    req.tenant_id = tenant.id;
    next();
  } catch (err) {
    console.error("Tenant error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
>>>>>>> main
=======
>>>>>>> origin/main
  }
};
