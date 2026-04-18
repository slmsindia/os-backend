const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');
const jobPostingController = require('../controllers/job-posting.controller');

/**
 * Job Posting Routes
 * Handles job posting by Admin and Business Partners
 */

// Middleware to check if user is a business partner (has business profile)
const checkBusinessPartner = async (req, res, next) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = req.user.user_id || req.user.id;
    
    const business = await prisma.business.findUnique({
      where: { userId: userId }
    });
    
    if (!business) {
      return res.status(403).json({ message: 'forbidden' });
    }
    
    next();
  } catch (error) {
    console.error("checkBusinessPartner error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Middleware to check if user is admin OR business partner
const checkAdminOrBusinessPartner = async (req, res, next) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = req.user.user_id || req.user.id;
    const identity = req.user.identity;
    
    // Check if admin
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'];
    if (adminRoles.includes(identity)) {
      return next();
    }
    
    // Check if business partner
    const business = await prisma.business.findUnique({
      where: { userId: userId }
    });
    
    if (business) {
      return next();
    }
    
    return res.status(403).json({ message: 'forbidden' });
  } catch (error) {
    console.error("checkAdminOrBusinessPartner error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ==================== USER/BUSINESS PARTNER ROUTES ====================

// Create a new job posting (Admin or Business Partner)
router.post(
  '/jobs',
  authenticate,
  checkAdminOrBusinessPartner,
  jobPostingController.createJob
);

// Get my posted jobs
router.get(
  '/jobs/my-posted',
  authenticate,
  checkAdminOrBusinessPartner,
  jobPostingController.getMyPostedJobs
);

// Get job posting credits (Business Partner only)
router.get(
  '/jobs/credits',
  authenticate,
  checkBusinessPartner,
  jobPostingController.getJobCredits
);

// Get all active facilities
router.get(
  '/jobs/facilities',
  authenticate,
  jobPostingController.getFacilities
);

// Get a single job by ID
router.get(
  '/jobs/:id',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'BUSINESS_PARTNER']),
  jobPostingController.getJobById
);

// Update a job
router.patch(
  '/jobs/:id',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'BUSINESS_PARTNER']),
  jobPostingController.updateJob
);

// Close a job
router.patch(
  '/jobs/:id/close',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN', 'BUSINESS_PARTNER']),
  jobPostingController.closeJob
);

// ==================== ADMIN ROUTES ====================

// Create a facility (Admin only)
router.post(
  '/admin/jobs/facilities',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  jobPostingController.adminCreateFacility
);

// Update a facility (Admin only)
router.patch(
  '/admin/jobs/facilities/:id',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  jobPostingController.adminUpdateFacility
);

// Get all facilities (Admin only - includes inactive)
router.get(
  '/admin/jobs/facilities',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  jobPostingController.adminGetAllFacilities
);

// Get all jobs (Admin only)
router.get(
  '/admin/jobs',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  jobPostingController.adminGetAllJobs
);

// Set job posting fee (Admin only)
router.post(
  '/admin/jobs/posting-fee',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN']),
  jobPostingController.adminSetJobPostingFee
);

// Get job posting fee (Admin only)
router.get(
  '/admin/jobs/posting-fee',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  jobPostingController.adminGetJobPostingFee
);

module.exports = router;
