const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { generateUuid } = require('../utils/id');
const prisma = new PrismaClient();

const router = express.Router();

// Create admin users endpoint
router.post('/create-admin', async (req, res) => {
  try {
    console.log('Creating admin users...');
    
    // Get tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      return res.status(500).json({
        success: false,
        message: 'No tenant found. Create tenant first.'
      });
    }
    console.log('Tenant found:', tenant.id);
    
    // Get or create roles
    let adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      console.log('Creating ADMIN role...');
      adminRole = await prisma.role.create({
        data: { id: generateUuid(), name: 'ADMIN' }
      });
    }
    
    let superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    if (!superAdminRole) {
      console.log('Creating SUPER_ADMIN role...');
      superAdminRole = await prisma.role.create({
        data: { id: generateUuid(), name: 'SUPER_ADMIN' }
      });
    }
    console.log('Roles ready:', { admin: adminRole.id, superAdmin: superAdminRole.id });
    
    const results = { superAdmin: null, admin: null };
    
    // Create SUPER_ADMIN if not exists
    const superAdminMobile = '9999999999';
    const existingSuperAdmin = await prisma.user.findUnique({ where: { mobile: superAdminMobile } });
    
    if (existingSuperAdmin) {
      results.superAdmin = { exists: true, mobile: superAdminMobile };
      console.log('Super Admin already exists');
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const superAdmin = await prisma.user.create({
        data: {
          id: generateUuid(),
          mobile: superAdminMobile,
          fullName: 'Super Admin',
          gender: 'MALE',
          dateOfBirth: new Date('1990-01-01'),
          password: hashedPassword,
          tenantId: tenant.id,
          identity: 'SUPER_ADMIN',
          roles: {
            create: {
              id: generateUuid(),
              roleId: superAdminRole.id
            }
          }
        }
      });
      results.superAdmin = { created: true, mobile: superAdminMobile, id: superAdmin.id };
      console.log('Super Admin created:', superAdmin.id);
    }
    
    // Create ADMIN if not exists
    const adminMobile = '8888888888';
    const existingAdmin = await prisma.user.findUnique({ where: { mobile: adminMobile } });
    
    if (existingAdmin) {
      results.admin = { exists: true, mobile: adminMobile };
      console.log('Admin already exists');
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = await prisma.user.create({
        data: {
          id: generateUuid(),
          mobile: adminMobile,
          fullName: 'Admin User',
          gender: 'MALE',
          dateOfBirth: new Date('1990-01-01'),
          password: hashedPassword,
          tenantId: tenant.id,
          identity: 'ADMIN',
          roles: {
            create: {
              id: generateUuid(),
              roleId: adminRole.id
            }
          }
        }
      });
      results.admin = { created: true, mobile: adminMobile, id: admin.id };
      console.log('Admin created:', admin.id);
    }
    
    res.status(201).json({
      success: true,
      message: 'Admin users created successfully',
      credentials: {
        superAdmin: { mobile: '9999999999', password: 'admin123' },
        admin: { mobile: '8888888888', password: 'admin123' }
      },
      results
    });
  } catch (error) {
    console.error('Error creating admins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin users',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Emergency endpoint to create default tenant
router.post('/create-default-tenant', async (req, res) => {
  try {
    console.log('Creating default tenant...');
    
    const existing = await prisma.tenant.findFirst();
    
    if (existing) {
      return res.json({
        success: true,
        message: 'Tenant already exists',
        tenant: {
          id: existing.id,
          name: existing.name,
          domain: existing.domain,
        },
      });
    }
    
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Online Saathi',
        domain: 'online-saathi-backend.onrender.com',
      },
    });
    
    console.log('Default tenant created:', tenant.id);
    
    res.status(201).json({
      success: true,
      message: 'Default tenant created successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain,
      },
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tenant',
      error: error.message,
    });
  }
});

// Check tenant status
router.get('/check-tenant', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany();
    
    res.json({
      success: true,
      count: tenants.length,
      tenants: tenants.map(t => ({
        id: t.id,
        name: t.name,
        domain: t.domain,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error checking tenants:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check tenants',
      error: error.message,
    });
  }
});

module.exports = router;
