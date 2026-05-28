const { normalizeIdentity } = require("../utils/identity");

const checkIdentity = (allowedIdentities) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ success: false, message: "Unauthorized: Missing user info" });
    }

    let identity = req.user.identity;

    // Fallback: If identity is missing in token, fetch from DB
    if (!identity) {
      const prisma = require("../lib/prisma");
      const user = await prisma.user.findUnique({ where: { id: req.user.user_id } });
      identity = user?.identity;
    }

    // Clean up identity (remove spaces, convert to underscores for enum match)
    const userIdentity = normalizeIdentity(identity);
    const normalizedAllowed = allowedIdentities.map(normalizeIdentity);

    console.log(`[IdentityCheck] User: ${userIdentity} | Allowed: ${normalizedAllowed.join(', ')}`);

    if (!normalizedAllowed.includes(userIdentity)) {
      console.log(`[IdentityCheck] DENIED for ${userIdentity}`);
      return res.status(403).json({ success: false, message: `Forbidden: Insufficient identity privileges (${userIdentity})` });
    }

    next();
  };
};

const isWhiteLabelAdmin = (req, res, next) => {
  const identity = normalizeIdentity(req.user?.identity);
  if (identity !== 'WHITE_LABEL_ADMIN' && identity !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: "Forbidden: White Label Admin access required" });
  }
  next();
};

const isSuperAdmin = (req, res, next) => {
  if (normalizeIdentity(req.user?.identity) !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: "Forbidden: Super Admin access required" });
  }
  next();
};

module.exports = { checkIdentity, isWhiteLabelAdmin, isSuperAdmin, normalizeIdentity };
