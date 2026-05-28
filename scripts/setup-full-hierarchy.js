const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const generateUuid = () => crypto.randomUUID();

async function setupFullHierarchy() {
  console.log("🚀 Setting up Full Hierarchy Chain (WL -> CH -> SP -> DP -> Saathi -> Joiner)...");

  try {
    const tenant = await prisma.tenant.findUnique({ where: { domain: "localhost:5173" } });
    if (!tenant) throw new Error("Tenant not found");

    const password = await bcrypt.hash("123", 10);
    const common = { tenantId: tenant.id, password, approvalStatus: "APPROVED", gender: "MALE", dateOfBirth: new Date("1990-01-01") };

    // 1. Get WL Admin
    const wlAdmin = await prisma.user.findFirst({ where: { identity: "WHITE_LABEL_ADMIN", tenantId: tenant.id } });
    if (!wlAdmin) throw new Error("WL Admin not found. Run create-wl-admin.js first.");

    // 2. Setup Commission Scheme
    const scheme = await prisma.commissionScheme.upsert({
      where: { id: (await prisma.commissionScheme.findFirst({ where: { name: "Full Hierarchy Scheme", tenantId: tenant.id } }))?.id || generateUuid() },
      create: { id: generateUuid(), name: "Full Hierarchy Scheme", tenantId: tenant.id, isActive: true, isDefault: true },
      update: { isActive: true }
    });

    // 3. Setup Sub-Service (Saathi Registration Fee)
    const service = await prisma.commissionService.findFirst({ where: { name: "Onboarding Fees", tenantId: tenant.id } }) || 
                    await prisma.commissionService.create({ data: { id: generateUuid(), name: "Onboarding Fees", tenantId: tenant.id, schemeId: scheme.id } });

    const subService = await prisma.commissionSubService.findFirst({ where: { slug: "saathi_fee", tenantId: tenant.id } }) ||
                       await prisma.commissionSubService.create({
                         data: { id: generateUuid(), name: "Saathi Registration Fee", slug: "saathi_fee", serviceId: service.id, tenantId: tenant.id, schemeId: scheme.id }
                       });

    // 4. Set Shares in Scheme
    // Types: saathi, districtPartner, statePartner, countryPartner, admin
    await prisma.commissionShare.upsert({
      where: { schemeId_subServiceId: { schemeId: scheme.id, subServiceId: subService.id } },
      create: {
        id: generateUuid(), schemeId: scheme.id, subServiceId: subService.id, commissionType: 1, // Percentage
        saathi: 10, districtPartner: 5, statePartner: 3, countryPartner: 2, admin: 1
      },
      update: { saathi: 10, districtPartner: 5, statePartner: 3, countryPartner: 2, admin: 1 }
    });

    // 5. Create the Chain
    // WL Admin -> Country Head
    const countryHead = await prisma.user.upsert({
      where: { mobile_tenantId: { mobile: "9000000001", tenantId: tenant.id } },
      update: { parentId: wlAdmin.id, identity: "COUNTRY_HEAD", commissionSchemeId: scheme.id },
      create: { ...common, id: generateUuid(), mobile: "9000000001", fullName: "India Country Head", identity: "COUNTRY_HEAD", parentId: wlAdmin.id, commissionSchemeId: scheme.id }
    });

    // Country Head -> State Partner
    const statePartner = await prisma.user.upsert({
      where: { mobile_tenantId: { mobile: "9000000002", tenantId: tenant.id } },
      update: { parentId: countryHead.id, identity: "STATE_PARTNER", commissionSchemeId: scheme.id },
      create: { ...common, id: generateUuid(), mobile: "9000000002", fullName: "Gujarat State Partner", identity: "STATE_PARTNER", parentId: countryHead.id, commissionSchemeId: scheme.id }
    });

    // State Partner -> District Partner
    const districtPartner = await prisma.user.upsert({
      where: { mobile_tenantId: { mobile: "9000000003", tenantId: tenant.id } },
      update: { parentId: statePartner.id, identity: "DISTRICT_PARTNER", commissionSchemeId: scheme.id },
      create: { ...common, id: generateUuid(), mobile: "9000000003", fullName: "Ahmedabad District Partner", identity: "DISTRICT_PARTNER", parentId: statePartner.id, commissionSchemeId: scheme.id }
    });

    // District Partner -> Saathi
    const saathi = await prisma.user.upsert({
      where: { mobile_tenantId: { mobile: "9000000004", tenantId: tenant.id } },
      update: { parentId: districtPartner.id, identity: "SAATHI", commissionSchemeId: scheme.id },
      create: { ...common, id: generateUuid(), mobile: "9000000004", fullName: "Local Saathi Agent", identity: "SAATHI", parentId: districtPartner.id, commissionSchemeId: scheme.id }
    });

    // Saathi -> Joiner (The one being registered)
    const joiner = await prisma.user.upsert({
      where: { mobile_tenantId: { mobile: "9000000005", tenantId: tenant.id } },
      update: { parentId: saathi.id, identity: "USER" },
      create: { ...common, id: generateUuid(), mobile: "9000000005", fullName: "New Member User", identity: "USER", parentId: saathi.id }
    });

    console.log("✅ Full Hierarchy Created!");
    console.log(`Chain: ${wlAdmin.fullName} -> ${countryHead.fullName} -> ${statePartner.fullName} -> ${districtPartner.fullName} -> ${saathi.fullName} -> ${joiner.fullName}`);

    // 6. Ensure Wallets for all
    const users = [wlAdmin, countryHead, statePartner, districtPartner, saathi];
    for (const u of users) {
      await prisma.wallet.upsert({
        where: { userId: u.id },
        update: {},
        create: { id: generateUuid(), userId: u.id, tenantId: tenant.id, balance: 1000, isCorporate: u.identity === 'WHITE_LABEL_ADMIN' }
      });
    }
    console.log("✅ Wallets initialized with ₹1000 each (except WL Admin which is corporate).");

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

setupFullHierarchy();
