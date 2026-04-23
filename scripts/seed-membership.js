const { PrismaClient } = require('@prisma/client');
const { generateUuid } = require('../src/utils/id');

const prisma = new PrismaClient();

async function seedMembershipData() {
  console.log('Starting membership data seed...');

  try {
    // 1. Create membership configuration
    const membershipConfig = await prisma.membershipConfig.create({
      data: {
        id: generateUuid(),
        membershipPrice: 100.0,
        currency: 'INR',
        isActive: true
      }
    });
    console.log('✓ Membership config created (Price: ₹100)');

    // 2. Create educations
    const educations = [
      'Illiterate',
      'Primary School',
      'Middle School',
      'High School',
      'Higher Secondary',
      'Diploma',
      "Bachelor's Degree",
      "Master's Degree",
      'PhD',
      'Other'
    ];

    for (const name of educations) {
      await prisma.education.upsert({
        where: { name },
        update: {},
        create: {
          id: generateUuid(),
          name
        }
      });
    }
    console.log(`✓ ${educations.length} educations created`);

    // 3. Create sectors
    const sectors = [
      'Agriculture',
      'Construction',
      'Manufacturing',
      'Information Technology',
      'Healthcare',
      'Education',
      'Retail',
      'Transportation',
      'Hospitality',
      'Finance',
      'Real Estate',
      'Government',
      'Other'
    ];

    for (const name of sectors) {
      await prisma.sector.upsert({
        where: { name },
        update: {},
        create: {
          id: generateUuid(),
          name
        }
      });
    }
    console.log(`✓ ${sectors.length} sectors created`);

    // 4. Create job roles
    const jobRoles = [
      'Laborer',
      'Farmer',
      'Driver',
      'Teacher',
      'Engineer',
      'Doctor',
      'Nurse',
      'Manager',
      'Clerk',
      'Salesperson',
      'Technician',
      'Consultant',
      'Entrepreneur',
      'Government Employee',
      'Other'
    ];

    for (const name of jobRoles) {
      await prisma.jobRole.upsert({
        where: { name },
        update: {},
        create: {
          id: generateUuid(),
          name
        }
      });
    }
    console.log(`✓ ${jobRoles.length} job roles created`);

    // 5. Create document types
    const documentTypes = [
      'Aadhaar Card',
      'PAN Card',
      'Voter ID',
      'Driving License',
      'Passport',
      'Ration Card',
      'Other'
    ];

    for (const name of documentTypes) {
      await prisma.documentType.upsert({
        where: { name },
        update: {},
        create: {
          id: generateUuid(),
          name
        }
      });
    }
    console.log(`✓ ${documentTypes.length} document types created`);

    console.log('\n=============================');
    console.log('  MEMBERSHIP SEED COMPLETE!');
    console.log('  Membership Price: ₹100');
    console.log('  Reference data added');
    console.log('=============================\n');

  } catch (error) {
    console.error('Error seeding membership data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedMembershipData()
  .catch(e => {
    console.error('Seed failed:', e.message);
    process.exit(1);
  });
