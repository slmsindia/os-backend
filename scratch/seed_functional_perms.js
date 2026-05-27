const { PrismaClient } = require("@prisma/client");
const { generateUuid } = require("../src/utils/id");
const prisma = new PrismaClient();

async function seedFunctionalPermissions() {
  const permissions = [
    { name: "PERM_MANAGE_APPLICATIONS", description: "Handle Membership, Saathi, and Business Partner Applications" },
    { name: "PERM_MANAGE_WALLETS", description: "Approve Wallet Top-up Requests" },
    { name: "PERM_VIEW_REPORTS", description: "View Dashboard Stats and Reports" },
    { name: "PERM_MANAGE_HIERARCHY", description: "View and Transfer Users in Hierarchy" }
  ];

  console.log("Seeding Functional Permissions...");

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: {},
      create: {
        id: generateUuid(),
        name: p.name
      }
    });
    console.log(`- Seeded: ${p.name}`);
  }

  console.log("Done.");
}

seedFunctionalPermissions()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
