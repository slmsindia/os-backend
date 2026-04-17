const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tenant = await prisma.tenant.findFirst();
    console.log('✅ Tenant found:', tenant);
    
    if (!tenant) {
      console.log('⚠️ No tenants found in database.');
    }
  } catch (e) {
    console.error('❌ DB ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
