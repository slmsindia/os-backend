const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");

  // setup default tenant
  await prisma.tenant.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", name: "Main Tenant" }
  });

  // initial roles
  const roles = [
    "ADMIN",
    "SUPER_ADMIN",
    "SUB_ADMIN",
    "SUPPORT_TEAM",
    "COUNTRY_HEAD",
    "STATE_PARTNER",
    "DISTRICT_PARTNER",
    "BUSINESS_PARTNER",
    "SAATHI",
    "MEMBER",
    "AGENT",
    "USER"
  ];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  // basic perms
  const perms = ["VIEW_DASHBOARD", "MANAGE_USERS", "SEND_OTP"];
  for (const name of perms) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  console.log("Seed done.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
