const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = async (req, res, next) => {
  const { id: targetId } = req.params;
  const { user_id: myId, role: myRole } = req.user;

  if (myRole === "ADMIN") return next();
  if (!targetId || targetId === myId) return next();

  try {
    const isChild = await checkTree(myId, targetId);
    if (!isChild) return res.status(403).json({ message: "denied" });

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "error" });
  }
};

const checkTree = async (parentId, childId) => {
  const child = await prisma.user.findUnique({
    where: { id: childId },
    select: { parentId: true }
  });

  if (!child || !child.parentId) return false;
  if (child.parentId === parentId) return true;

  return await checkTree(parentId, child.parentId);
};
