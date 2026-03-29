const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev_secret";
const EXPIRES = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE_IN || "1h";

const generateToken = (user) => {
  const roles = Array.isArray(user?.roles) ? user.roles.map((ur) => ur.role?.name).filter(Boolean) : [];
  const roleName = user?.role?.name || roles[0] || user?.role || user?.userType || user?.identity || "USER";
  const tenantId = user?.tenantId || user?.tenant_id || null;
  const parentId = user?.parentId || user?.parent_id || null;
  const identity = user?.identity || null;

  return jwt.sign({
    user_id: user.id,
    role: roleName,
    identity,
    roles,
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
