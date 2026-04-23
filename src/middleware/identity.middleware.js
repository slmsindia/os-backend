const checkIdentity = (allowedIdentities) => {
  return (req, res, next) => {
    if (!req.user || !req.user.identity) {
      return res.status(401).json({ success: false, message: "Unauthorized: Missing identity" });
    }

    if (!allowedIdentities.includes(req.user.identity)) {
      return res.status(403).json({ success: false, message: "Forbidden: Insufficient identity privileges" });
    }

    next();
  };
};

module.exports = { checkIdentity };
