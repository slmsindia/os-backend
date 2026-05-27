const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        identity: true,
        tenantId: true,
        parentId: true,
        path: true
      }
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
