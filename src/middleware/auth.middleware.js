const { verifyToken } = require("../utils/jwt");

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  let token = null;

  if (header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  } else if (req.query.accessToken) {
    token = req.query.accessToken;
  } else if (req.url.includes("token=")) {
    // Manual fallback for direct browser hits
    const urlParts = req.url.split("token=");
    if (urlParts.length > 1) {
      token = urlParts[1].split("&")[0];
    }
  }

  if (!token) {
    console.log(`[Auth] No token found for path: ${req.path}`);
    return res.status(401).json({ success: false, message: "unauthorized - no token provided" });
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    console.log(`[Auth] Invalid token attempt for path: ${req.path}`);
    return res.status(401).json({ success: false, message: "invalid token" });
  }

  // Strict Tenant Enforcement: Ensure token's tenant matches current domain's tenant
  // Exception for SUPER_ADMIN who has global access
  if (decoded.identity !== 'SUPER_ADMIN' && decoded.tenant_id !== req.tenant_id) {
    console.warn(`[Auth] Tenant mismatch: User from ${decoded.tenant_id} attempted to access ${req.tenant_id}`);
    return res.status(403).json({ 
      success: false, 
      message: "Access denied: This account belongs to a different organization/domain." 
    });
  }

  req.user = decoded;
  next();
};
