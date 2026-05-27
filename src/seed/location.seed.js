const { generateUuid } = require("../utils/id");

const prisma = require("../lib/prisma");

async function main() {
  console.log("Seeding location data...");

  // 1. Create India
  let india = await prisma.country.findUnique({ where: { name: "India" } });
  if (!india) {
    india = await prisma.country.create({
      data: {
        id: "1",
        name: "India",
        code: "IN"
      }
    });
    console.log("Created Country: India");
  }

  // 2. Sample States
  const states = [
    { name: "Gujarat", code: "GJ" },
    { name: "Maharashtra", code: "MH" },
    { name: "Rajasthan", code: "RJ" }
  ];

  for (const s of states) {
    let state = await prisma.state.findFirst({ where: { name: s.name } });
    if (!state) {
      state = await prisma.state.create({
        data: {
          id: generateUuid(),
          name: s.name,
          countryId: india.id
        }
      });
      console.log(`Created State: ${s.name}`);
    }

    // 3. Sample Districts
    const districts = ["Ahmedabad", "Surat", "Rajkot", "Mumbai", "Pune", "Jaipur"];
    // Simplified logic: adding some districts to each state if they don't exist
    for (const d of districts) {
        // Only add if it's relevant (simple check for demo)
        const districtExists = await prisma.district.findFirst({ where: { name: d, stateId: state.id } });
        if (!districtExists) {
            const district = await prisma.district.create({
                data: {
                    id: generateUuid(),
                    name: d,
                    stateId: state.id
                }
            });
            console.log(`Created District: ${d} in ${s.name}`);

            // 4. Sample Municipality
            await prisma.municipality.create({
                data: {
                    id: generateUuid(),
                    name: d + " Municipality",
                    districtId: district.id
                }
            });
        }
    }
  }

  // 5. Seed Facilities (JobFacility)
  const facilities = ["WiFi", "Parking", "Cafeteria", "Health Insurance"];
  for (const f of facilities) {
    const exists = await prisma.jobFacility.findUnique({ where: { name: f } });
    if (!exists) {
        await prisma.jobFacility.create({
            data: { id: generateUuid(), name: f }
        });
        console.log(`Created Facility: ${f}`);
    }
  }

  console.log("Location and Facilities seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
