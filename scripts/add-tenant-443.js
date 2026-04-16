const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.tenant.create({
    data: {
      domain: 'apiv3.onlinesaathi.org:443',
      name: 'Online Saathi (443)',
    },
  });
  console.log('Tenant with :443 added!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
