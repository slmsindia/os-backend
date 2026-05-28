const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const generateUuid = () => crypto.randomUUID();

async function createWLAdmin() {
  console.log("🚀 Creating White Label Admin...");

  const mobile = "9876543210";
  const password = "Admin@123";
  const domain = "localhost:5173";

  try {
    // 1. Get Tenant
    const tenant = await prisma.tenant.findUnique({ where: { domain } });
    if (!tenant) {
      console.error(`❌ Tenant for domain ${domain} not found. Please run seed first.`);
      return;
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create WL Admin User
    const wlAdmin = await prisma.user.upsert({
      where: { 
        mobile_tenantId: { 
          mobile, 
          tenantId: tenant.id 
        } 
      },
      update: {
        identity: "WHITE_LABEL_ADMIN",
        approvalStatus: "APPROVED"
      },
      create: {
        id: generateUuid(),
        mobile,
        password: hashedPassword,
        fullName: "Sample WhiteLabel Admin",
        identity: "WHITE_LABEL_ADMIN",
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        gender: "MALE",
        dateOfBirth: new Date("1985-05-20"),
        tenantId: tenant.id,
        path: "" // Root level for this tenant
      }
    });

    console.log(`✅ White Label Admin created: ${mobile} under tenant: ${tenant.name}`);

    // 4. Create Wallet
    const wallet = await prisma.wallet.upsert({
      where: { userId: wlAdmin.id },
      update: {},
      create: {
        id: generateUuid(),
        userId: wlAdmin.id,
        tenantId: tenant.id,
        balance: 5000, // Give some initial balance for testing
        isCorporate: true // WL Admins usually have the corporate wallet
      }
    });

    console.log(`✅ Corporate Wallet created for WL Admin with balance: ${wallet.balance}`);

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

createWLAdmin();
