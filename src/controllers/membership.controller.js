const { PrismaClient } = require("@prisma/client");
const { generateUuid } = require("../utils/id");
const { logAction } = require("../utils/audit");
const razorpayService = require("../services/razorpay.service");
const walletService = require("../services/wallet.service");

const prisma = new PrismaClient();

const AUTHORIZED_CREATOR_ROLES = [
  'SUPER_ADMIN',
  'WHITE_LABEL_ADMIN',
  'ADMIN',
  'SUB_ADMIN',
  'COUNTRY_HEAD',
  'STATE_PARTNER',
  'DISTRICT_PARTNER'
];

const membershipController = {
  /**
   * Get membership price
   */
  getMembershipPrice: async (req, res) => {
    try {
      const config = await prisma.membershipConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      if (!config) {
        return res.status(404).json({
          success: false,
          message: "Membership configuration not found"
        });
      }

      res.json({
        success: true,
        data: {
          price: config.membershipPrice,
          currency: config.currency
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get reference data (education, sectors, job roles, document types)
   */
  getReferenceData: async (req, res) => {
    try {
      const [educations, sectors, jobRoles, documentTypes] = await Promise.all([
        prisma.education.findMany({ where: { isActive: true } }),
        prisma.sector.findMany({ where: { isActive: true } }),
        prisma.jobRole.findMany({ where: { isActive: true } }),
        prisma.documentType.findMany({ where: { isActive: true } })
      ]);

      res.json({
        success: true,
        data: {
          educations,
          sectors,
          jobRoles,
          documentTypes
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Create membership application and initiate payment
   */
  createApplication: async (req, res) => {
    const { user_id: userId } = req.user;
    const body = req.body;

    try {
      // Validate user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found. Please login again."
        });
      }

      // Validate required fields
      // Support both old flat payload and new complex JSON payload
      const isComplexPayload = Array.isArray(body.addresses) || Array.isArray(body.documents);
      
      if (!isComplexPayload) {
        const requiredFields = [
          'firstName', 'lastName', 'email', 'gender', 'educationId',
          'sectorId', 'jobRoleId', 'maritalStatus', 'citizenship',
          'isMigrantWorker', 'monthlyIncome'
        ];

        const missingFields = requiredFields.filter(field => body[field] === undefined || body[field] === null);
        if (missingFields.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Missing required fields",
            missingFields
          });
        }
      }

      // Check if this is Method 2 (Admin/Partner creating for someone else)
      const requesterIdentity = req.user.identity;
      const isMethod2 = AUTHORIZED_CREATOR_ROLES.includes(requesterIdentity);
      
      // For Method 2, targetUserId can be from body, otherwise it's self-application
      const targetUserId = (isMethod2 && body.userId) ? body.userId : userId;

      // Check if target user already has a pending application
      const existingApplication = await prisma.membershipApplication.findFirst({
        where: {
          userId: targetUserId,
        },
        include: { payment: true },
        orderBy: { createdAt: 'desc' }
      });

      if (existingApplication && ['PENDING', 'APPROVED'].includes(existingApplication.status)) {
        return res.status(400).json({
          success: false,
          message: `User already has a ${existingApplication.status.toLowerCase()} membership application`
        });
      }

      // Special Check: If the application was REJECTED but the payment was SUCCESSFUL, we allow for free
      const isPaidResubmission = existingApplication && 
                               existingApplication.status === 'REJECTED' && 
                               existingApplication.payment?.status === 'SUCCESS';

      // Get membership price
      const config = await prisma.membershipConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      if (!config) {
        return res.status(404).json({
          success: false,
          message: "Membership configuration not found"
        });
      }

      // Handle Wallet Deduction for Method 2 (Skip if it's a paid resubmission or if paying via Razorpay)
      let walletTransaction = null;
      const isWalletPayment = (body.paymentMode === 2); // Assuming 2 is Wallet from your earlier JSON

      if (isMethod2 && !isPaidResubmission && isWalletPayment) {
        try {
          // Deduct from the requester's (creator's) wallet (Smart Resolver handles Shared vs Personal)
          walletTransaction = await walletService.deductBalanceIfSufficient(userId, config.membershipPrice, user.tenantId, requesterIdentity);
        } catch (walletErr) {
          return res.status(400).json({
            success: false,
            message: walletErr.message || "Insufficient wallet balance",
            code: walletErr.code
          });
        }
      }

      // Extract fields prioritizing the new complex JSON structure
      const mapComplexToFlat = () => {
        // Find specific addresses from the new array structure if provided
        const currAddress = Array.isArray(body.addresses) ? body.addresses.find(a => a.addressType === 0) || body.addresses[0] || {} : {};
        const permAddress = Array.isArray(body.addresses) ? body.addresses.find(a => a.addressType === 1) || body.addresses[0] || {} : {};
        
        return {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          gender: body.gender || body.genderId || "OTHER",
          educationId: body.education || body.educationId || "1",
          sectorId: body.sector || body.sectorId || "1",
          jobRoleId: (Array.isArray(body.jobRoles) && body.jobRoles.length > 0) ? body.jobRoles[0] : (body.jobRoleId || "1"),
          maritalStatus: body.maritalStatus || "SINGLE",
          citizenship: body.citizen || body.citizenship || "Indian",
          isMigrantWorker: Boolean(body.isMigrantWorker),
          monthlyIncome: body.monthlyIncome || "0",
          incomeAboveThreshold: Boolean(body.incomeAboveThreashold || body.incomeAboveThreshold),
          
          currentCountry: currAddress.country || body.currentCountry || "India",
          currentState: currAddress.stateId || body.currentState || "State",
          currentDistrict: currAddress.districtId || body.currentDistrict || "District",
          currentAddress: currAddress.address || body.currentAddress || "Address",
          currentPincode: currAddress.pinCode || body.currentPincode || "000000",
          
          permanentCountry: permAddress.country || body.permanentCountry || "India",
          permanentState: permAddress.stateId || body.permanentState || "State",
          permanentDistrict: permAddress.districtId || body.permanentDistrict || "District",
          permanentAddress: permAddress.address || body.permanentAddress || "Address",
          permanentPincode: permAddress.pinCode || body.permanentPincode || "000000",
          
          profilePhoto: body.profilePhoto,
          imageName: body.imageName,
          razorPayReferenceNo: body.razorPayReferenceNo,
          platformFees: body.platformFees ? parseFloat(body.platformFees) : 0,
          gst: body.gst ? parseFloat(body.gst) : 0,
          serviceCharge: body.serviceCharge ? parseFloat(body.serviceCharge) : 0,
          paymentMode: body.paymentMode !== undefined ? parseInt(body.paymentMode) : 1,
          tnxStatus: body.tnxStatus !== undefined ? parseInt(body.tnxStatus) : 0,
          
          addressesJson: body.addresses || null,
          documentsJson: body.documents || null,
        };
      };

      const mappedData = mapComplexToFlat();

      // Create or Update membership application
      let application;
      if (isPaidResubmission) {
        application = await prisma.membershipApplication.update({
          where: { id: existingApplication.id },
          data: {
            ...mappedData,
            status: 'PENDING',
            createdById: isMethod2 ? userId : null
          }
        });
      } else {
        // Delete old rejected application if any to avoid uniqueness constraint issues
        if (existingApplication) {
          await prisma.membershipPayment.deleteMany({ where: { applicationId: existingApplication.id } });
          await prisma.membershipDocument.deleteMany({ where: { applicationId: existingApplication.id } });
          await prisma.membershipApplication.delete({ where: { id: existingApplication.id } });
        }

        application = await prisma.membershipApplication.create({
          data: {
            id: generateUuid(),
            userId: targetUserId,
            ...mappedData,
            status: 'PENDING',
            createdById: isMethod2 ? userId : null,
            paymentType: isMethod2 ? 'WALLET' : 'RAZORPAY'
          }
        });
      }

      // Create documents
      if (body.documents && body.documents.length > 0) {
        const documentData = body.documents.map(doc => ({
          id: generateUuid(),
          applicationId: application.id,
          documentTypeId: doc.documentTypeId,
          documentNumber: doc.documentNumber,
          frontImageUrl: doc.frontImageUrl,
          backImageUrl: doc.backImageUrl || null
        }));

        await prisma.membershipDocument.createMany({
          data: documentData
        });
      }

      // If it's a paid resubmission, we are done
      if (isPaidResubmission) {
        await logAction({
          userId,
          action: "MEMBERSHIP_APPLICATION_RESUBMITTED",
          targetId: application.id,
          metadata: { targetUserId }
        });

        return res.status(200).json({
          success: true,
          message: "Membership application resubmitted successfully. Previous payment reused.",
          data: { applicationId: application.id, status: 'PENDING' }
        });
      }

      // For Method 2 (Wallet), we mark payment as success immediately
      if (isMethod2) {
        await prisma.membershipPayment.create({
          data: {
            id: generateUuid(),
            applicationId: application.id,
            razorpayOrderId: `wallet_${application.id.slice(0, 20)}`,
            amount: config.membershipPrice,
            currency: config.currency,
            status: 'SUCCESS',
            paidAt: new Date()
          }
        });

        await logAction({
          userId,
          action: "MEMBERSHIP_APPLICATION_CREATED_WALLET",
          targetId: application.id,
          metadata: { amount: config.membershipPrice, targetUserId }
        });

        return res.status(201).json({
          success: true,
          message: "Membership application created successfully via wallet payment.",
          data: {
            applicationId: application.id,
            status: 'PENDING'
          }
        });
      }

      // Method 1 (Razorpay)
      const receipt = `member_${application.id.slice(0, 28)}`;
      const order = await razorpayService.createOrder(
        config.membershipPrice,
        config.currency,
        receipt
      );

      await prisma.membershipPayment.create({
        data: {
          id: generateUuid(),
          applicationId: application.id,
          razorpayOrderId: order.id,
          amount: config.membershipPrice,
          currency: config.currency,
          status: 'PENDING'
        }
      });

      await logAction({
        userId,
        action: "MEMBERSHIP_APPLICATION_CREATED",
        targetId: application.id,
        metadata: { amount: config.membershipPrice }
      });

      res.status(201).json({
        success: true,
        message: "Membership application created. Please complete the payment.",
        data: {
          applicationId: application.id,
          orderId: order.id,
          amount: config.membershipPrice,
          currency: config.currency,
          key: process.env.RAZORPAY_KEY_ID
        }
      });
    } catch (err) {
      console.error('Error creating membership application:', err);
      
      // Handle foreign key constraint errors
      if (err.code === 'P2003') {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid reference data. Please check that educationId, sectorId, jobRoleId, and documentTypeId exist."
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        code: err.code || undefined
      });
    }
  },

  /**
   * Verify payment after Razorpay checkout
   */
  verifyPayment: async (req, res) => {
    const { user_id: userId } = req.user;
    const { applicationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!applicationId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification details"
      });
    }

    try {
      // Find the application
      const application = await prisma.membershipApplication.findFirst({
        where: {
          id: applicationId,
          userId
        },
        include: {
          payment: true
        }
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found"
        });
      }

      if (!application.payment) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found"
        });
      }

      // Verify signature
      const isValid = razorpayService.verifyPaymentSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      });

      if (!isValid) {
        await prisma.membershipPayment.update({
          where: { id: application.payment.id },
          data: {
            status: 'FAILED',
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature
          }
        });

        return res.status(400).json({
          success: false,
          message: "Invalid payment signature"
        });
      }

      // Update payment record
      await prisma.membershipPayment.update({
        where: { id: application.payment.id },
        data: {
          status: 'SUCCESS',
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paidAt: new Date()
        }
      });

      await logAction({
        userId,
        action: "MEMBERSHIP_PAYMENT_SUCCESS",
        targetId: application.id,
        metadata: { paymentId: razorpay_payment_id }
      });

      res.json({
        success: true,
        message: "Payment successful. Your membership application is under review."
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get user's membership application status
   */
  getApplicationStatus: async (req, res) => {
    const { user_id: userId } = req.user;

    try {
      const application = await prisma.membershipApplication.findFirst({
        where: { userId },
        include: {
          payment: true,
          education: true,
          sector: true,
          jobRole: true,
          documents: true
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!application) {
        return res.json({
          success: true,
          data: null,
          message: "No membership application found"
        });
      }

      res.json({
        success: true,
        data: application
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Resubmit rejected application (without payment)
   */
  resubmitApplication: async (req, res) => {
    const { user_id: userId } = req.user;
    const body = req.body;

    try {
      // Find rejected application
      const rejectedApplication = await prisma.membershipApplication.findFirst({
        where: {
          userId,
          status: 'REJECTED'
        },
        include: {
          payment: true
        }
      });

      if (!rejectedApplication) {
        return res.status(404).json({
          success: false,
          message: "No rejected application found to resubmit"
        });
      }

      if (rejectedApplication.payment?.status !== 'SUCCESS') {
        return res.status(400).json({
          success: false,
          message: "Original payment was not successful"
        });
      }

      // Update application with new data
      const updatedApplication = await prisma.membershipApplication.update({
        where: { id: rejectedApplication.id },
        data: {
          firstName: body.firstName || rejectedApplication.firstName,
          lastName: body.lastName || rejectedApplication.lastName,
          email: body.email || rejectedApplication.email,
          gender: body.gender || rejectedApplication.gender,
          educationId: body.educationId || rejectedApplication.educationId,
          sectorId: body.sectorId || rejectedApplication.sectorId,
          jobRoleId: body.jobRoleId || rejectedApplication.jobRoleId,
          maritalStatus: body.maritalStatus || rejectedApplication.maritalStatus,
          citizenship: body.citizenship || rejectedApplication.citizenship,
          isMigrantWorker: body.isMigrantWorker !== undefined ? body.isMigrantWorker : rejectedApplication.isMigrantWorker,
          monthlyIncome: body.monthlyIncome || rejectedApplication.monthlyIncome,
          currentCountry: body.currentCountry || rejectedApplication.currentCountry,
          currentState: body.currentState || rejectedApplication.currentState,
          currentDistrict: body.currentDistrict || rejectedApplication.currentDistrict,
          currentAddress: body.currentAddress || rejectedApplication.currentAddress,
          currentPincode: body.currentPincode || rejectedApplication.currentPincode,
          permanentCountry: body.permanentCountry || rejectedApplication.permanentCountry,
          permanentState: body.permanentState || rejectedApplication.permanentState,
          permanentDistrict: body.permanentDistrict || rejectedApplication.permanentDistrict,
          permanentAddress: body.permanentAddress || rejectedApplication.permanentAddress,
          permanentPincode: body.permanentPincode || rejectedApplication.permanentPincode,
          status: 'PENDING',
          rejectionReason: null
        }
      });

      // Update documents if provided
      if (body.documents && body.documents.length > 0) {
        // Delete old documents
        await prisma.membershipDocument.deleteMany({
          where: { applicationId: rejectedApplication.id }
        });

        // Create new documents
        const documentData = body.documents.map(doc => ({
          id: generateUuid(),
          applicationId: updatedApplication.id,
          documentTypeId: doc.documentTypeId,
          documentNumber: doc.documentNumber,
          frontImageUrl: doc.frontImageUrl,
          backImageUrl: doc.backImageUrl || null
        }));

        await prisma.membershipDocument.createMany({
          data: documentData
        });
      }

      await logAction({
        userId,
        action: "MEMBERSHIP_APPLICATION_RESUBMITTED",
        targetId: updatedApplication.id
      });

      res.json({
        success: true,
        message: "Application resubmitted successfully. No payment required.",
        data: {
          applicationId: updatedApplication.id
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = membershipController;
