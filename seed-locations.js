const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");

  // 1. Seed Countries
  const countriesData = [
    { name: 'India', code: 'IN' },
    { name: 'Nepal', code: 'NP' }
  ];

  for (const c of countriesData) {
    await prisma.country.upsert({
      where: { name: c.name },
      update: { code: c.code },
      create: { name: c.name, code: c.code, isActive: true }
    });
  }

  const india = await prisma.country.findUnique({ where: { name: 'India' } });
  const nepal = await prisma.country.findUnique({ where: { name: 'Nepal' } });

  // 2. Seed States for India (10 states)
  const indiaStates = [
    'Delhi', 'Maharashtra', 'Karnataka', 'Gujarat', 'Tamil Nadu', 
    'Uttar Pradesh', 'Rajasthan', 'Punjab', 'West Bengal', 'Kerala'
  ];

  for (const stateName of indiaStates) {
    await prisma.state.upsert({
      where: { name: stateName },
      update: {},
      create: { name: stateName, countryId: india.id, isActive: true }
    });
  }

  // 3. Seed States for Nepal (7 provinces)
  const nepalStates = [
    'Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'
  ];

  for (const stateName of nepalStates) {
    await prisma.state.upsert({
      where: { name: stateName },
      update: {},
      create: { name: stateName, countryId: nepal.id, isActive: true }
    });
  }

  // 4. Seed Districts for Delhi (11 districts)
  const delhi = await prisma.state.findUnique({ where: { name: 'Delhi' } });
  if (delhi) {
    const delhiDistricts = [
      'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
      'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'
    ];

    for (const dName of delhiDistricts) {
      await prisma.district.upsert({
        where: { name: dName },
        update: {},
        create: { name: dName, stateId: delhi.id, isActive: true }
      });
    }
  }

  // 5. Seed Districts for Bagmati, Nepal (11 districts)
  const bagmati = await prisma.state.findUnique({ where: { name: 'Bagmati' } });
  if (bagmati) {
    const bagmatiDistricts = [
      'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kavrepalanchok', 'Chitwan',
      'Makwanpur', 'Nuwakot', 'Dhading', 'Sindhupalchok', 'Dolakha', 'Ramechhap'
    ];

    for (const dName of bagmatiDistricts) {
      await prisma.district.upsert({
        where: { name: dName },
        update: {},
        create: { name: dName, stateId: bagmati.id, isActive: true }
      });
    }
  }

  // 6. Seed Municipalities for Kathmandu District (11 municipalities)
  const kathmandu = await prisma.district.findUnique({ where: { name: 'Kathmandu' } });
  if (kathmandu) {
    const ktmMunicipalities = [
      'Kathmandu Metropolitan City', 'Kirtipur Municipality', 'Shankharapur Municipality',
      'Kageshwari-Manohara Municipality', 'Gokarneshwar Municipality', 'Budhanilkantha Municipality',
      'Tokha Municipality', 'Tarakeshwar Municipality', 'Nagarjun Municipality',
      'Chandragiri Municipality', 'Dakshinkali Municipality'
    ];

    for (const mName of ktmMunicipalities) {
      await prisma.municipality.upsert({
        where: { name: mName },
        update: {},
        create: { name: mName, districtId: kathmandu.id, isActive: true }
      });
    }
  }

  // 7. Seed Skills (Using findFirst/create because name is not unique in schema)
  const skills = ['Software Development', 'Data Entry', 'Accounting', 'Graphic Design', 'Sales', 'Marketing'];
  for (const s of skills) {
    const existing = await prisma.skill.findFirst({ where: { name: s } });
    if (!existing) {
      await prisma.skill.create({
        data: { name: s, isActive: true }
      });
    }
  }

  // 8. Seed Facilities
  const facilities = ['Work From Home', 'Health Insurance', 'Flexible Hours', 'Free Meals', 'Travel Allowance'];
  for (const f of facilities) {
    const existing = await prisma.jobFacility.findFirst({ where: { name: f } });
    if (!existing) {
      await prisma.jobFacility.create({
        data: { name: f, isActive: true }
      });
    }
  }

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
