/**
 * Super Admin Setup Script
 * - Creates super admin user with mobile 9099005251 and password Test@123
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('\n--- Super Admin Setup Script ---\n');

  // 1. Ensure tenant exists
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { 
        id: 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), 
        name: 'Online Saathi', 
        domain: 'localhost' 
      }
    });
    console.log('✅ Created tenant:', tenant.name);
  } else {
    console.log('✅ Using existing tenant:', tenant.name);
  }

  // 2. Ensure SUPER_ADMIN role exists
  let role = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  if (!role) {
    role = await prisma.role.create({ 
      data: { 
        id: 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), 
        name: 'SUPER_ADMIN' 
      } 
    });
    console.log('✅ Created SUPER_ADMIN role');
  } else {
    console.log('✅ Using existing SUPER_ADMIN role');
  }

  // 3. Hash password
  const hashedPassword = await bcrypt.hash('Test@123', 10);
  console.log('✅ Password hashed successfully');

  // 4. Find or create user
  let user = await prisma.user.findUnique({ where: { mobile: '9099005251' } });

  if (user) {
    // Update existing user
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        identity: 'SUPER_ADMIN',
        fullName: user.fullName || 'Super Admin',
        gender: user.gender || 'MALE',
        dateOfBirth: user.dateOfBirth || new Date('1990-01-01'),
      }
    });
    console.log('✅ Updated existing user:', user.fullName);
  } else {
    // Create new super admin user
    user = await prisma.user.create({
      data: {
        id: 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        mobile: '9099005251',
        password: hashedPassword,
        fullName: 'Super Admin',
        gender: 'MALE',
        dateOfBirth: new Date('1990-01-01'),
        identity: 'SUPER_ADMIN',
        tenantId: tenant.id,
        referralCode: 'ADMIN' + Date.now().toString().slice(-6)
      }
    });
    console.log('✅ Created new super admin user:', user.fullName);
  }

  // 5. Assign SUPER_ADMIN role (if not already)
  const existingRole = await prisma.userRole.findFirst({
    where: { userId: user.id, roleId: role.id }
  });
  
  if (!existingRole) {
    await prisma.userRole.create({
      data: { 
        id: 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8), 
        userId: user.id, 
        roleId: role.id 
      }
    });
    console.log('✅ Assigned SUPER_ADMIN role');
  } else {
    console.log('✅ SUPER_ADMIN role already assigned');
  }

  console.log('\n=============================');
  console.log('  SUPER ADMIN LOGIN READY!');
  console.log('  Mobile  : 9099005251');
  console.log('  Password: Test@123');
  console.log('  Role    : SUPER_ADMIN');
  console.log('=============================\n');
}

main()
  .catch(e => {
    console.error("Super admin setup failed with error:", e.message);
    console.error("Stack trace:", e.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });