const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  try {
    const districts = await prisma.district.findMany({
      where: { name: { in: ['Kathmandu', 'Lalitpur', 'Bhaktapur'] } },
      include: { municipalities: true }
    });
    
    for (const d of districts) {
      console.log(`District: ${d.name} (${d.id}) - Municipalities: ${d.municipalities.length}`);
      d.municipalities.forEach(m => console.log(`  - ${m.name}`));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

verify();
