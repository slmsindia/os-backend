const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkKeys() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true, razorpayKeyId: true, razorpayKeySecret: true }
    });
    console.log('--- Tenant Keys ---');
    tenants.forEach(t => {
      console.log(`Tenant: ${t.name} (${t.id})`);
      console.log(`  Key ID: ${t.razorpayKeyId ? t.razorpayKeyId.substring(0, 8) + '...' : 'NONE'}`);
      console.log(`  Secret: ${t.razorpayKeySecret ? t.razorpayKeySecret.substring(0, 2) + '...' + t.razorpayKeySecret.slice(-2) : 'NONE'}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkKeys();
