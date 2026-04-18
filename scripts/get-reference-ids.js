const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getReferenceData() {
  try {
    console.log('Fetching reference data IDs...\n');

    // Get all reference data
    const [educations, sectors, jobRoles, documentTypes, membershipConfig] = await Promise.all([
      prisma.education.findMany(),
      prisma.sector.findMany(),
      prisma.jobRole.findMany(),
      prisma.documentType.findMany(),
      prisma.membershipConfig.findFirst({ where: { isActive: true } })
    ]);

    console.log('=== MEMBERSHIP CONFIG ===');
    console.log(JSON.stringify(membershipConfig, null, 2));
    console.log('\n=== EDUCATIONS ===');
    educations.forEach(edu => console.log(`${edu.name}: ${edu.id}`));
    
    console.log('\n=== SECTORS ===');
    sectors.forEach(sector => console.log(`${sector.name}: ${sector.id}`));
    
    console.log('\n=== JOB ROLES ===');
    jobRoles.forEach(job => console.log(`${job.name}: ${job.id}`));
    
    console.log('\n=== DOCUMENT TYPES ===');
    documentTypes.forEach(doc => console.log(`${doc.name}: ${doc.id}`));

    // Create a sample request body
    console.log('\n=== SAMPLE API REQUEST BODY ===');
    const sampleBody = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      gender: "male",
      educationId: educations[6]?.id, // Bachelor's Degree
      sectorId: sectors[3]?.id, // Information Technology
      jobRoleId: jobRoles[4]?.id, // Engineer
      maritalStatus: "UnMarried",
      citizenship: "India",
      isMigrantWorker: false,
      monthlyIncome: "below 15000",
      currentCountry: "India",
      currentState: "Maharashtra",
      currentDistrict: "Mumbai",
      currentAddress: "123 Main Street, Andheri West",
      currentPincode: "400001",
      permanentCountry: "India",
      permanentState: "Bihar",
      permanentDistrict: "Patna",
      permanentAddress: "456 Home Street, Boring Road",
      permanentPincode: "800001",
      documents: [
        {
          documentTypeId: documentTypes[0]?.id, // Aadhaar Card
          documentNumber: "1234-5678-9012",
          frontImageUrl: "https://example.com/aadhaar-front.jpg",
          backImageUrl: "https://example.com/aadhaar-back.jpg"
        }
      ]
    };
    console.log(JSON.stringify(sampleBody, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getReferenceData();
