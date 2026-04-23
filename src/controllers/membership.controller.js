const { PrismaClient } = require("@prisma/client");
const { generateUuid } = require("../utils/id");
const { logAction } = require("../utils/audit");
const razorpayService = require("../services/razorpay.service");

const prisma = new PrismaClient();

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
      const requiredFields = [
        'firstName', 'lastName', 'email', 'gender', 'educationId',
        'sectorId', 'jobRoleId', 'maritalStatus', 'citizenship',
        'isMigrantWorker', 'monthlyIncome', 'currentCountry',
        'currentState', 'currentDistrict', 'currentAddress', 'currentPincode',
        'permanentCountry', 'permanentState', 'permanentDistrict',
        'permanentAddress', 'permanentPincode', 'documents'
      ];

      const missingFields = requiredFields.filter(field => body[field] === undefined || body[field] === null);
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
          missingFields
        });
      }

      // Check if user already has a pending application
      const existingApplication = await prisma.membershipApplication.findFirst({
        where: {
          userId,
          status: { in: ['PENDING', 'APPROVED'] }
        }
      });

      if (existingApplication) {
        return res.status(400).json({
          success: false,
          message: "You already have a pending or approved membership application"
        });
      }

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

      // Create membership application
      const application = await prisma.membershipApplication.create({
        data: {
          id: generateUuid(),
          userId,
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          gender: body.gender,
          educationId: body.educationId,
          sectorId: body.sectorId,
          jobRoleId: body.jobRoleId,
          maritalStatus: body.maritalStatus,
          citizenship: body.citizenship,
          isMigrantWorker: body.isMigrantWorker,
          monthlyIncome: body.monthlyIncome,
          currentCountry: body.currentCountry,
          currentState: body.currentState,
          currentDistrict: body.currentDistrict,
          currentAddress: body.currentAddress,
          currentPincode: body.currentPincode,
          permanentCountry: body.permanentCountry,
          permanentState: body.permanentState,
          permanentDistrict: body.permanentDistrict,
          permanentAddress: body.permanentAddress,
          permanentPincode: body.permanentPincode,
          status: 'PENDING'
        }
      });

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

      // Create Razorpay order (receipt max 40 chars)
      const receipt = `member_${application.id.slice(0, 28)}`; // Keep under 40 chars
      const order = await razorpayService.createOrder(
        config.membershipPrice,
        config.currency,
        receipt
      );

      // Create payment record
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
