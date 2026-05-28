const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const prisma = require("../src/lib/prisma");
const dashboardController = require("../src/controllers/dashboard.controller");

async function test() {
  try {
    // Find the WHITE_LABEL_ADMIN user
    const user = await prisma.user.findFirst({
      where: { identity: "WHITE_LABEL_ADMIN" }
    });

    if (!user) {
      console.error("No WHITE_LABEL_ADMIN found in DB!");
      return;
    }

    console.log("Found user:", user.fullName, "tenantId:", user.tenantId);

    // Mock req and res
    const req = {
      user: {
        user_id: user.id,
        role: "WHITE_LABEL_ADMIN",
        identity: "WHITE_LABEL_ADMIN",
        tenant_id: user.tenantId
      }
    };

    const res = {
      status(code) {
        console.log("Response status code:", code);
        return this;
      },
      json(data) {
        console.log("Response JSON data:", JSON.stringify(data, null, 2));
      }
    };

    console.log("Invoking getAdminStats...");
    await dashboardController.getAdminStats(req, res);

  } catch (err) {
    console.error("Test failed with error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
