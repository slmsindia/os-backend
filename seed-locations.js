const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // 1. Seed Countries
  const india = await prisma.country.upsert({
    where: { name: 'India' }, // name is unique in Country
    update: {},
    create: {
      id: 'india-uuid',
      name: 'India',
      code: 'IN',
      isActive: true
    },
  });

  // 2. Seed States (Use ID in where because name is not unique)
  const delhi = await prisma.state.upsert({
    where: { id: 'delhi-uuid' }, 
    update: {},
    create: {
      id: 'delhi-uuid',
      name: 'Delhi',
      countryId: india.id,
      isActive: true
    },
  });

  const maharashtra = await prisma.state.upsert({
    where: { id: 'maha-uuid' },
    update: {},
    create: {
      id: 'maha-uuid',
      name: 'Maharashtra',
      countryId: india.id,
      isActive: true
    },
  });

  // 3. Seed Districts
  await prisma.district.upsert({
    where: { id: 'district-1' },
    update: {},
    create: {
      id: 'district-1',
      name: 'Central Delhi',
      stateId: delhi.id,
      isActive: true
    },
  });

  await prisma.district.upsert({
    where: { id: 'district-2' },
    update: {},
    create: {
      id: 'district-2',
      name: 'Mumbai',
      stateId: maharashtra.id,
      isActive: true
    },
  });

  // 4. Seed Skills
  await prisma.skill.upsert({
    where: { name: 'Software Development' },
    update: {},
    create: { name: 'Software Development', isActive: true },
  });

  await prisma.skill.upsert({
    where: { name: 'Data Entry' },
    update: {},
    create: { name: 'Data Entry', isActive: true },
  });

  // 5. Seed Facilities
  await prisma.jobFacility.upsert({
    where: { name: 'Work From Home' },
    update: {},
    create: { name: 'Work From Home', isActive: true },
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
