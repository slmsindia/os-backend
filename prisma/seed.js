const { PrismaClient } = require("@prisma/client");
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
=======
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

  // Production tenant
  await prisma.tenant.upsert({
    where: { domain: "apiv2.onlinesaathi.org" },
    update: {},
    create: { id: generateUuid(), name: "Production Tenant", domain: "apiv2.onlinesaathi.org" }
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

  // --- Custom user seed ---
  const tenant = await prisma.tenant.findFirst();
  const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });

  await prisma.user.upsert({
    where: { mobile: "9099005251" },
    update: {},
    create: {
      id: generateUuid(),
      mobile: "9099005251",
      password: "Test@123", // Change as needed
      fullName: "Online Saathi",
      gender: "OTHER",
      dateOfBirth: new Date("1990-01-01"),
      identity: "ADMIN",
      tenantId: tenant.id,
      roles: {
        create: {
          id: generateUuid(),
          roleId: superAdminRole.id
>>>>>>> main
=======
>>>>>>> origin/main
        }
      }
    }
  });
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main
  console.log(`✅ SuperAdmin user created: ${mobile}`);

  // 3.1 Create White Label Admin for Vite dev tenant (localhost:5173)
  const wlTenant = seededTenants.find((tenant) => tenant.domain === "localhost:5173");
  const wlAdminMobile = "9876543210";
  const wlAdminPassword = "123";
  const wlAdminHashedPassword = await bcrypt.hash(wlAdminPassword, 10);

  if (wlTenant) {
    const wlAdmin = await prisma.user.upsert({
      where: {
        mobile_tenantId: {
          mobile: wlAdminMobile,
          tenantId: wlTenant.id
        }
      },
      update: {
        password: wlAdminHashedPassword,
        fullName: "5173 White Label Admin",
        identity: "WHITE_LABEL_ADMIN",
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        gender: "MALE",
        dateOfBirth: new Date("1990-01-01"),
        parentId: null,
        path: ""
      },
      create: {
        id: generateUuid(),
        mobile: wlAdminMobile,
        password: wlAdminHashedPassword,
        fullName: "5173 White Label Admin",
        identity: "WHITE_LABEL_ADMIN",
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        gender: "MALE",
        dateOfBirth: new Date("1990-01-01"),
        tenantId: wlTenant.id,
        path: "",
        roles: {
          create: {
            id: generateUuid(),
            roleId: seededRoles["WHITE_LABEL_ADMIN"].id
          }
        }
      }
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: wlAdmin.id,
          roleId: seededRoles["WHITE_LABEL_ADMIN"].id
        }
      },
      update: {},
      create: {
        id: generateUuid(),
        userId: wlAdmin.id,
        roleId: seededRoles["WHITE_LABEL_ADMIN"].id
      }
    });

    await prisma.wallet.upsert({
      where: { userId: wlAdmin.id },
      update: {
        tenantId: wlTenant.id,
        isCorporate: true
      },
      create: {
        id: generateUuid(),
        userId: wlAdmin.id,
        tenantId: wlTenant.id,
        balance: 5000,
        isCorporate: true
      }
    });

    console.log(`White Label Admin created for localhost:5173: ${wlAdminMobile} / ${wlAdminPassword}`);
  }

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

  const nepal = await prisma.country.upsert({
    where: { name: "Nepal" },
    update: {},
    create: { id: generateUuid(), name: "Nepal", code: "NP", isActive: true }
  });

  // India -> Gujarat
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

  const inDistricts = ["Ahmedabad", "Surat", "Vadodara", "Rajkot"];
  for (const dName of inDistricts) {
    await prisma.district.upsert({
      where: { name: dName },
      update: {},
      create: { 
        id: generateUuid(), 
        name: dName, 
        stateId: gujarat.id, 
        isActive: true 
      }
    });
  }

  // Nepal -> Provinces (States)
  const nepalProvinces = ["Koshi Province", "Madhesh Province", "Bagmati Province", "Gandaki Province", "Lumbini Province", "Karnali Province", "Sudurpashchim Province"];
  for (const pName of nepalProvinces) {
    const province = await prisma.state.upsert({
      where: { name: pName },
      update: {},
      create: { 
        id: generateUuid(), 
        name: pName, 
        countryId: nepal.id, 
        isActive: true 
      }
    });

    // Sample Districts for Bagmati
    if (pName === "Bagmati Province") {
      const bagmatiDistricts = ["Kathmandu", "Lalitpur", "Bhaktapur"];
      for (const dName of bagmatiDistricts) {
        const dist = await prisma.district.upsert({
          where: { name: dName },
          update: {},
          create: { 
            id: generateUuid(), 
            name: dName, 
            stateId: province.id, 
            isActive: true 
          }
        });

        // Municipalities for Kathmandu
        if (dName === "Kathmandu") {
          const ktmMunicipalities = ["Kathmandu Metropolitan City", "Kirtipur Municipality", "Budhanilkantha Municipality", "Tokha Municipality"];
          for (const mName of ktmMunicipalities) {
            await prisma.municipality.upsert({
              where: { name: mName },
              update: {},
              create: { id: generateUuid(), name: mName, districtId: dist.id, isActive: true }
            });
          }
        }
        // Municipalities for Lalitpur
        if (dName === "Lalitpur") {
          const lalitMunicipalities = ["Lalitpur Metropolitan City", "Mahalaxmi Municipality", "Godawari Municipality"];
          for (const mName of lalitMunicipalities) {
            await prisma.municipality.upsert({
              where: { name: mName },
              update: {},
              create: { id: generateUuid(), name: mName, districtId: dist.id, isActive: true }
            });
          }
        }
        // Municipalities for Bhaktapur
        if (dName === "Bhaktapur") {
          const bhakMunicipalities = ["Bhaktapur Municipality", "Madhyapur Thimi Municipality", "Changunarayan Municipality", "Suryabinayak Municipality"];
          for (const mName of bhakMunicipalities) {
            await prisma.municipality.upsert({
              where: { name: mName },
              update: {},
              create: { id: generateUuid(), name: mName, districtId: dist.id, isActive: true }
            });
          }
        }
      }
    }
  }

  console.log("✅ Location data seeded (India & Nepal).");

  console.log("✨ Seeding finished successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
<<<<<<< HEAD
=======
  // --- End custom user seed ---

  console.log("Seed done.");
}

main()
  .catch(e => {
    console.error("Seeding failed with error:", e.message);
    console.error("Stack trace:", e.stack);
>>>>>>> main
=======
>>>>>>> origin/main
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
