const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Job Posting Controller
 * Handles job posting by Admin and Business Partners
 * Business Partners need to pay per job posting
 */

const jobPostingController = {
  /**
   * Create a new job posting
   * - Admin: Can post unlimited jobs without payment
   * - Business Partner: Needs to pay per job (checks credits)
   */
  createJob: async (req, res) => {
    try {
      const { user_id: userId, tenant_id: tenantId, identity } = req.user;
      
      // Check if user is Admin or Business Partner
      const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(identity);
      const isBusinessPartner = identity === 'BUSINESS_PARTNER';
      
      if (!isAdmin && !isBusinessPartner) {
        return res.status(403).json({
          success: false,
          message: 'Only Admin or Business Partner can post jobs'
        });
      }

      const {
        // JOB DETAILS
        jobRole,
        jobDescription,
        requiredSkills,
        
        // BASIC JOB INFO
        jobType,
        payStructure,
        offeredAmount,
        openings,
        shift,
        urgentHiring,
        
        // CANDIDATE REQUIREMENTS
        education,
        experience,
        gender,
        minAge,
        maxAge,
        country,
        state,
        district,
        pincode,
        fullAddress,
        
        // FACILITIES & FEES
        weekOffDays,
        facilities,
        joiningFees,
        contactName,
        contactNumber
      } = req.body;

      // Validation
      if (!jobRole || !jobDescription || !jobType || !payStructure || !offeredAmount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: jobRole, jobDescription, jobType, payStructure, offeredAmount'
        });
      }

      if (!country || !state || !district || !pincode || !fullAddress) {
        return res.status(400).json({
          success: false,
          message: 'Missing required address fields'
        });
      }

      if (!contactName || !contactNumber) {
        return res.status(400).json({
          success: false,
          message: 'Contact name and number are required'
        });
      }

      let businessId = null;
      let postingFee = 0;
      let paymentId = null;

      // For Business Partner - check credits and handle payment
      if (isBusinessPartner) {
        // Get user's business profile
        const business = await prisma.business.findUnique({
          where: { userId }
        });

        if (!business) {
          return res.status(400).json({
            success: false,
            message: 'Business profile not found. Please complete business registration first.'
          });
        }

        businessId = business.id;

        // Check job posting credits
        let jobCredits = await prisma.businessJobCredit.findUnique({
          where: { userId }
        });

        // Get job posting fee from pricing settings
        const pricingSetting = await prisma.pricingSetting.findUnique({
          where: {
            tenantId_key: {
              tenantId,
              key: 'JOB_POST_FEE'
            }
          }
        });

        postingFee = pricingSetting?.amount || 0;

        // If no credits or insufficient credits
        if (!jobCredits || jobCredits.remainingCredits <= 0) {
          // Check if user has enough wallet balance
          const wallet = await prisma.wallet.findUnique({
            where: { userId }
          });

          if (!wallet || wallet.balance < postingFee) {
            return res.status(402).json({
              success: false,
              message: 'Insufficient job posting credits. Please purchase a job posting package.',
              data: {
                requiredFee: postingFee,
                currentBalance: wallet?.balance || 0
              }
            });
          }

          // Deduct fee from wallet
          await prisma.wallet.update({
            where: { userId },
            data: {
              balance: {
                decrement: postingFee
              }
            }
          });

          // Create wallet transaction
          await prisma.walletTransaction.create({
            data: {
              userId,
              amount: postingFee,
              type: 'DEBIT',
              meta: {
                description: 'Job posting fee',
                jobRole,
                jobType
              }
            }
          });

          // Create payment record
          const payment = await prisma.payment.create({
            data: {
              userId,
              type: 'JOB_POST_FEE',
              amount: postingFee,
              currency: 'INR',
              gateway: 'WALLET',
              status: 'COMPLETED'
            }
          });

          paymentId = payment.id;

          // Update or create job credits
          if (jobCredits) {
            await prisma.businessJobCredit.update({
              where: { userId },
              data: {
                totalCredits: { increment: 1 },
                remainingCredits: { increment: 1 },
                planAmount: { increment: postingFee }
              }
            });
          } else {
            await prisma.businessJobCredit.create({
              data: {
                userId,
                totalCredits: 1,
                usedCredits: 0,
                remainingCredits: 1,
                planAmount: postingFee,
                isActive: true
              }
            });
          }

          // Refresh job credits
          jobCredits = await prisma.businessJobCredit.findUnique({
            where: { userId }
          });
        }

        // Use one credit
        await prisma.businessJobCredit.update({
          where: { userId },
          data: {
            usedCredits: { increment: 1 },
            remainingCredits: { decrement: 1 }
          }
        });
      }

      // Create the job
      const job = await prisma.job.create({
        data: {
          businessId,
          postedById: userId,
          postedByRole: isAdmin ? 'ADMIN' : 'BUSINESS_PARTNER',
          
          // JOB DETAILS
          jobRole,
          jobDescription,
          requiredSkills: requiredSkills || [],
          
          // BASIC JOB INFO
          jobType,
          payStructure,
          offeredAmount: parseFloat(offeredAmount),
          openings: parseInt(openings) || 1,
          shift,
          urgentHiring: urgentHiring === true || urgentHiring === 'true',
          
          // CANDIDATE REQUIREMENTS
          education,
          experience: parseInt(experience) || 0,
          gender,
          minAge: minAge ? parseInt(minAge) : null,
          maxAge: maxAge ? parseInt(maxAge) : null,
          country,
          state,
          district,
          pincode,
          fullAddress,
          
          // FACILITIES & FEES
          weekOffDays,
          facilities: facilities || [],
          joiningFees: joiningFees === true || joiningFees === 'true',
          contactName,
          contactNumber,
          
          // Payment tracking
          postingFee,
          paymentId,
          status: 'ACTIVE'
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Job posted successfully',
        data: {
          job,
          creditsUsed: isBusinessPartner ? 1 : 0,
          feeCharged: isBusinessPartner ? postingFee : 0
        }
      });

    } catch (error) {
      console.error('Create job error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create job posting',
        error: error.message
      });
    }
  },

  /**
   * Get jobs posted by the current user (Admin or Business Partner)
   */
  getMyPostedJobs: async (req, res) => {
    try {
      const { user_id: userId } = req.user;
      const { status, page = 1, limit = 10 } = req.query;

      const where = { postedById: userId };
      if (status) where.status = status;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
          include: {
            applications: {
              select: {
                id: true,
                status: true
              }
            }
          }
        }),
        prisma.job.count({ where })
      ]);

      // Add application counts
      const jobsWithCounts = jobs.map(job => ({
        ...job,
        totalApplications: job.applications.length,
        pendingApplications: job.applications.filter(a => a.status === 'PENDING').length
      }));

      return res.json({
        success: true,
        data: {
          jobs: jobsWithCounts,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get my posted jobs error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch posted jobs',
        error: error.message
      });
    }
  },

  /**
   * Get job posting credits for Business Partner
   */
  getJobCredits: async (req, res) => {
    try {
      const { user_id: userId } = req.user;

      // Check if user has a business profile
      const business = await prisma.business.findUnique({
        where: { userId }
      });

      if (!business) {
        return res.status(403).json({
          success: false,
          message: 'Only Business Partners have job credits'
        });
      }

      const credits = await prisma.businessJobCredit.findUnique({
        where: { userId }
      });

      // Get job posting fee
      const pricingSetting = await prisma.pricingSetting.findFirst({
        where: {
          key: 'JOB_POST_FEE',
          isActive: true
        }
      });

      return res.json({
        success: true,
        data: {
          credits: credits || {
            totalCredits: 0,
            usedCredits: 0,
            remainingCredits: 0
          },
          feePerJob: pricingSetting?.amount || 0
        }
      });

    } catch (error) {
      console.error('Get job credits error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch job credits',
        error: error.message
      });
    }
  },

  /**
   * Get all active facilities (for job posting form)
   */
  getFacilities: async (req, res) => {
    try {
      const { tenant_id: tenantId } = req.user;

      const facilities = await prisma.facility.findMany({
        where: {
          isActive: true,
          OR: [
            { tenantId: null },
            { tenantId }
          ]
        },
        orderBy: { name: 'asc' }
      });

      return res.json({
        success: true,
        data: { facilities }
      });

    } catch (error) {
      console.error('Get facilities error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch facilities',
        error: error.message
      });
    }
  },

  /**
   * Get a single job by ID
   */
  getJobById: async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id: userId, identity } = req.user;

      const job = await prisma.job.findUnique({
        where: { id },
        include: {
          applications: {
            select: {
              id: true,
              status: true,
              appliedAt: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  mobile: true
                }
              }
            }
          }
        }
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Check if user can view this job
      const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(identity);
      const isOwner = job.postedById === userId;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this job'
        });
      }

      return res.json({
        success: true,
        data: { job }
      });

    } catch (error) {
      console.error('Get job by ID error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch job',
        error: error.message
      });
    }
  },

  /**
   * Update a job posting
   */
  updateJob: async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id: userId, identity } = req.user;

      const job = await prisma.job.findUnique({
        where: { id }
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Check permission
      const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(identity);
      const isOwner = job.postedById === userId;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this job'
        });
      }

      const updateData = { ...req.body };
      
      // Parse numeric fields
      if (updateData.offeredAmount) updateData.offeredAmount = parseFloat(updateData.offeredAmount);
      if (updateData.openings) updateData.openings = parseInt(updateData.openings);
      if (updateData.experience) updateData.experience = parseInt(updateData.experience);
      if (updateData.minAge) updateData.minAge = parseInt(updateData.minAge);
      if (updateData.maxAge) updateData.maxAge = parseInt(updateData.maxAge);

      // Parse boolean fields
      if (updateData.urgentHiring !== undefined) {
        updateData.urgentHiring = updateData.urgentHiring === true || updateData.urgentHiring === 'true';
      }
      if (updateData.joiningFees !== undefined) {
        updateData.joiningFees = updateData.joiningFees === true || updateData.joiningFees === 'true';
      }

      const updatedJob = await prisma.job.update({
        where: { id },
        data: updateData
      });

      return res.json({
        success: true,
        message: 'Job updated successfully',
        data: { job: updatedJob }
      });

    } catch (error) {
      console.error('Update job error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update job',
        error: error.message
      });
    }
  },

  /**
   * Close/Delete a job posting
   */
  closeJob: async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id: userId, identity } = req.user;

      const job = await prisma.job.findUnique({
        where: { id }
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      // Check permission
      const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(identity);
      const isOwner = job.postedById === userId;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to close this job'
        });
      }

      await prisma.job.update({
        where: { id },
        data: { status: 'CLOSED' }
      });

      return res.json({
        success: true,
        message: 'Job closed successfully'
      });

    } catch (error) {
      console.error('Close job error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to close job',
        error: error.message
      });
    }
  },

  // ==================== ADMIN APIs ====================

  /**
   * Admin: Create a new facility
   */
  adminCreateFacility: async (req, res) => {
    try {
      const { user_id: userId, tenant_id: tenantId } = req.user;
      const { name, description, icon } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Facility name is required'
        });
      }

      // Check if facility already exists
      const existing = await prisma.facility.findUnique({
        where: { name }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Facility with this name already exists'
        });
      }

      const facility = await prisma.facility.create({
        data: {
          name,
          description,
          icon,
          tenantId,
          createdBy: userId,
          isActive: true
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Facility created successfully',
        data: { facility }
      });

    } catch (error) {
      console.error('Create facility error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create facility',
        error: error.message
      });
    }
  },

  /**
   * Admin: Update a facility
   */
  adminUpdateFacility: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, icon, isActive } = req.body;

      const facility = await prisma.facility.update({
        where: { id },
        data: {
          name,
          description,
          icon,
          isActive
        }
      });

      return res.json({
        success: true,
        message: 'Facility updated successfully',
        data: { facility }
      });

    } catch (error) {
      console.error('Update facility error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update facility',
        error: error.message
      });
    }
  },

  /**
   * Admin: Get all facilities (including inactive)
   */
  adminGetAllFacilities: async (req, res) => {
    try {
      const { tenant_id: tenantId } = req.user;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [facilities, total] = await Promise.all([
        prisma.facility.findMany({
          where: {
            OR: [
              { tenantId: null },
              { tenantId }
            ]
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit)
        }),
        prisma.facility.count({
          where: {
            OR: [
              { tenantId: null },
              { tenantId }
            ]
          }
        })
      ]);

      return res.json({
        success: true,
        data: {
          facilities,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get all facilities error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch facilities',
        error: error.message
      });
    }
  },

  /**
   * Admin: Get all jobs (with filters)
   */
  adminGetAllJobs: async (req, res) => {
    try {
      const { tenant_id: tenantId } = req.user;
      const { status, postedByRole, state, district, page = 1, limit = 20 } = req.query;

      const where = {};
      if (status) where.status = status;
      if (postedByRole) where.postedByRole = postedByRole;
      if (state) where.state = state;
      if (district) where.district = district;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
          include: {
            postedBy: {
              select: {
                id: true,
                fullName: true,
                mobile: true,
                identity: true
              }
            },
            business: {
              select: {
                companyName: true
              }
            },
            _count: {
              select: {
                applications: true
              }
            }
          }
        }),
        prisma.job.count({ where })
      ]);

      return res.json({
        success: true,
        data: {
          jobs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Admin get all jobs error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch jobs',
        error: error.message
      });
    }
  },

  /**
   * Admin: Set job posting fee
   */
  adminSetJobPostingFee: async (req, res) => {
    try {
      const { tenant_id: tenantId } = req.user;
      const { amount } = req.body;

      if (amount === undefined || amount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid amount is required'
        });
      }

      const pricing = await prisma.pricingSetting.upsert({
        where: {
          tenantId_key: {
            tenantId,
            key: 'JOB_POST_FEE'
          }
        },
        update: {
          amount: parseFloat(amount),
          isActive: true
        },
        create: {
          tenantId,
          key: 'JOB_POST_FEE',
          amount: parseFloat(amount),
          currency: 'INR',
          isActive: true
        }
      });

      return res.json({
        success: true,
        message: 'Job posting fee updated successfully',
        data: { pricing }
      });

    } catch (error) {
      console.error('Set job posting fee error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to set job posting fee',
        error: error.message
      });
    }
  },

  /**
   * Admin: Get job posting fee
   */
  adminGetJobPostingFee: async (req, res) => {
    try {
      const { tenant_id: tenantId } = req.user;

      const pricing = await prisma.pricingSetting.findUnique({
        where: {
          tenantId_key: {
            tenantId,
            key: 'JOB_POST_FEE'
          }
        }
      });

      return res.json({
        success: true,
        data: {
          fee: pricing?.amount || 0,
          currency: pricing?.currency || 'INR',
          isActive: pricing?.isActive || false
        }
      });

    } catch (error) {
      console.error('Get job posting fee error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get job posting fee',
        error: error.message
      });
    }
  }
};

module.exports = jobPostingController;
