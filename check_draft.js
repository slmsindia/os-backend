const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const drafts = await prisma.formDraft.findMany();
  console.log(JSON.stringify(drafts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
