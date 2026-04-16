const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.tenant.create({
    data: {
      domain: 'apiv3.onlinesaathi.org',
      name: 'Online Saathi',
    },
  });
  console.log('Tenant added!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
