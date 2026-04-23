/**
 * Quick Admin Seed Script
 * Run: node scripts/seed-admin.js
 * 
 * Creates admin user if not exists, or updates existing user to admin
 * Login: 7041797207 / Admin@123
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

const ADMIN_MOBILE = '7041797207';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME = 'Hemraj Admin';

function makeId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

async function main() {
  console.log('\n--- Admin Seed Script ---\n');

  // 1. Ensure tenant exists
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { id: makeId(), name: 'Online Saathi', domain: 'localhost' }
    });
    console.log('Created tenant:', tenant.name);
  }
  console.log('Tenant:', tenant.name, '(' + tenant.id + ')');

  // 2. Ensure superAdmin role exists
  let role = await prisma.role.findUnique({ where: { name: 'superAdmin' } });
  if (!role) {
    role = await prisma.role.create({ data: { id: makeId(), name: 'superAdmin' } });
    console.log('Created superAdmin role');
  }

  // 3. Hash password (same bcrypt as auth.controller.js)
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // 4. Find or create user
  let user = await prisma.user.findUnique({ where: { mobile: ADMIN_MOBILE } });

  if (user) {
    // Update existing user
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        identity: 'superAdmin'
      }
    });
    console.log('Updated existing user:', user.fullName);
  } else {
    // Create new admin user
    user = await prisma.user.create({
      data: {
        id: makeId(),
        mobile: ADMIN_MOBILE,
        password: hashedPassword,
        fullName: ADMIN_NAME,
        gender: 'Male',
        dateOfBirth: new Date('1995-01-01'),
        identity: 'superAdmin',
        tenantId: tenant.id,
        referralCode: 'ADMIN' + Date.now().toString().slice(-6)
      }
    });
    console.log('Created new admin user:', user.fullName);
  }

  // 5. Assign superAdmin role (if not already)
  const existingRole = await prisma.userRole.findFirst({
    where: { userId: user.id, roleId: role.id }
  });
  if (!existingRole) {
    await prisma.userRole.create({
      data: { id: makeId(), userId: user.id, roleId: role.id }
    });
    console.log('Assigned superAdmin role');
  }

  console.log('\n=============================');
  console.log('  ADMIN LOGIN READY!');
  console.log('  Mobile  : ' + ADMIN_MOBILE);
  console.log('  Password: ' + ADMIN_PASSWORD);
  console.log('  Role    : superAdmin');
  console.log('=============================\n');
}

main()
  .catch(e => { console.error('ERROR:', e.message); console.error(e); })
  .finally(() => prisma.$disconnect());
