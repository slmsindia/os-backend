const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  const tenantId = '019dd45d-ec0e-750b-90db-175374245b7a';
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      fullName: true,
      identity: true,
      parentId: true,
      path: true
    }
  });
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

checkUsers().catch(err => {
  console.error(err);
  process.exit(1);
});
