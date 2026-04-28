const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const { v4: generateUuid } = require("uuid");

const prisma = new PrismaClient();

async function setup() {
  try {
    console.log("Starting SuperAdmin setup...");

    // 1. Create a Default Tenant
    const tenant = await prisma.tenant.upsert({
      where: { domain: "onlinesaathi.com" },
      update: {},
      create: {
        id: generateUuid(),
        name: "Online Saathi",
        domain: "onlinesaathi.com",
      }
    });
    console.log(`Tenant created/found: ${tenant.name} (${tenant.id})`);

    // 2. Create Super Admin User
    const mobile = "9099005251";
    const password = "Test@123";
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { mobile: mobile },
      update: {
        password: hashedPassword,
        identity: "SUPER_ADMIN",
        userType: "ADMIN",
        approvalStatus: "APPROVED"
      },
      create: {
        id: generateUuid(),
        mobile: mobile,
        password: hashedPassword,
        fullName: "Super Admin",
        gender: "MALE",
        dateOfBirth: new Date("1990-01-01"),
        identity: "SUPER_ADMIN",
        userType: "ADMIN",
        approvalStatus: "APPROVED",
        tenantId: tenant.id,
        path: ""
      }
    });
    console.log(`SuperAdmin user created/updated: ${user.fullName}`);

    // 3. Create Corporate Wallet for Admin
    const wallet = await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {
        isCorporate: true,
        isActive: true
      },
      create: {
        id: generateUuid(),
        userId: user.id,
        tenantId: tenant.id,
        balance: 10000.0, // Starting balance for testing
        isCorporate: true,
        isActive: true,
        currency: "INR"
      }
    });
    console.log(`Corporate Wallet created for Admin. Balance: ${wallet.balance}`);

    console.log("\nSetup completed successfully!");
    console.log(`Mobile: ${mobile}`);
    console.log(`Password: ${password}`);

  } catch (err) {
    console.error("Setup failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

setup();
