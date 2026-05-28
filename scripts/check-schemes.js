const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkSchemes() {
  try {
    const schemes = await prisma.commissionScheme.findMany({ include: { shares: true } });
    console.log(JSON.stringify(schemes, null, 2));
    const subServices = await prisma.commissionSubService.findMany();
    console.log(JSON.stringify(subServices, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchemes();
