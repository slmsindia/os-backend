const prisma = require("../src/lib/prisma");

async function check() {
  try {
    const totalUsers = await prisma.user.count();
    console.log("Total users in DB:", totalUsers);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        identity: true,
        tenantId: true,
        mobile: true,
        approvalStatus: true,
        isDeleted: true
      }
    });
    console.log("Users:", JSON.stringify(users, null, 2));

    const tenants = await prisma.tenant.findMany();
    console.log("Tenants:", JSON.stringify(tenants, null, 2));

    const wallets = await prisma.wallet.findMany();
    console.log("Wallets:", JSON.stringify(wallets, null, 2));
  } catch (err) {
    console.error("Error checking DB:", err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
