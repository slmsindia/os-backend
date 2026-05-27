const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('--- Seeding Indo-Nepal Services ---');
    
    // 1. Create/Find Service
    let service = await prisma.commissionService.findFirst({
      where: { name: 'Indo-Nepal Transfer' }
    });

    if (!service) {
      service = await prisma.commissionService.create({
        data: { name: 'Indo-Nepal Transfer' }
      });
      console.log('Created Service: Indo-Nepal Transfer');
    }

    // 2. Create Sub-Services
    const subServices = [
      { name: 'IME Transfer', slug: 'ime-transfer' },
      { name: 'Prabhu Transfer', slug: 'prabhu-transfer' }
    ];

    for (const sub of subServices) {
      const existing = await prisma.commissionSubService.findUnique({
        where: { slug: sub.slug }
      });

      if (!existing) {
        await prisma.commissionSubService.create({
          data: {
            name: sub.name,
            slug: sub.slug,
            serviceId: service.id
          }
        });
        console.log(`Created Sub-Service: ${sub.name}`);
      } else {
        console.log(`Sub-Service already exists: ${sub.name}`);
      }
    }

    console.log('--- Seeding Complete ---');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
