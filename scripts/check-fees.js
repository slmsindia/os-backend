const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkFees() {
  try {
    const config = await prisma.membershipConfig.findFirst({ where: { isActive: true } });
    console.log("--- Membership Config ---");
    console.log(config);

    const saathiFee = await prisma.globalSetting.findFirst({ where: { key: 'SAATHI_FEE' } });
    console.log("--- Saathi Fee Setting ---");
    console.log(saathiFee);

    const bizFee = await prisma.globalSetting.findFirst({ where: { key: 'BUSINESS_PARTNER_FEE' } });
    console.log("--- Business Partner Fee Setting ---");
    console.log(bizFee);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkFees();
