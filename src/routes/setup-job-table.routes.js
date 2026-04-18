const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// Completely recreate Job table
router.post('/fix-job-table', async (req, res) => {
  try {
    console.log('Recreating Job table from scratch...');

    console.log('  Dropping existing Job table...');
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Job" CASCADE`);
    
    console.log('  Creating fresh Job table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Job" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "businessId" TEXT,
        "postedById" TEXT,
        "postedByRole" TEXT,
        "jobRole" TEXT,
        "jobDescription" TEXT,
        "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "jobType" TEXT,
        "payStructure" TEXT,
        "offeredAmount" DOUBLE PRECISION,
        "openings" INTEGER DEFAULT 1,
        "shift" TEXT,
        "urgentHiring" BOOLEAN DEFAULT false,
        "education" TEXT,
        "experience" INTEGER DEFAULT 0,
        "gender" TEXT,
        "minAge" INTEGER,
        "maxAge" INTEGER,
        "country" TEXT,
        "state" TEXT,
        "district" TEXT,
        "pincode" TEXT,
        "fullAddress" TEXT,
        "weekOffDays" TEXT,
        "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "joiningFees" BOOLEAN DEFAULT false,
        "contactName" TEXT,
        "contactNumber" TEXT,
        "status" TEXT DEFAULT 'ACTIVE',
        "paymentId" TEXT,
        "postingFee" DOUBLE PRECISION DEFAULT 0,
        "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
      )
    `);

    console.log('  Creating indexes...');
    const indexes = [
      `CREATE INDEX "Job_businessId_idx" ON "Job"("businessId")`,
      `CREATE INDEX "Job_postedById_idx" ON "Job"("postedById")`,
      `CREATE INDEX "Job_state_idx" ON "Job"("state")`,
      `CREATE INDEX "Job_district_idx" ON "Job"("district")`,
      `CREATE INDEX "Job_status_idx" ON "Job"("status")`,
      `CREATE INDEX "Job_jobType_idx" ON "Job"("jobType")`,
      `CREATE INDEX "Job_jobRole_idx" ON "Job"("jobRole")`,
    ];

    for (const idx of indexes) {
      try {
        await prisma.$executeRawUnsafe(idx);
      } catch (e) {
        // Index already exists
      }
    }

    console.log('  Adding foreign keys...');
    
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Job" ADD CONSTRAINT "Job_postedById_fkey" 
        FOREIGN KEY ("postedById") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('  postedById FK added');
    } catch (e) {
      console.log('  postedById FK error:', e.message);
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Job" ADD CONSTRAINT "Job_businessId_fkey" 
        FOREIGN KEY ("businessId") REFERENCES "Business"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('  businessId FK added');
    } catch (e) {
      console.log('  businessId FK error:', e.message);
    }

    console.log('Job table recreated successfully!');

    res.json({
      success: true,
      message: 'Job table recreated from scratch with correct schema',
      details: 'Table dropped and recreated with proper TEXT[] array columns'
    });
  } catch (error) {
    console.error('Error recreating Job table:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recreate Job table',
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
