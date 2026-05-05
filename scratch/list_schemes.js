const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = 'a55b891b-056c-4af4-b6ac-c4cdb02e0ac9';
  const schemes = await prisma.commissionScheme.findMany({
    where: { tenantId },
    include: { shares: true }
  });
  console.log(`Schemes for tenant ${tenantId}:`);
  console.log(JSON.stringify(schemes, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
