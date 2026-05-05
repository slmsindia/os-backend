const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const subServices = await prisma.commissionSubService.findMany();
  console.log('Commission SubServices:');
  console.log(JSON.stringify(subServices, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
