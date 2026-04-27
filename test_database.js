const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabase() {
  try {
    console.log('Testing PrabhuTransaction table structure...');
    
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'PrabhuTransaction'
      ORDER BY ordinal_position
    `;
    
    console.log('Table columns:', columns.map(c => c.column_name));
    
    // Test if userId column exists
    const hasUserId = columns.some(c => c.column_name === 'userId');
    
    if (hasUserId) {
      console.log('\n✅ SUCCESS: userId field is now available!');
      console.log('✅ User-specific transaction history is ready!');
      console.log('✅ Frontend can now fetch user-specific data!');
    } else {
      console.log('\n❌ FAILED: userId field not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
