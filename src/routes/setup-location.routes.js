const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// Initialize location tables and seed data
router.post('/init-locations', async (req, res) => {
  try {
    console.log('🌍 Initializing location tables and seeding data...');

    // Check if tables exist by trying to query
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Country" LIMIT 1`;
      console.log('✅ Country table exists');
    } catch (e) {
      console.log('❌ Country table does not exist. Creating tables...');
      
      // Create tables using raw SQL
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Country" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "phoneCode" TEXT NOT NULL,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "statesCount" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
        );
        
        CREATE TABLE IF NOT EXISTS "State" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "countryId" TEXT NOT NULL,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "districtsCount" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "State_pkey" PRIMARY KEY ("id")
        );
        
        CREATE TABLE IF NOT EXISTS "District" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "code" TEXT,
          "stateId" TEXT NOT NULL,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "District_pkey" PRIMARY KEY ("id")
        );
        
        CREATE UNIQUE INDEX IF NOT EXISTS "Country_name_key" ON "Country"("name");
        CREATE UNIQUE INDEX IF NOT EXISTS "Country_code_key" ON "Country"("code");
        CREATE UNIQUE INDEX IF NOT EXISTS "State_name_countryId_key" ON "State"("name", "countryId");
        CREATE INDEX IF NOT EXISTS "State_countryId_idx" ON "State"("countryId");
        CREATE UNIQUE INDEX IF NOT EXISTS "District_name_stateId_key" ON "District"("name", "stateId");
        CREATE INDEX IF NOT EXISTS "District_stateId_idx" ON "District"("stateId");
        
        ALTER TABLE "State" ADD CONSTRAINT "State_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        ALTER TABLE "District" ADD CONSTRAINT "District_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      
      console.log('✅ Tables created successfully');
    }

    // Check if data already exists
    const countryCount = await prisma.country.count();
    if (countryCount > 0) {
      return res.json({
        success: true,
        message: 'Location data already exists',
        countries: countryCount
      });
    }

    // Seed India
    console.log('Creating India...');
    const india = await prisma.country.create({
      data: {
        name: 'India',
        code: 'IN',
        phoneCode: '+91',
        isActive: true
      }
    });

    // Sample states with districts
    const statesData = [
      { name: 'Gujarat', code: 'GJ', districts: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Mehsana'] },
      { name: 'Maharashtra', code: 'MH', districts: ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Amravati', 'Kolhapur', 'Satara'] },
      { name: 'Rajasthan', code: 'RJ', districts: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bhilwara', 'Sikar', 'Pali'] },
      { name: 'Madhya Pradesh', code: 'MP', districts: ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Ratlam', 'Dewas', 'Satna', 'Rewa'] },
      { name: 'Karnataka', code: 'KA', districts: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubli', 'Belagavi', 'Kalaburagi', 'Davangere', 'Ballari', 'Vijayapura', 'Shivamogga'] },
      { name: 'Tamil Nadu', code: 'TN', districts: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Vellore', 'Erode', 'Thoothukkudi', 'Dindigul'] },
      { name: 'Delhi', code: 'DL', districts: ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi', 'North East Delhi', 'North West Delhi', 'South West Delhi', 'Shahdara'] },
      { name: 'Uttar Pradesh', code: 'UP', districts: ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Bareilly', 'Aligarh', 'Moradabad'] },
      { name: 'West Bengal', code: 'WB', districts: ['Kolkata', 'Howrah', 'Darjeeling', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Baharampur', 'Habra'] },
      { name: 'Telangana', code: 'TG', districts: ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Siddipet'] }
    ];

    let totalDistricts = 0;

    for (const stateData of statesData) {
      console.log(`  Creating state: ${stateData.name}`);
      
      const state = await prisma.state.create({
        data: {
          name: stateData.name,
          code: stateData.code,
          countryId: india.id,
          isActive: true,
          districtsCount: stateData.districts.length
        }
      });

      // Create districts
      for (const districtName of stateData.districts) {
        await prisma.district.create({
          data: {
            name: districtName,
            stateId: state.id,
            isActive: true
          }
        });
      }
      
      totalDistricts += stateData.districts.length;
    }

    // Update country states count
    await prisma.country.update({
      where: { id: india.id },
      data: { statesCount: statesData.length }
    });

    console.log(`✅ Seeded: 1 country, ${statesData.length} states, ${totalDistricts} districts`);

    res.status(201).json({
      success: true,
      message: 'Location data seeded successfully',
      data: {
        countries: 1,
        states: statesData.length,
        districts: totalDistricts
      }
    });
  } catch (error) {
    console.error('Error initializing locations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize locations',
      error: error.message
    });
  }
});

module.exports = router;
