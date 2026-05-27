const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");

const generateUuid = () => crypto.randomUUID();

async function updateFees() {
  console.log("🚀 Updating Fees to match screenshot (100, 150, 500)...");

  try {
    const tenants = await prisma.tenant.findMany();
    
    for (const tenant of tenants) {
      console.log(`Setting fees for tenant: ${tenant.name} (${tenant.domain})`);

      // 1. Membership Fee (100)
      await prisma.membershipConfig.upsert({
        where: { id: (await prisma.membershipConfig.findFirst({ where: { tenantId: tenant.id } }))?.id || generateUuid() },
        create: {
          id: generateUuid(),
          tenantId: tenant.id,
          membershipPrice: 100,
          serviceCharge: 99,
          platformFee: 1,
          gst: 0,
          isActive: true,
          includedExcluded: true
        },
        update: {
          membershipPrice: 100,
          serviceCharge: 99,
          platformFee: 1,
          gst: 0
        }
      });

      // 2. Saathi Fee (150)
      await prisma.globalSetting.upsert({
        where: { key_tenantId: { key: 'SAATHI_FEE', tenantId: tenant.id } },
        create: {
          id: generateUuid(),
          tenantId: tenant.id,
          key: 'SAATHI_FEE',
          value: JSON.stringify({ amount: 150, serviceCharge: 149, platformFee: 1 })
        },
        update: {
          value: JSON.stringify({ amount: 150, serviceCharge: 149, platformFee: 1 })
        }
      });

      // 3. Business Partner Fee (500)
      await prisma.globalSetting.upsert({
        where: { key_tenantId: { key: 'BUSINESS_PARTNER_FEE', tenantId: tenant.id } },
        create: {
          id: generateUuid(),
          tenantId: tenant.id,
          key: 'BUSINESS_PARTNER_FEE',
          value: JSON.stringify({ amount: 500, serviceCharge: 499, platformFee: 1 })
        },
        update: {
          value: JSON.stringify({ amount: 500, serviceCharge: 499, platformFee: 1 })
        }
      });
    }

    console.log("✅ All fees updated successfully!");

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

updateFees();
