const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Database Reset...");

  // 1. Delete all data (Order matters due to FK constraints)
  const tablenames = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tablenames) {
    if (tablename !== "_prisma_migrations") {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" RESTART IDENTITY CASCADE;`);
        console.log(`Cleared table: ${tablename}`);
      } catch (err) {
        console.log(`Skipped table: ${tablename} (Error: ${err.message})`);
      }
    }
  }

  console.log("Database cleared. Starting Seeding...");

  // 2. Setup Default Tenant
  const tenantId = uuidv4();
  await prisma.tenant.create({
    data: {
      id: tenantId,
      name: "Main Tenant",
      domain: "localhost"
    }
  });

  // 3. Create Roles
  const roles = ["ADMIN", "SUPER_ADMIN", "USER"];
  const roleMap = {};
  for (const name of roles) {
    const role = await prisma.role.create({
      data: { id: uuidv4(), name }
    });
    roleMap[name] = role.id;
  }

  // 4. Create Super Admin
  const hashedPassword = await bcrypt.hash("Test@123", 10);
  await prisma.user.create({
    data: {
      id: uuidv4(),
      mobile: "9099005251",
      password: hashedPassword,
      fullName: "Online Saathi SuperAdmin",
      gender: "MALE",
      dateOfBirth: new Date("1990-01-01"),
      identity: "SUPER_ADMIN",
      tenantId: tenantId,
      roles: {
        create: {
          id: uuidv4(),
          roleId: roleMap["SUPER_ADMIN"]
        }
      }
    }
  });

  console.log("Reset and Seeding complete!");
  console.log("Mobile: 9099005251");
  console.log("Password: Test@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
