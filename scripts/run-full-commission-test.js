const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const commissionService = require("../src/services/commission.service");

async function runFullTest() {
  console.log("🔥 Triggering FULL Hierarchy Commission Flow Test (₹150 Saathi Fee)...");

  try {
    const tenant = await prisma.tenant.findUnique({ where: { domain: "localhost:5173" } });
    const joiner = await prisma.user.findFirst({ where: { mobile: "9000000005", tenantId: tenant.id } });
    const subService = await prisma.commissionSubService.findFirst({ where: { slug: "saathi_fee", tenantId: tenant.id } });

    if (!joiner || !subService) {
      console.error("❌ Test data not found. Run setup-full-hierarchy.js first.");
      return;
    }

    console.log(`[Test] Processing ₹150 Commission for Joiner: ${joiner.fullName}`);
    const result = await commissionService.processCommission(
      150,
      subService.id,
      joiner.id,
      "Full Hierarchy Test Commission",
      null,
      {
        referenceId: "full_chain_test_" + Date.now(),
        referenceType: "SAATHI_REG_TEST"
      }
    );

    console.log("\n--- FINAL TEST RESULT ---");
    console.log(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error("❌ Error during test:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runFullTest();
