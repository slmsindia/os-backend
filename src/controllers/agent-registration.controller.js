const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Agent/Saathi Registration Controller
 * Handles agent registration:
 * 1. User self-registration (with payment)
 * 2. Admin creates agent (without payment)
 * 3. Member upgrades to agent (with payment)
 */

const agentRegistrationController = {
  /**
   * User Self-Registration: Register as agent with payment
   */
  registerAsAgent: async (req, res) => {
    try {
      const { user_id: userId, tenant_id: tenantId } = req.user;
      
      const {
        // Aadhaar
        aadharNumber,
        maskAadharNumber,
        aadhaarFatherName,
        aadhaarName,
        aadhaarAddress,
        aadhaarDOB,
        
        // PAN
        panCardNo,
        isAadharSeeding,
        panFirstName,
        panMiddleName,
        panLastName,
        
        // Skills
        computerLiteracy,
        isPC,
        internetSearchAndAccessLiteracy,
        isEKYCDevice,
        
        // Shop
        shopName,
        shopType,
        licenceNo,
        shopAddress,
        shopDistrictId,
        shopMunicipalityId,
        shopStateId,
        shopPinCode,
        shopCountry,
        
        // Other
        documents,
        sections,
        parentUserId,
        addresses,
        schemeFees,
        razorPayReferenceNo,
        paymentMode
      } = req.body;

      // Check if user is already an agent
      const existingAgent = await prisma.agent.findUnique({
        where: { userId }
      });

      if (existingAgent) {
        return res.status(409).json({
          success: false,
          message: 'You are already registered as an agent'
        });
      }

      // Get agent registration fee
      const pricing = await prisma.pricingSetting.findUnique({
        where: {
          tenantId_key: {
            tenantId,
            key: 'AGENT_REGISTRATION_FEE'
          }
        }
      });

      const platformFees = pricing?.amount || 0;
      const gst = platformFees * 0.18;
      const serviceCharge = 0;
      const totalAmount = platformFees + gst + serviceCharge;

      // Check wallet balance
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
          balance: { decrement: totalAmount }
        }
      });

      // Create wallet transaction
      await prisma.walletTransaction.create({
        data: {
          userId,
          amount: totalAmount,
          type: 'DEBIT',
          meta: {
            description: 'Agent registration fee',
            shopName
          }
        }
      });

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          userId,
          type: 'AGENT_REGISTRATION',
          amount: totalAmount,
          currency: 'INR',
          gateway: 'WALLET',
          gatewayPaymentId: razorPayReferenceNo,
          status: 'COMPLETED'
        }
      });

      // Create agent
      const agent = await prisma.agent.create({
        data: {
          userId,
          aadharNumber,
          maskAadharNumber,
          aadhaarFatherName,
          aadhaarName,
          aadhaarAddress,
          aadhaarDOB: aadhaarDOB ? new Date(aadhaarDOB) : null,
          panCardNo,
          isAadharSeeding,
          panFirstName,
          panMiddleName,
          panLastName,
          computerLiteracy: computerLiteracy === true || computerLiteracy === 'true',
          isPC: isPC === true || isPC === 'true',
          internetSearchAndAccessLiteracy: internetSearchAndAccessLiteracy === true || internetSearchAndAccessLiteracy === 'true',
          isEKYCDevice: isEKYCDevice === true || isEKYCDevice === 'true',
          shopName,
          shopType,
          licenceNo,
          shopAddress,
          shopDistrictId,
          shopMunicipalityId,
          shopStateId,
          shopPinCode,
          shopCountry,
          documents,
          sections: sections || [],
          parentUserId,
          addresses,
          schemeFees: schemeFees || 0,
          platformFees,
          gst,
          serviceCharge,
          totalAmount,
          razorPayReferenceNo,
          paymentMode,
          status: 'PENDING',
          isAdminCreated: false,
          upgradedFromMember: false
        }
      });

      // Update user identity to AGENT
      await prisma.user.update({
        where: { id: userId },
        data: { identity: 'AGENT' }
      });

      return res.status(201).json({
        success: true,
        message: 'Agent registration submitted successfully. Pending approval.',
        data: {
          agent,
          payment: {
            platformFees,
            gst,
            serviceCharge,
            totalAmount
          }
        }
      });

    } catch (error) {
      console.error('Register as agent error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to register as agent',
        error: error.message
      });
    }
  },

  /**
   * Member Upgrade: Member pays to become agent
   */
  memberUpgradeToAgent: async (req, res) => {
    try {
      const { user_id: userId, tenant_id: tenantId } = req.user;
      
      // Check if user is a member
      const member = await prisma.member.findUnique({
        where: { userId }
      });

      if (!member) {
        return res.status(403).json({
          success: false,
          message: 'You must be a member to upgrade to agent'
        });
      }

      // Check if already an agent
      const existingAgent = await prisma.agent.findUnique({
        where: { userId }
      });

      if (existingAgent) {
        return res.status(409).json({
          success: false,
          message: 'You are already registered as an agent'
        });
      }

      const {
        aadharNumber, maskAadharNumber, aadhaarFatherName, aadhaarName,
        aadhaarAddress, aadhaarDOB, panCardNo, isAadharSeeding,
        panFirstName, panMiddleName, panLastName,
        computerLiteracy, isPC, internetSearchAndAccessLiteracy, isEKYCDevice,
        shopName, shopType, licenceNo, shopAddress,
        shopDistrictId, shopMunicipalityId, shopStateId, shopPinCode, shopCountry,
        documents, sections, parentUserId, addresses, schemeFees,
        razorPayReferenceNo, paymentMode
      } = req.body;

      // Get member to agent upgrade fee
      const pricing = await prisma.pricingSetting.findUnique({
        where: {
          tenantId_key: {
            tenantId,
            key: 'MEMBER_TO_AGENT_UPGRADE_FEE'
          }
        }
      });

      const platformFees = pricing?.amount || 0;
      const gst = platformFees * 0.18;
      const serviceCharge = 0;
      const totalAmount = platformFees + gst + serviceCharge;

      // Check wallet balance
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
          balance: { decrement: totalAmount }
        }
      });

      // Create wallet transaction
      await prisma.walletTransaction.create({
        data: {
          userId,
          amount: totalAmount,
          type: 'DEBIT',
          meta: {
            description: 'Member to Agent upgrade fee',
            shopName
          }
        }
      });

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          userId,
          type: 'MEMBER_TO_AGENT_UPGRADE',
          amount: totalAmount,
          currency: 'INR',
          gateway: 'WALLET',
          gatewayPaymentId: razorPayReferenceNo,
          status: 'COMPLETED'
        }
      });

      // Create agent (upgraded from member)
      const agent = await prisma.agent.create({
        data: {
          userId,
          aadharNumber,
          maskAadharNumber,
          aadhaarFatherName,
          aadhaarName,
          aadhaarAddress,
          aadhaarDOB: aadhaarDOB ? new Date(aadhaarDOB) : null,
          panCardNo,
          isAadharSeeding,
          panFirstName,
          panMiddleName,
          panLastName,
          computerLiteracy: computerLiteracy === true || computerLiteracy === 'true',
          isPC: isPC === true || isPC === 'true',
          internetSearchAndAccessLiteracy: internetSearchAndAccessLiteracy === true || internetSearchAndAccessLiteracy === 'true',
          isEKYCDevice: isEKYCDevice === true || isEKYCDevice === 'true',
          shopName,
          shopType,
          licenceNo,
          shopAddress,
          shopDistrictId,
          shopMunicipalityId,
          shopStateId,
          shopPinCode,
          shopCountry,
          documents,
          sections: sections || [],
          parentUserId,
          addresses,
          schemeFees: schemeFees || 0,
          platformFees,
          gst,
          serviceCharge,
          totalAmount,
          razorPayReferenceNo,
          paymentMode,
          status: 'PENDING',
          isAdminCreated: false,
          upgradedFromMember: true
        }
      });

      // Update user identity to AGENT
      await prisma.user.update({
        where: { id: userId },
        data: { identity: 'AGENT' }
      });

      return res.status(201).json({
        success: true,
        message: 'Agent upgrade submitted successfully. Pending approval.',
        data: {
          agent,
          payment: {
            platformFees,
            gst,
            serviceCharge,
            totalAmount
          }
        }
      });

    } catch (error) {
      console.error('Member upgrade to agent error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upgrade to agent',
        error: error.message
      });
    }
  },

  /**
   * Admin: Create agent without payment
   */
  adminCreateAgent: async (req, res) => {
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

      // Check if already an agent
      const existingAgent = await prisma.agent.findUnique({
        where: { userId }
      });

      if (existingAgent) {
        return res.status(409).json({
          success: false,
          message: 'User is already an agent'
        });
      }

      const {
        aadharNumber, maskAadharNumber, aadhaarFatherName, aadhaarName,
        aadhaarAddress, aadhaarDOB, panCardNo, isAadharSeeding,
        panFirstName, panMiddleName, panLastName,
        computerLiteracy, isPC, internetSearchAndAccessLiteracy, isEKYCDevice,
        shopName, shopType, licenceNo, shopAddress,
        shopDistrictId, shopMunicipalityId, shopStateId, shopPinCode, shopCountry,
        documents, sections, parentUserId, addresses, schemeFees
      } = req.body;

      // Create agent without payment and auto-approve
      const agent = await prisma.agent.create({
        data: {
          userId,
          aadharNumber,
          maskAadharNumber,
          aadhaarFatherName,
          aadhaarName,
          aadhaarAddress,
          aadhaarDOB: aadhaarDOB ? new Date(aadhaarDOB) : null,
          panCardNo,
          isAadharSeeding,
          panFirstName,
          panMiddleName,
          panLastName,
          computerLiteracy: computerLiteracy === true || computerLiteracy === 'true',
          isPC: isPC === true || isPC === 'true',
          internetSearchAndAccessLiteracy: internetSearchAndAccessLiteracy === true || internetSearchAndAccessLiteracy === 'true',
          isEKYCDevice: isEKYCDevice === true || isEKYCDevice === 'true',
          shopName,
          shopType,
          licenceNo,
          shopAddress,
          shopDistrictId,
          shopMunicipalityId,
          shopStateId,
          shopPinCode,
          shopCountry,
          documents,
          sections: sections || [],
          parentUserId,
          addresses,
          schemeFees: schemeFees || 0,
          platformFees: 0,
          gst: 0,
          serviceCharge: 0,
          totalAmount: 0,
          status: 'ACTIVE',
          isAdminCreated: true,
          upgradedFromMember: false,
          approvedBy: adminId,
          approvedAt: new Date()
        }
      });

      // Update user identity to AGENT
      await prisma.user.update({
        where: { id: userId },
        data: { identity: 'AGENT' }
      });

      return res.status(201).json({
        success: true,
        message: 'Agent created successfully by admin',
        data: { agent }
      });

    } catch (error) {
      console.error('Admin create agent error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create agent',
        error: error.message
      });
    }
  },

  /**
   * Get my agent profile
   */
  getMyAgentProfile: async (req, res) => {
    try {
      const { user_id: userId } = req.user;

      const agent = await prisma.agent.findUnique({
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

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent profile not found'
        });
      }

      return res.json({
        success: true,
        data: { agent }
      });

    } catch (error) {
      console.error('Get agent profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch agent profile',
        error: error.message
      });
    }
  },

  /**
   * Update my agent profile
   */
  updateMyAgentProfile: async (req, res) => {
    try {
      const { user_id: userId } = req.user;

      const agent = await prisma.agent.findUnique({
        where: { userId }
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent profile not found'
        });
      }

      const updateData = { ...req.body };
      
      // Parse dates
      if (updateData.aadhaarDOB) {
        updateData.aadhaarDOB = new Date(updateData.aadhaarDOB);
      }

      // Parse booleans
      ['computerLiteracy', 'isPC', 'internetSearchAndAccessLiteracy', 'isEKYCDevice',
       'isAadharApproved', 'isPanCardApproved'].forEach(field => {
        if (updateData[field] !== undefined) {
          updateData[field] = updateData[field] === true || updateData[field] === 'true';
        }
      });

      const updatedAgent = await prisma.agent.update({
        where: { userId },
        data: updateData
      });

      return res.json({
        success: true,
        message: 'Agent profile updated successfully',
        data: { agent: updatedAgent }
      });

    } catch (error) {
      console.error('Update agent profile error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update agent profile',
        error: error.message
      });
    }
  },

  // ==================== ADMIN APIs ====================

  /**
   * Admin: Get all agents
   */
  adminGetAllAgents: async (req, res) => {
    try {
      const { status, isAdminCreated, upgradedFromMember, page = 1, limit = 20 } = req.query;

      const where = {};
      if (status) where.status = status;
      if (isAdminCreated !== undefined) where.isAdminCreated = isAdminCreated === 'true';
      if (upgradedFromMember !== undefined) where.upgradedFromMember = upgradedFromMember === 'true';

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [agents, total] = await Promise.all([
        prisma.agent.findMany({
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
        prisma.agent.count({ where })
      ]);

      return res.json({
        success: true,
        data: {
          agents,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Admin get all agents error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch agents',
        error: error.message
      });
    }
  },

  /**
   * Admin: Get agent by ID
   */
  adminGetAgentById: async (req, res) => {
    try {
      const { id } = req.params;

      const agent = await prisma.agent.findUnique({
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

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      return res.json({
        success: true,
        data: { agent }
      });

    } catch (error) {
      console.error('Admin get agent error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch agent',
        error: error.message
      });
    }
  },

  /**
   * Admin: Update agent
   */
  adminUpdateAgent: async (req, res) => {
    try {
      const { id } = req.params;

      const agent = await prisma.agent.findUnique({
        where: { id }
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      const updateData = { ...req.body };
      
      // Parse dates
      if (updateData.aadhaarDOB) {
        updateData.aadhaarDOB = new Date(updateData.aadhaarDOB);
      }

      // Parse booleans
      ['computerLiteracy', 'isPC', 'internetSearchAndAccessLiteracy', 'isEKYCDevice',
       'isAadharApproved', 'isPanCardApproved'].forEach(field => {
        if (updateData[field] !== undefined) {
          updateData[field] = updateData[field] === true || updateData[field] === 'true';
        }
      });

      const updatedAgent = await prisma.agent.update({
        where: { id },
        data: updateData
      });

      return res.json({
        success: true,
        message: 'Agent updated successfully',
        data: { agent: updatedAgent }
      });

    } catch (error) {
      console.error('Admin update agent error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update agent',
        error: error.message
      });
    }
  },

  /**
   * Admin: Approve or reject agent
   */
  adminApproveAgent: async (req, res) => {
    try {
      const { user_id: adminId } = req.user;
      const { id } = req.params;
      const { status, rejectionReason } = req.body;

      if (!['ACTIVE', 'REJECTED'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be ACTIVE or REJECTED'
        });
      }

      const agent = await prisma.agent.findUnique({
        where: { id }
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          message: 'Agent not found'
        });
      }

      const updateData = {
        status,
        approvedBy: adminId,
        approvedAt: new Date()
      };

      if (status === 'REJECTED') {
        updateData.rejectionReason = rejectionReason;
      }

      const updatedAgent = await prisma.agent.update({
        where: { id },
        data: updateData
      });

      return res.json({
        success: true,
        message: `Agent ${status === 'ACTIVE' ? 'approved' : 'rejected'} successfully`,
        data: { agent: updatedAgent }
      });

    } catch (error) {
      console.error('Admin approve agent error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process agent approval',
        error: error.message
      });
    }
  },

  /**
   * Admin: Set agent registration fee
   */
  adminSetAgentFee: async (req, res) => {
    try {
      const { tenant_id: tenantId } = req.user;
      const { type, amount } = req.body;

      if (!['AGENT_REGISTRATION_FEE', 'MEMBER_TO_AGENT_UPGRADE_FEE'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Type must be AGENT_REGISTRATION_FEE or MEMBER_TO_AGENT_UPGRADE_FEE'
        });
      }

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
            key: type
          }
        },
        update: {
          amount: parseFloat(amount),
          isActive: true
        },
        create: {
          tenantId,
          key: type,
          amount: parseFloat(amount),
          currency: 'INR',
          isActive: true
        }
      });

      return res.json({
        success: true,
        message: 'Agent fee updated successfully',
        data: { pricing }
      });

    } catch (error) {
      console.error('Set agent fee error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to set agent fee',
        error: error.message
      });
    }
  },

  /**
   * Admin: Get agent fees
   */
  adminGetAgentFees: async (req, res) => {
    try {
      const { tenant_id: tenantId } = req.user;

      const [agentFee, upgradeFee] = await Promise.all([
        prisma.pricingSetting.findUnique({
          where: {
            tenantId_key: {
              tenantId,
              key: 'AGENT_REGISTRATION_FEE'
            }
          }
        }),
        prisma.pricingSetting.findUnique({
          where: {
            tenantId_key: {
              tenantId,
              key: 'MEMBER_TO_AGENT_UPGRADE_FEE'
            }
          }
        })
      ]);

      return res.json({
        success: true,
        data: {
          agentRegistrationFee: {
            amount: agentFee?.amount || 0,
            currency: agentFee?.currency || 'INR',
            isActive: agentFee?.isActive || false
          },
          memberToAgentUpgradeFee: {
            amount: upgradeFee?.amount || 0,
            currency: upgradeFee?.currency || 'INR',
            isActive: upgradeFee?.isActive || false
          }
        }
      });

    } catch (error) {
      console.error('Get agent fees error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get agent fees',
        error: error.message
      });
    }
  }
};

module.exports = agentRegistrationController;
