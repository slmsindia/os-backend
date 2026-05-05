const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const apps = await prisma.saathiApplication.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { payment: true }
  });
  console.log(JSON.stringify(apps, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
