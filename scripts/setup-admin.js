/**
 * Admin Setup Script
 * - Lists all users in DB
 * - Sets mobile 7041797207 as superAdmin with password Admin@123
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  // 1. List all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      mobile: true,
      fullName: true,
      identity: true,
      createdAt: true,
      roles: {
        select: {
          role: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n Total Users: ${users.length}`);
  console.log('='.repeat(70));
  users.forEach((u, i) => {
    const roles = u.roles.map(r => r.role.name).join(', ') || 'no role';
    console.log(`${i + 1}. ${u.fullName} | mobile: ${u.mobile} | identity: ${u.identity} | roles: [${roles}]`);
  });
  console.log('='.repeat(70));

  // 2. Find user with mobile 7041797207
  const targetMobile = '7041797207';
  const target = users.find(u => u.mobile === targetMobile);
  if (!target) {
    console.log(`\n User with mobile ${targetMobile} NOT found in DB.`);
    console.log('Available mobiles:', users.map(u => u.mobile).join(', '));
    return;
  }

  console.log(`\n Found: ${target.fullName} (${target.id})`);

  // 3. Hash new password using bcrypt (same lib as auth.controller.js)
  const hashed = await bcrypt.hash('Admin@123', 10);

  // 4. Update password and identity to superAdmin
  await prisma.user.update({
    where: { id: target.id },
    data: {
      password: hashed,
      identity: 'superAdmin'
    }
  });
  console.log(' Password updated to Admin@123');
  console.log(' Identity set to superAdmin');

  // 5. Ensure superAdmin role exists and assign it
  let role = await prisma.role.findUnique({ where: { name: 'superAdmin' } });
  if (!role) {
    const { generateUuid } = require('../src/utils/id');
    role = await prisma.role.create({ data: { id: generateUuid(), name: 'superAdmin' } });
    console.log(' Created superAdmin role');
  }

  // Upsert UserRole (avoid duplicate)
  const existingUserRole = await prisma.userRole.findFirst({
    where: { userId: target.id, roleId: role.id }
  });

  if (!existingUserRole) {
    const { generateUuid } = require('../src/utils/id');
    await prisma.userRole.create({
      data: {
        id: generateUuid(),
        userId: target.id,
        roleId: role.id
      }
    });
    console.log(' Assigned superAdmin role to user');
  } else {
    console.log(' superAdmin role already assigned');
  }

  console.log('\n DONE!');
  console.log('   Mobile   : 7041897207');
  console.log('   Password : Hemraj@2002');
  console.log('   Role     : superAdmin');
}

main()
  .catch(e => console.error('Error:', e.message))
  .finally(() => prisma.$disconnect());
