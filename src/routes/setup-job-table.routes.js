const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// Completely rebuild Job table with ALL columns from schema
router.post('/fix-job-table', async (req, res) => {
  try {
    console.log('🔧 Fixing Job table - adding all missing columns...');

    // Get all existing columns
    const columnsResult = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'Job'
      ORDER BY ordinal_position
    `;
    
    const existingColumns = columnsResult.map(row => row.column_name);
    console.log(`Found ${existingColumns.length} existing columns`);

    // ALL columns from Prisma Job model
    const allJobColumns = [
      // ID and Relations
      { name: 'id', type: 'TEXT', nullable: false },
      { name: 'businessId', type: 'TEXT', nullable: true },
      { name: 'postedById', type: 'TEXT', nullable: true },
      { name: 'postedByRole', type: 'TEXT', nullable: true },
      
      // Job Details
      { name: 'jobRole', type: 'TEXT', nullable: true },
      { name: 'jobDescription', type: 'TEXT', nullable: true },
      { name: 'requiredSkills', type: 'TEXT[]', nullable: true },
      
      // Basic Job Info
      { name: 'jobType', type: 'TEXT', nullable: true },
      { name: 'payStructure', type: 'TEXT', nullable: true },
      { name: 'offeredAmount', type: 'DOUBLE PRECISION', nullable: true },
      { name: 'openings', type: 'INTEGER', nullable: true, default: '1' },
      { name: 'shift', type: 'TEXT', nullable: true },
      { name: 'urgentHiring', type: 'BOOLEAN', nullable: true, default: 'false' },
      
      // Candidate Requirements
      { name: 'education', type: 'TEXT', nullable: true },
      { name: 'experience', type: 'INTEGER', nullable: true, default: '0' },
      { name: 'gender', type: 'TEXT', nullable: true },
      { name: 'minAge', type: 'INTEGER', nullable: true },
      { name: 'maxAge', type: 'INTEGER', nullable: true },
      { name: 'country', type: 'TEXT', nullable: true },
      { name: 'state', type: 'TEXT', nullable: true },
      { name: 'district', type: 'TEXT', nullable: true },
      { name: 'pincode', type: 'TEXT', nullable: true },
      { name: 'fullAddress', type: 'TEXT', nullable: true },
      
      // Facilities & Fees
      { name: 'weekOffDays', type: 'TEXT', nullable: true },
      { name: 'facilities', type: 'TEXT[]', nullable: true },
      { name: 'joiningFees', type: 'BOOLEAN', nullable: true, default: 'false' },
      { name: 'contactName', type: 'TEXT', nullable: true },
      { name: 'contactNumber', type: 'TEXT', nullable: true },
      
      // Status
      { name: 'status', type: 'TEXT', nullable: true, default: 'ACTIVE' },
      
      // Payment tracking
      { name: 'paymentId', type: 'TEXT', nullable: true },
      { name: 'postingFee', type: 'DOUBLE PRECISION', nullable: true, default: '0' },
      
      // Timestamps
      { name: 'createdAt', type: 'TIMESTAMP(3)', nullable: true, default: 'CURRENT_TIMESTAMP' },
      { name: 'updatedAt', type: 'TIMESTAMP(3)', nullable: true, default: 'CURRENT_TIMESTAMP' },
    ];

    let addedColumns = [];

    // Add missing columns
    for (const col of allJobColumns) {
      if (!existingColumns.includes(col.name)) {
        console.log(`  Adding: ${col.name} (${col.type})`);
        
        let sql = `ALTER TABLE "Job" ADD COLUMN "${col.name}" ${col.type}`;
        
        if (col.default) {
          sql += ` DEFAULT ${col.default}`;
        }
        
        if (col.nullable) {
          sql += ` NULL`;
        }
        
        await prisma.$executeRawUnsafe(sql);
        addedColumns.push(col.name);
      }
    }

    // Handle special case for array columns (Prisma stores arrays differently)
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Job" ALTER COLUMN "requiredSkills" TYPE TEXT[] USING 
        CASE 
          WHEN requiredSkills IS NULL THEN ARRAY[]::TEXT[]
          WHEN requiredSkills = '' THEN ARRAY[]::TEXT[]
          ELSE ARRAY[requiredSkills]::TEXT[]
        END
      `);
      console.log('  ✓ Fixed requiredSkills array type');
    } catch (e) {
      console.log('  requiredSkills array already correct or error:', e.message);
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Job" ALTER COLUMN "facilities" TYPE TEXT[] USING 
        CASE 
          WHEN facilities IS NULL THEN ARRAY[]::TEXT[]
          WHEN facilities = '' THEN ARRAY[]::TEXT[]
          ELSE ARRAY[facilities]::TEXT[]
        END
      `);
      console.log('  ✓ Fixed facilities array type');
    } catch (e) {
      console.log('  facilities array already correct or error:', e.message);
    }

    // Add foreign key constraints
    try {
      const postedByConstraint = await prisma.$queryRaw`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'Job' AND constraint_name = 'Job_postedById_fkey'
      `;
      
      if (postedByConstraint.length === 0) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Job" ADD CONSTRAINT "Job_postedById_fkey" 
          FOREIGN KEY ("postedById") REFERENCES "User"("id") 
          ON DELETE CASCADE ON UPDATE CASCADE
        `);
        console.log('  ✓ Added postedById foreign key');
      }
    } catch (e) {
      console.log('  postedById FK error:', e.message);
    }

    try {
      const businessConstraint = await prisma.$queryRaw`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'Job' AND constraint_name = 'Job_businessId_fkey'
      `;
      
      if (businessConstraint.length === 0) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Job" ADD CONSTRAINT "Job_businessId_fkey" 
          FOREIGN KEY ("businessId") REFERENCES "Business"("id") 
          ON DELETE CASCADE ON UPDATE CASCADE
        `);
        console.log('  ✓ Added businessId foreign key');
      }
    } catch (e) {
      console.log('  businessId FK error:', e.message);
    }

    // Add indexes
    const indexesToAdd = [
      { name: 'Job_businessId_idx', column: 'businessId' },
      { name: 'Job_postedById_idx', column: 'postedById' },
      { name: 'Job_state_idx', column: 'state' },
      { name: 'Job_district_idx', column: 'district' },
      { name: 'Job_status_idx', column: 'status' },
      { name: 'Job_jobType_idx', column: 'jobType' },
      { name: 'Job_jobRole_idx', column: 'jobRole' },
    ];

    for (const idx of indexesToAdd) {
      try {
        await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${idx.name}" ON "Job"("${idx.column}")`);
      } catch (e) {
        // Index already exists
      }
    }

    console.log(`✅ Job table fixed! Added ${addedColumns.length} columns`);

    res.json({
      success: true,
      message: 'Job table fixed successfully',
      addedColumns: addedColumns,
      addedCount: addedColumns.length,
      totalColumns: allJobColumns.length
    });
  } catch (error) {
    console.error('Error fixing Job table:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix Job table',
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;
