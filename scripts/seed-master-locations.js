const { PrismaClient } = require("@prisma/client");
const { v4: uuidv4 } = require("uuid");
const prisma = new PrismaClient();

async function main() {
  console.log("Starting Master Location Seeding...");

  const locationData = [
    {
      country: "India",
      code: "IN",
      states: [
        {
          name: "Maharashtra",
          districts: [
            {
              name: "Mumbai City",
              municipalities: ["Mumbai Municipal Corporation"]
            },
            {
              name: "Pune",
              municipalities: ["Pune Municipal Corporation", "Pimpri-Chinchwad Municipal Corporation"]
            }
          ]
        },
        {
          name: "Delhi",
          districts: [
            {
              name: "Central Delhi",
              municipalities: ["New Delhi Municipal Council"]
            }
          ]
        },
        {
            name: "Uttar Pradesh",
            districts: [
              {
                name: "Lucknow",
                municipalities: ["Lucknow Municipal Corporation"]
              }
            ]
          }
      ]
    },
    {
      country: "Nepal",
      code: "NP",
      states: [
        {
          name: "Bagmati Province",
          districts: [
            {
              name: "Kathmandu",
              municipalities: ["Kathmandu Metropolitan City", "Budhanilkantha Municipality", "Kirtipur Municipality"]
            },
            {
              name: "Lalitpur",
              municipalities: ["Lalitpur Metropolitan City", "Godawari Municipality"]
            }
          ]
        },
        {
          name: "Lumbini Province",
          districts: [
            {
              name: "Rupandehi",
              municipalities: ["Butwal Sub-Metropolitan City", "Siddharthanagar Municipality"]
            }
          ]
        }
      ]
    }
  ];

  for (const cData of locationData) {
    // 1. Upsert Country
    const country = await prisma.country.upsert({
      where: { name: cData.country },
      update: {},
      create: {
        id: uuidv4(),
        name: cData.country,
        code: cData.code,
        isActive: true
      }
    });
    console.log(`- Country: ${country.name}`);

    for (const sData of cData.states) {
      // 2. Create State (No unique constraint on name, so we use find/create)
      let state = await prisma.state.findFirst({
        where: { name: sData.name, countryId: country.id }
      });
      if (!state) {
        state = await prisma.state.create({
          data: {
            id: uuidv4(),
            name: sData.name,
            countryId: country.id,
            isActive: true
          }
        });
      }
      console.log(`  -- State: ${state.name}`);

      for (const dData of sData.districts) {
        // 3. Create District
        let district = await prisma.district.findFirst({
          where: { name: dData.name, stateId: state.id }
        });
        if (!district) {
          district = await prisma.district.create({
            data: {
              id: uuidv4(),
              name: dData.name,
              stateId: state.id,
              isActive: true
            }
          });
        }
        console.log(`    --- District: ${district.name}`);

        for (const mName of dData.municipalities) {
          // 4. Create Municipality
          let municipality = await prisma.municipality.findFirst({
            where: { name: mName, districtId: district.id }
          });
          if (!municipality) {
            await prisma.municipality.create({
              data: {
                id: uuidv4(),
                name: mName,
                districtId: district.id,
                isActive: true
              }
            });
          }
          console.log(`      ---- Municipality: ${mName}`);
        }
      }
    }
  }

  console.log("Master Location Seeding Completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
