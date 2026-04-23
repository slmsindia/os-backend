const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLocations() {
  try {
    const countries = await prisma.country.findMany();
    console.log('✅ Countries:', countries.length);
    console.log(countries);
    
    const states = await prisma.state.count();
    console.log('\n✅ States count:', states);
    
    const districts = await prisma.district.count();
    console.log('✅ Districts count:', districts);
    
    const municipalities = await prisma.municipality.count();
    console.log('✅ Municipalities count:', municipalities);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLocations();
