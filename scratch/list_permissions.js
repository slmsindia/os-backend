const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listPermissions() {
  try {
    const permissions = await prisma.permission.findMany();
    console.log('Existing Permissions:');
    console.log(JSON.stringify(permissions, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

listPermissions();
