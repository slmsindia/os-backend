const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const isDescendant = async (parentId, childId, depth = 0) => {
  if (!parentId || !childId || depth > 10) return false; // safety break
  
  const child = await prisma.user.findUnique({
    where: { id: childId },
    select: { parentId: true }
  });

  if (!child || !child.parentId) return false;
  if (child.parentId === parentId) return true;

  return await isDescendant(parentId, child.parentId, depth + 1);
};

const canAccess = async (currentUser, targetUser) => {
  // same tenant only
  if (currentUser.tenantId !== targetUser.tenantId) return false;

  // admins see everything
  if (currentUser.identity === "ADMIN") return true;

  // self access
  if (currentUser.id === targetUser.id) return true;

  // direct relations
  if (targetUser.createdBy === currentUser.id) return true;
  if (targetUser.referredBy === currentUser.id) return true;

  // hierarchy check
  return await isDescendant(currentUser.id, targetUser.id);
};

module.exports = {
  isDescendant,
  canAccess
};
