const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    where: { mobile: '0000000000' },
    select: { id: true, mobile: true, tenantId: true, identity: true, fullName: true }
  });
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
}

check();
