const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateQuery() {
  const currentUserId = "9cc5af15-9589-4bf7-8084-37731b3346b1";
  const tenantId = "0857f5b9-1ce0-48d4-a92a-c41cf69192c7";
  const creatorIdentity = "WHITE_LABEL_ADMIN";
  const identityFilter = "COUNTRY_HEAD";

  try {
    let targetParentId = currentUserId;
    const isSuperAdmin = creatorIdentity === 'SUPER_ADMIN';
    const isTopAdmin = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(creatorIdentity);

    const where = {};
    if (isTopAdmin && targetParentId === currentUserId) {
      where.OR = [
        { parentId: targetParentId },
        { parentId: null }
      ];
    } else {
      where.parentId = targetParentId;
    }

    if (!isSuperAdmin) where.tenantId = tenantId;
    if (identityFilter) where.identity = identityFilter.toUpperCase();

    console.log('Final Where Clause:', JSON.stringify(where, null, 2));

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        identity: true,
        tenantId: true,
        parentId: true
      }
    });

    console.log('Results:', JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

simulateQuery();
