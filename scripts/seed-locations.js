const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const locations = [
  {
    country: "India",
    code: "IN",
    states: [
      {
        name: "Gujarat",
        districts: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Gandhidham", "Anand", "Navsari", "Morbi", "Nadiad", "Surendranagar", "Bharuch"]
      },
      {
        name: "Maharashtra",
        districts: ["Mumbai", "Pune", "Nagpur", "Thane", "Pimpri-Chinchwad", "Nashik", "Kalyan-Dombivli", "Vasai-Virar", "Aurangabad", "Navi Mumbai", "Solapur", "Mira-Bhayandar", "Bhiwandi", "Amravati", "Nanded"]
      },
      {
        name: "Delhi",
        districts: ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Central Delhi", "North East Delhi", "North West Delhi", "South East Delhi", "South West Delhi", "Shahdara"]
      },
      {
        name: "Karnataka",
        districts: ["Bengaluru", "Hubballi-Dharwad", "Mysuru", "Kalaburagi", "Mangaluru", "Belagavi", "Davanagere", "Ballari", "Vijayapura", "Shivamogga"]
      },
      {
        name: "Tamil Nadu",
        districts: ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tiruppur", "Erode", "Vellore", "Thoothukudi", "Tirunelveli"]
      },
      {
        name: "Uttar Pradesh",
        districts: ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Meerut", "Varanasi", "Prayagraj", "Bareilly", "Aligarh", "Moradabad", "Noida"]
      }
    ]
  },
  {
    country: "Nepal",
    code: "NP",
    states: [
      {
        name: "Province No. 1",
        districts: ["Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang", "Okhaldhunga", "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari", "Taplejung", "Terhathum", "Udayapur"]
      },
      {
        name: "Bagmati Province",
        districts: ["Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu", "Kavrepalanchok", "Lalitpur", "Makwanpur", "Nuwakot", "Ramechhap", "Rasuwa", "Sindhuli", "Sindhupalchok"]
      },
      {
        name: "Gandaki Province",
        districts: ["Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang", "Myagdi", "Nawalpur", "Parbat", "Syangja", "Tanahun"]
      },
      {
        name: "Lumbini Province",
        districts: ["Arghakhanchi", "Banke", "Bardiya", "Dang", "Gulmi", "Kapilvastu", "Parasi", "Palpa", "Pyuthan", "Rolpa", "Rukum East", "Rupandehi"]
      }
    ]
  }
];

async function main() {
  console.log("Start seeding locations...");

  for (const c of locations) {
    const country = await prisma.country.upsert({
      where: { name: c.country },
      update: { code: c.code },
      create: { name: c.country, code: c.code }
    });

    for (const s of c.states) {
      const state = await prisma.state.create({
        data: {
          name: s.name,
          countryId: country.id
        }
      });

      for (const d of s.districts) {
        await prisma.district.create({
          data: {
            name: d,
            stateId: state.id
          }
        });
      }
    }
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
