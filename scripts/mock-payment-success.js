const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");
const bcrypt = require("bcrypt");

const generateUuid = () => crypto.randomUUID();

async function mockSuccess() {
  console.log("🚀 Mocking Payment Success for Mansi Dubey...");

  const mobile = "7046062012";
  const tenantDomain = "localhost:5173";

  try {
    const tenant = await prisma.tenant.findUnique({ where: { domain: tenantDomain } });
    if (!tenant) return console.error("Tenant not found");

    // 1. Ensure User Exists
    let user = await prisma.user.findFirst({ where: { mobile, tenantId: tenant.id } });
    if (!user) {
      const hashedPwd = await bcrypt.hash("123", 10);
      user = await prisma.user.create({
        data: {
          id: generateUuid(),
          mobile,
          fullName: "Mansi Dubey",
          password: hashedPwd,
          identity: "USER",
          approvalStatus: "APPROVED",
          tenantId: tenant.id,
          gender: "FEMALE",
          dateOfBirth: new Date("2001-12-27")
        }
      });
      console.log("✅ Created User Mansi Dubey");
    }

    // 2. Create Application in PENDING state (Simulating successful payment)
    const app = await prisma.application.create({
      data: {
        id: generateUuid(),
        userId: user.id,
        createdById: user.id, // Self-applied in this mock
        tenantId: tenant.id,
        targetIdentity: "MEMBER",
        status: "PENDING", // Ready for review
        paymentMethod: "RAZORPAY",
        paymentStatus: "SUCCESS", // MOCK SUCCESS
        paymentAmount: 150,
        razorpayPaymentId: "pay_mock_" + Math.random().toString(36).slice(2),
        submittedData: {
          firstName: "Mansi",
          lastName: "Dubey",
          email: "mansi@gmail.com",
          birthDate: "2001-12-27",
          citizenship: "India",
          currentAddress: "Out of Town",
          currentPincode: "382330",
          maritalStatus: "SINGLE",
          occupation: "STUDENT"
        }
      }
    });

    console.log(`✅ Success! Application ${app.id} created in PENDING state.`);
    console.log(`Bhai, ab aap White Label Admin se login karke 'Applications' ya 'Member Requests' section me check kare. Mansi Dubey ki request waha dikhni chahiye.`);

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

mockSuccess();
