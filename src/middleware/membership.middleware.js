const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const checkMembershipAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { user_id: userId, identity } = req.user;

  // Admins always have access
  if (['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(identity)) {
    return next();
  }

  // Check database for delegated power
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { canApproveMembership: true }
    });

    if (user && user.canApproveMembership) {
      return next();
    }

    return res.status(403).json({ success: false, message: "Forbidden: You don't have membership approval power" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { checkMembershipAccess };
