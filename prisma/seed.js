const { PrismaClient } = require("@prisma/client");
const { generateUuid } = require("../src/utils/id");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");

  // setup default tenant
  await prisma.tenant.upsert({
    where: { domain: "localhost" },
    update: {},
    create: { id: generateUuid(), name: "Localhost Tenant", domain: "localhost" }
  });

  // for frontend dev server
  await prisma.tenant.upsert({
    where: { domain: "localhost:5173" },
    update: {},
    create: { id: generateUuid(), name: "Frontend Dev 5173", domain: "localhost:5173" }
  });
  await prisma.tenant.upsert({
    where: { domain: "localhost:5174" },
    update: {},
    create: { id: generateUuid(), name: "Frontend Dev 5174", domain: "localhost:5174" }
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
      create: { id: generateUuid(), name }
    });
  }

  // basic perms
  const perms = ["VIEW_DASHBOARD", "MANAGE_USERS", "SEND_OTP"];
  for (const name of perms) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { id: generateUuid(), name }
    });
  }

  console.log("Seed done.");
}

main()
  .catch(e => {
    console.error("Seeding failed with error:", e.message);
    console.error("Stack trace:", e.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
