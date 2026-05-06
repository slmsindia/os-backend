const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Minimal UUID generator for seed
const generateUuid = () => crypto.randomUUID();

async function main() {
  console.log("🚀 Starting Seeding...");

  // 1. Create Default Tenants
  const tenants = [
    { name: "Main Platform", domain: "localhost" },
    { name: "Main Platform Backend", domain: "localhost:3006" },
    { name: "Frontend Dev 3000", domain: "localhost:3000" },
    { name: "Frontend Dev 5173", domain: "localhost:5173" },
    { name: "Frontend Dev 5174", domain: "localhost:5174" }
  ];

  const seededTenants = [];
  for (const t of tenants) {
    const tenant = await prisma.tenant.upsert({
      where: { domain: t.domain },
      update: {},
      create: { 
        id: generateUuid(), 
        name: t.name, 
        domain: t.domain 
      }
    });
    seededTenants.push(tenant);
  }
  const defaultTenant = seededTenants[0];
  console.log("✅ Tenants seeded.");

  // 2. Create Roles
  const roles = [
    "SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN",
    "COUNTRY_HEAD", "STATE_PARTNER", "DISTRICT_PARTNER",
    "SAATHI", "MEMBER", "BUSINESS_PARTNER", "AGENT", "USER"
  ];
  
  const seededRoles = {};
  for (const roleName of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { id: generateUuid(), name: roleName }
    });
    seededRoles[roleName] = role;
  }
  console.log("✅ Roles seeded.");

  // 3. Create Super Admin User
  const mobile = "9099005251";
  const password = "Test@123";
  const hashedPassword = await bcrypt.hash(password, 10);

  const superAdmin = await prisma.user.upsert({
    where: { 
      mobile_tenantId: { 
        mobile, 
        tenantId: defaultTenant.id 
      } 
    },
    update: {
      password: hashedPassword,
      identity: "SUPER_ADMIN",
      approvalStatus: "APPROVED"
    },
    create: {
      id: generateUuid(),
      mobile,
      password: hashedPassword,
      fullName: "Main Super Admin",
      identity: "SUPER_ADMIN",
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
      gender: "MALE",
      dateOfBirth: new Date("1990-01-01"),
      tenantId: defaultTenant.id,
      roles: {
        create: {
          id: generateUuid(),
          roleId: seededRoles["SUPER_ADMIN"].id
        }
      }
    }
  });
  console.log(`✅ SuperAdmin user created: ${mobile}`);

  // 4. Ensure Wallet for SuperAdmin
  const existingWallet = await prisma.wallet.findFirst({
    where: { userId: superAdmin.id }
  });

  if (!existingWallet) {
    await prisma.wallet.create({
      data: {
        id: generateUuid(),
        userId: superAdmin.id,
        tenantId: defaultTenant.id,
        balance: 1000000, // Initial large balance for super admin
        isCorporate: true
      }
    });
    console.log("✅ SuperAdmin wallet created.");
  }

  // 5. Create basic global settings (Defaults)
  const defaultSettings = [
    { key: 'BUSINESS_PARTNER_FEE', value: JSON.stringify({ amount: 2000 }) },
    { key: 'SAATHI_FEE', value: JSON.stringify({ amount: 1000 }) },
    { key: 'MEMBERSHIP_FEE', value: "150" }
  ];

  for (const s of defaultSettings) {
    await prisma.globalSetting.upsert({
      where: { key_tenantId: { key: s.key, tenantId: defaultTenant.id } },
      update: {},
      create: {
        id: generateUuid(),
        key: s.key,
        value: s.value,
        tenantId: defaultTenant.id
      }
    });
  }
  // 6. Seed Locations (Sample)
  const india = await prisma.country.upsert({
    where: { name: "India" },
    update: {},
    create: { id: generateUuid(), name: "India", code: "IN", isActive: true }
  });

  const gujarat = await prisma.state.upsert({
    where: { name: "Gujarat" },
    update: {},
    create: { 
      id: generateUuid(), 
      name: "Gujarat", 
      countryId: india.id, 
      isActive: true 
    }
  });

  const districts = ["Ahmedabad", "Surat", "Vadodara", "Rajkot"];
  for (const dName of districts) {
    const dist = await prisma.district.upsert({
      where: { name: dName },
      update: {},
      create: { 
        id: generateUuid(), 
        name: dName, 
        stateId: gujarat.id, 
        isActive: true 
      }
    });

    await prisma.municipality.upsert({
      where: { name: `${dName} Municipality` },
      update: {},
      create: { 
        id: generateUuid(), 
        name: `${dName} Municipality`, 
        districtId: dist.id, 
        isActive: true 
      }
    });
  }
  console.log("✅ Location data seeded (India -> Gujarat -> Districts).");

  console.log("✨ Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
