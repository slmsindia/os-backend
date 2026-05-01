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
    const userIdentity = String(identity || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');

    const normalizedAllowed = allowedIdentities.map(id => 
      String(id).trim().toUpperCase().replace(/\s+/g, '_')
    );

    console.log(`[IdentityCheck] User: ${userIdentity} | Allowed: ${normalizedAllowed.join(', ')}`);

    if (!normalizedAllowed.includes(userIdentity)) {
      console.log(`[IdentityCheck] DENIED for ${userIdentity}`);
      return res.status(403).json({ success: false, message: `Forbidden: Insufficient identity privileges (${userIdentity})` });
    }

    next();
  };
};

module.exports = { checkIdentity };
