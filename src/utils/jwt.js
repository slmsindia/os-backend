const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev_secret";
const EXPIRES = process.env.JWT_EXPIRE_IN || "1h";

const generateToken = (user) => {
  return jwt.sign({
    user_id: user.id,
    role: user.role.name,
    tenant_id: user.tenantId,
    parent_id: user.parentId,
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
