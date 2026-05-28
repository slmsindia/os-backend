const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const subAdmins = await prisma.user.findMany({
    where: { identity: 'SUB_ADMIN' },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true }
              }
            }
          }
        }
      }
    }
  });

  console.log(JSON.stringify(subAdmins, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
