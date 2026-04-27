const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateDatabase() {
  try {
    console.log('Starting database update...');
    
    // Step 1: Add userId column to PrabhuTransaction table
    console.log('Adding userId column to PrabhuTransaction table...');
    await prisma.$executeRaw`ALTER TABLE "PrabhuTransaction" ADD COLUMN IF NOT EXISTS "userId" TEXT`;
    console.log('✅ userId column added successfully');
    
    // Step 2: Create index for userId
    console.log('Creating index for userId...');
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "PrabhuTransaction_userId_idx" ON "PrabhuTransaction"("userId")`;
    console.log('✅ Index created successfully');
    
    // Step 3: Verify the column was added
    console.log('Verifying column was added...');
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'PrabhuTransaction' AND column_name = 'userId'
    `;
    
    console.log('✅ Database update completed successfully!');
    console.log('Column info:', result);
    
  } catch (error) {
    console.error('❌ Database update failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDatabase();
