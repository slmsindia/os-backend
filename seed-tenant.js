const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { domain: 'localhost' },
    update: {},
    create: {
      name: 'Default Tenant',
      domain: 'localhost'
    },
  });
  console.log('Default Tenant created:', tenant);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
