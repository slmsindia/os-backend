const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const usersWithNullPath = await prisma.user.findMany({
    where: { 
      path: null,
      parentId: { not: null }
    },
    select: { id: true, parentId: true, fullName: true }
  });
  console.log(`Found ${usersWithNullPath.length} users with null path but having a parent.`);
  console.log(JSON.stringify(usersWithNullPath, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
