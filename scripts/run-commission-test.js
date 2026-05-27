const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const commissionService = require("../src/services/commission.service");

async function runTest() {
  console.log("🔥 Triggering Commission Flow Test...");

  try {
    const tenant = await prisma.tenant.findUnique({ where: { domain: "localhost:5173" } });
    const joiner = await prisma.user.findFirst({ where: { mobile: "7777777777", tenantId: tenant.id } });
    const subService = await prisma.commissionSubService.findFirst({ where: { slug: "membership_fee", tenantId: tenant.id } });

    if (!joiner || !subService) {
      console.error("❌ Test data not found. Run setup script first.");
      return;
    }

    // Trigger Commission for 100 INR Membership Fee
    console.log(`[Test] Processing 100 INR Commission for Joiner: ${joiner.fullName}`);
    const result = await commissionService.processCommission(
      100,
      subService.id,
      joiner.id,
      "Test Commission for Membership",
      null,
      {
        referenceId: "test_ref_" + Date.now(),
        referenceType: "MEMBERSHIP_TEST"
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

runTest();
