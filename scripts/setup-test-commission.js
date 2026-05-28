const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const generateUuid = () => crypto.randomUUID();

async function setup() {
  console.log("🚀 Setting up Commission Test Environment...");

  try {
    const tenant = await prisma.tenant.findUnique({ where: { domain: "localhost:5173" } });
    if (!tenant) throw new Error("Tenant not found");

    // 1. Create Scheme
    const scheme = await prisma.commissionScheme.create({
      data: {
        id: generateUuid(),
        name: "Default Testing Scheme",
        tenantId: tenant.id,
        isActive: true,
        isDefault: true
      }
    });
    console.log(`✅ Scheme Created: ${scheme.name}`);

    // 2. Create Service
    const service = await prisma.commissionService.create({
      data: {
        id: generateUuid(),
        name: "Onboarding Fees",
        tenantId: tenant.id,
        schemeId: scheme.id
      }
    });

    // 3. Create Sub-Service
    const subService = await prisma.commissionSubService.create({
      data: {
        id: generateUuid(),
        name: "Membership Fee",
        slug: "membership_fee",
        serviceId: service.id,
        tenantId: tenant.id,
        schemeId: scheme.id
      }
    });
    console.log(`✅ Sub-Service Created: ${subService.name}`);

    // 4. Create Share (Percentage)
    await prisma.commissionShare.create({
      data: {
        id: generateUuid(),
        schemeId: scheme.id,
        subServiceId: subService.id,
        commissionType: 1, // Percentage
        saathi: 10,
        districtPartner: 5,
        statePartner: 2,
        countryPartner: 1,
        admin: 1
      }
    });
    console.log(`✅ Commission Shares Defined.`);

    // 5. Update WL Admin with this scheme
    const wlAdmin = await prisma.user.findFirst({ where: { mobile: "9876543210", tenantId: tenant.id } });
    if (wlAdmin) {
      await prisma.user.update({
        where: { id: wlAdmin.id },
        data: { commissionSchemeId: scheme.id }
      });
      console.log(`✅ WL Admin updated with testing scheme.`);
    }

    // 6. Create Hierarchy: WL Admin -> Saathi -> Member
    const saathiMobile = "8888888888";
    const saathi = await prisma.user.upsert({
      where: { mobile_tenantId: { mobile: saathiMobile, tenantId: tenant.id } },
      update: { parentId: wlAdmin.id, identity: "SAATHI", commissionSchemeId: scheme.id },
      create: {
        id: generateUuid(),
        mobile: saathiMobile,
        fullName: "Test Saathi",
        password: await bcrypt.hash("123", 10),
        identity: "SAATHI",
        tenantId: tenant.id,
        parentId: wlAdmin.id,
        commissionSchemeId: scheme.id,
        approvalStatus: "APPROVED",
        gender: "MALE",
        dateOfBirth: new Date("1990-01-01")
      }
    });
    console.log(`✅ Saathi Created: ${saathi.fullName} (Child of WL Admin)`);

    const memberMobile = "7777777777";
    const member = await prisma.user.upsert({
      where: { mobile_tenantId: { mobile: memberMobile, tenantId: tenant.id } },
      update: { parentId: saathi.id, identity: "USER" },
      create: {
        id: generateUuid(),
        mobile: memberMobile,
        fullName: "Test Joiner",
        password: await bcrypt.hash("123", 10),
        identity: "USER",
        tenantId: tenant.id,
        parentId: saathi.id,
        approvalStatus: "APPROVED",
        gender: "MALE",
        dateOfBirth: new Date("2000-01-01")
      }
    });
    console.log(`✅ Joiner Created: ${member.fullName} (Child of Saathi)`);

    // 7. Ensure Wallets
    for (const u of [wlAdmin, saathi]) {
       await prisma.wallet.upsert({
         where: { userId: u.id },
         update: {},
         create: { id: generateUuid(), userId: u.id, tenantId: tenant.id, balance: 0, isCorporate: u.identity === 'WHITE_LABEL_ADMIN' }
       });
    }

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

setup();
