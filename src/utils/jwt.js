const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev_secret";
const EXPIRES = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE_IN || "1h";

const generateToken = (user) => {
  const roleName = user?.role?.name || user?.role || user?.userType || "USER";
  const tenantId = user?.tenantId || user?.tenant_id || null;
  const parentId = user?.parentId || user?.parent_id || null;

  return jwt.sign({
    user_id: user.id,
    role: roleName,
    tenant_id: tenantId,
    parent_id: parentId,
  }, SECRET, { expiresIn: EXPIRES });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };
