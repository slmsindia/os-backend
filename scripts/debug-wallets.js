const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkWallets() {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { isCorporate: true }
    });
    console.log("--- Corporate Wallets ---");
    console.log(JSON.stringify(wallets, null, 2));

    const tenants = await prisma.tenant.findMany();
    console.log("--- Tenants ---");
    console.log(JSON.stringify(tenants, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkWallets();
