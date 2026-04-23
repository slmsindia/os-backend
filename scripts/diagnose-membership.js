const { verifyToken } = require('./src/utils/jwt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Replace this with your actual token
const TOKEN = 'YOUR_TOKEN_HERE';

async function diagnose() {
  console.log('=== DIAGNOSTIC CHECK ===\n');

  // 1. Verify token
  console.log('1. Checking token...');
  const decoded = verifyToken(TOKEN);
  
  if (!decoded) {
    console.log('❌ Token is invalid or expired');
    console.log('\nPlease login again to get a fresh token.');
    await prisma.$disconnect();
    return;
  }

  console.log('✓ Token is valid');
  console.log('  User ID:', decoded.user_id);
  console.log('  Role:', decoded.role);
  console.log('');

  // 2. Check if user exists in database
  console.log('2. Checking user in database...');
  const user = await prisma.user.findUnique({
    where: { id: decoded.user_id },
    include: {
      tenant: true,
      roles: {
        include: {
          role: true
        }
      }
    }
  });

  if (!user) {
    console.log('❌ User not found in database!');
    console.log('  This is causing the foreign key error (P2003)');
    console.log('\nPlease create a user or use a different token.');
    await prisma.$disconnect();
    return;
  }

  console.log('✓ User exists in database');
  console.log('  Mobile:', user.mobile);
  console.log('  Full Name:', user.fullName);
  console.log('  Identity:', user.identity);
  console.log('  Tenant:', user.tenant?.name);
  console.log('');

  // 3. Check membership reference data
  console.log('3. Checking membership reference data...');
  const [educations, sectors, jobRoles, documentTypes, membershipConfig] = await Promise.all([
    prisma.education.count(),
    prisma.sector.count(),
    prisma.jobRole.count(),
    prisma.documentType.count(),
    prisma.membershipConfig.findFirst({ where: { isActive: true } })
  ]);

  console.log(`✓ Educations: ${educations}`);
  console.log(`✓ Sectors: ${sectors}`);
  console.log(`✓ Job Roles: ${jobRoles}`);
  console.log(`✓ Document Types: ${documentTypes}`);
  console.log(`✓ Membership Config: ${membershipConfig ? `₹${membershipConfig.membershipPrice}` : 'NOT FOUND'}`);
  console.log('');

  console.log('=== DIAGNOSIS COMPLETE ===');
  console.log('\n✅ Everything looks good! You should be able to create a membership application.');
  console.log('\nIf you still get errors, please check:');
  console.log('  - The reference IDs (educationId, sectorId, etc.) are correct');
  console.log('  - Run: node scripts/get-reference-ids.js to get valid IDs');

  await prisma.$disconnect();
}

diagnose().catch(err => {
  console.error('Diagnostic error:', err);
  prisma.$disconnect();
});
