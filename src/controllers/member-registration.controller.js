const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Member Registration Controller
 * Handles member registration by users (with payment) and admin (without payment)
 */

const memberRegistrationController = {
  /**
   * User Self-Registration: Register as member with payment
   */
  registerAsMember: async (req, res) => {
    try {
      const { user_id: userId, tenant_id: tenantId } = req.user;
      
      const {
        firstName,
        lastName,
        birthDate,
        email,
        profilePhoto,
        imageName,
        genderId,
        maritalStatus,
        citizen,
        education,
        occupation,
        sector,
        jobRoles,
        isMigrantWorker,
        incomeAboveThreshold,
        parentId,
        addresses,
        documents,
        razorPayReferenceNo,
        paymentMode
      } = req.body;

      // Check if user is already a member
      const existingMember = await prisma.member.findUnique({
        where: { userId }
      });

      if (existingMember) {
        return res.status(409).json({
          success: false,
          message: 'You are already registered as a member'
        });
      }

      // Get member registration fee from pricing settings
      const pricing = await prisma.pricingSetting.findUnique({
        where: {
          tenantId_key: {
            tenantId,
            key: 'MEMBER_REGISTRATION_FEE'
          }
        }
      });

      const platformFees = pricing?.amount || 0;
      const gst = platformFees * 0.18; // 18% GST
      const serviceCharge = 0;
      const totalAmount = platformFees + gst + serviceCharge;

      // Check if user has sufficient wallet balance
      const wallet = await prisma.wallet.findUnique({
        where: { userId }
      });

      if (!wallet || wallet.balance < totalAmount) {
        return res.status(402).json({
          success: false,
          message: 'Insufficient wallet balance. Please add funds.',
          data: {
            requiredAmount: totalAmount,
            currentBalance: wallet?.balance || 0,
            platformFees,
            gst,
            serviceCharge
          }
        });
      }

      // Deduct from wallet
      await prisma.wallet.update({
        where: { userId },
        data: {
          balance: {
            decrement: totalAmount
          }
        }
      });

      // Create wallet transaction
      await prisma.walletTransaction.create({
        data: {
          userId,
          amount: totalAmount,
          type: 'DEBIT',
          meta: {
            description: 'Member registration fee',
            firstName,
            lastName
          }
        }
      });

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          userId,
          type: 'MEMBER_REGISTRATION',
          amount: totalAmount,
          currency: 'INR',
          gateway: 'WALLET',
          gatewayPaymentId: razorPayReferenceNo,
          status: 'COMPLETED'
        }
      });

      // Calculate expiry date (1 year from now)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      // Create member
      const member = await prisma.member.create({
        data: {
          userId,
          firstName,
          lastName,
          birthDate: birthDate ? new Date(birthDate) : null,
          email,
          profilePhoto,
          imageName,
          genderId,
          maritalStatus,
          citizen,
          education,
          occupation,
          sector,
          jobRoles: jobRoles || [],
          isMigrantWorker: isMigrantWorker === true || isMigrantWorker === 'true',
          incomeAboveThreshold: incomeAboveThreshold === true || incomeAboveThreshold === 'true',
          parentId,
          addresses,
          documents,
          status: 'ACTIVE',
          planName: 'PREMIUM',
          startedAt: new Date(),
          expiresAt,
          paymentId: payment.id,
          amount: platformFees,
          platformFees,
          gst,
          serviceCharge,
          totalAmount,
          razorPayReferenceNo,
          paymentMode,
          tnxStatus: 'COMPLETED',
          isAdminCreated: false
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Member registration successful',
        data: {
          member,
          payment: {
            platformFees,
            gst,
            serviceCharge,
            totalAmount
          }
        }
      });

    } catch (error) {
      console.error('Register as member error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to register as member',
        error: error.message
      });
    }
  },

  /**
   * Admin: Create member without payment
   */
  adminCreateMember: async (req, res) => {
    try {
      const { user_id: adminId, tenant_id: tenantId } = req.user;
      const { userId } = req.body;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if already a member
      const existingMember = await prisma.member.findUnique({
        where: { userId }
      });

      if (existingMember) {
        return res.status(409).json({
          success: false,
          message: 'User is already a member'
        });
      }

      const {
        firstName,
        lastName,
        birthDate,
        email,
        profilePhoto,
        imageName,
        genderId,
        maritalStatus,
        citizen,
        education,
        occupation,
        sector,
        jobRoles,
        isMigrantWorker,
        incomeAboveThreshold,
        parentId,
        addresses,
        documents
      } = req.body;

      // Calculate expiry date (1 year from now)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      // Create member without payment
      const member = await prisma.member.create({
        data: {
          userId,
          firstName,
          lastName,
          birthDate: birthDate ? new Date(birthDate) : null,
          email,
          profilePhoto,
          imageName,
          genderId,
          maritalStatus,
          citizen,
          education,
          occupation,
          sector,
          jobRoles: jobRoles || [],
          isMigrantWorker: isMigrantWorker === true || isMigrantWorker === 'true',
          incomeAboveThreshold: incomeAboveThreshold === true || incomeAboveThreshold === 'true',
          parentId,
          addresses,
          documents,
          status: 'ACTIVE',
          planName: 'PREMIUM',
          startedAt: new Date(),
          expiresAt,
          amount: 0,
          platformFees: 0,
          gst: 0,
          serviceCharge: 0,
          totalAmount: 0,
          tnxStatus: 'COMPLETED',
          createdBy: adminId,
          isAdminCreated: true
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Member created successfully by admin',
        data: { member }
      });

    } catch (error) {
      console.error('Admin create member error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create member',
        error: error.message
      });
    }
  },

  /**
   * Get my member profile
   */
  getMyMemberProfile: async (req, res) => {
    try {
      const { user_id: userId } = req.user;

      const member = await prisma.member.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              mobile: true,
              fullName: true,
              identity: true
            }
          }
        }
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member profile not found'
        });
      }

      return res.json({
        success: true,
        data: { member }
      });

    } catch (error) {
      console.error('Get member profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch member profile',
        error: error.message
      });
    }
  },

  /**
   * Update my member profile
   */
  updateMyMemberProfile: async (req, res) => {
    try {
      const { user_id: userId } = req.user;

      const member = await prisma.member.findUnique({
        where: { userId }
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member profile not found'
        });
      }

      const updateData = { ...req.body };
      
      // Parse dates
      if (updateData.birthDate) {
        updateData.birthDate = new Date(updateData.birthDate);
      }

      // Parse booleans
      if (updateData.isMigrantWorker !== undefined) {
        updateData.isMigrantWorker = updateData.isMigrantWorker === true || updateData.isMigrantWorker === 'true';
      }
      if (updateData.incomeAboveThreshold !== undefined) {
        updateData.incomeAboveThreshold = updateData.incomeAboveThreshold === true || updateData.incomeAboveThreshold === 'true';
      }

      const updatedMember = await prisma.member.update({
        where: { userId },
        data: updateData
      });

      return res.json({
        success: true,
        message: 'Member profile updated successfully',
        data: { member: updatedMember }
      });

    } catch (error) {
      console.error('Update member profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update member profile',
        error: error.message
      });
    }
  },

  // ==================== ADMIN APIs ====================

  /**
   * Admin: Get all members
   */
  adminGetAllMembers: async (req, res) => {
    try {
      const { status, isAdminCreated, page = 1, limit = 20 } = req.query;

      const where = {};
      if (status) where.status = status;
      if (isAdminCreated !== undefined) where.isAdminCreated = isAdminCreated === 'true';

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [members, total] = await Promise.all([
        prisma.member.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
          include: {
            user: {
              select: {
                id: true,
                mobile: true,
                fullName: true,
                identity: true
              }
            }
          }
        }),
        prisma.member.count({ where })
      ]);

      return res.json({
        success: true,
        data: {
          members,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Admin get all members error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch members',
        error: error.message
      });
    }
  },

  /**
   * Admin: Get member by ID
   */
  adminGetMemberById: async (req, res) => {
    try {
      const { id } = req.params;

      const member = await prisma.member.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              mobile: true,
              fullName: true,
              identity: true,
              email: true
            }
          }
        }
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }

      return res.json({
        success: true,
        data: { member }
      });

    } catch (error) {
      console.error('Admin get member error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch member',
        error: error.message
      });
    }
  },

  /**
   * Admin: Update member
   */
  adminUpdateMember: async (req, res) => {
    try {
      const { id } = req.params;

      const member = await prisma.member.findUnique({
        where: { id }
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }

      const updateData = { ...req.body };
      
      // Parse dates
      if (updateData.birthDate) {
        updateData.birthDate = new Date(updateData.birthDate);
      }

      // Parse booleans
      if (updateData.isMigrantWorker !== undefined) {
        updateData.isMigrantWorker = updateData.isMigrantWorker === true || updateData.isMigrantWorker === 'true';
      }
      if (updateData.incomeAboveThreshold !== undefined) {
        updateData.incomeAboveThreshold = updateData.incomeAboveThreshold === true || updateData.incomeAboveThreshold === 'true';
      }
      if (updateData.autoRenew !== undefined) {
        updateData.autoRenew = updateData.autoRenew === true || updateData.autoRenew === 'true';
      }

      const updatedMember = await prisma.member.update({
        where: { id },
        data: updateData
      });

      return res.json({
        success: true,
        message: 'Member updated successfully',
        data: { member: updatedMember }
      });

    } catch (error) {
      console.error('Admin update member error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update member',
        error: error.message
      });
    }
  },

  /**
   * Admin: Set member registration fee
   */
  adminSetMemberFee: async (req, res) => {
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
            key: 'MEMBER_REGISTRATION_FEE'
          }
        },
        update: {
          amount: parseFloat(amount),
          isActive: true
        },
        create: {
          tenantId,
          key: 'MEMBER_REGISTRATION_FEE',
          amount: parseFloat(amount),
          currency: 'INR',
          isActive: true
        }
      });

      return res.json({
        success: true,
        message: 'Member registration fee updated successfully',
        data: { pricing }
      });

    } catch (error) {
      console.error('Set member fee error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to set member fee',
        error: error.message
      });
    }
  },

  /**
   * Admin: Get member registration fee
   */
  adminGetMemberFee: async (req, res) => {
    try {
      const { tenant_id: tenantId } = req.user;

      const pricing = await prisma.pricingSetting.findUnique({
        where: {
          tenantId_key: {
            tenantId,
            key: 'MEMBER_REGISTRATION_FEE'
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
      console.error('Get member fee error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get member fee',
        error: error.message
      });
    }
  }
};

module.exports = memberRegistrationController;
