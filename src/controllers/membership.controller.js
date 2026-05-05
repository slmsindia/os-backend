const { generateUuid } = require("../utils/id");
const { logAction } = require("../utils/audit");
const razorpayService = require("../services/razorpay.service");
const walletService = require("../services/wallet.service");
const bcrypt = require("bcrypt");
const prisma = require("../lib/prisma");

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
          currency: config.currency,
          gst: config.gst,
          includedExcluded: config.includedExcluded,
          platformFee: config.platformFee,
          serviceCharge: config.serviceCharge
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
      const [educations, sectors, jobRoles, skills, documentTypes] = await Promise.all([
        prisma.education.findMany({ where: { isActive: true } }),
        prisma.sector.findMany({ where: { isActive: true }, include: { jobRoles: true, skills: true } }),
        prisma.jobRole.findMany({ where: { isActive: true } }),
        prisma.skill.findMany({ where: { isActive: true } }),
        prisma.documentType.findMany({ where: { isActive: true } })
      ]);

      res.json({
        success: true,
        data: {
          educations,
          sectors,
          jobRoles,
          skills,
          documentTypes
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Check if mobile number is already registered
   */
  checkMobile: async (req, res) => {
    const { mobile } = req.query;
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: "Invalid mobile number" });
    }

    try {
      const user = await prisma.user.findFirst({
        where: { mobile, tenantId: req.tenant_id },
        select: { id: true, fullName: true, identity: true }
      });

      // Also check for existing membership application for this user
      let application = null;
      if (user) {
        application = await prisma.membershipApplication.findFirst({
          where: { userId: user.id },
          include: { payment: true },
          orderBy: { createdAt: 'desc' }
        });
      }

      res.json({
        success: true,
        isRegistered: !!user,
        user: user || null,
        application: application ? {
          id: application.id,
          status: application.status,
          paymentStatus: application.payment?.status || 'NONE',
          createdAt: application.createdAt,
          rejectionReason: application.rejectionReason
        } : null
      });
    } catch (err) {
      console.error('Check Mobile Error:', err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Create membership application and initiate payment
   */
  createApplication: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId, identity: requesterIdentity } = req.user;
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
          'isMigrantWorker', 'monthlyIncome', 'mobile'
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

      // 10-digit Phone Number Verification
      const mobile = body.mobile || (isComplexPayload ? body.contactNumber1 : null);
      if (mobile) {
        if (!/^\d{10}$/.test(mobile)) {
          return res.status(400).json({ success: false, message: "Invalid phone number. Must be 10 digits." });
        }
        
        const existingUser = await prisma.user.findFirst({ where: { mobile, tenantId } });
        if (existingUser) {
          // If user exists, we check if they are already a member or pending
          // (They can still apply if they are just a basic USER)
        }
      }

      // Check if this is Method 2 (Admin/Partner creating for someone else)
      const isMethod2 = AUTHORIZED_CREATOR_ROLES.includes(requesterIdentity);

      // For Method 2, targetUserId can be from body, or looked up by mobile if provided
      let targetUserId = userId;
      
      if (isMethod2) {
        if (body.userId) {
          targetUserId = body.userId;
        } else if (body.mobile || body.contactNumber1) {
          const lookupMobile = body.mobile || body.contactNumber1;
          const userByMobile = await prisma.user.findFirst({ where: { mobile: lookupMobile, tenantId } });
          if (userByMobile) {
            targetUserId = userByMobile.id;
          } else {
            // Auto-create the user as MEMBER since an Admin is creating them
            const creator = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, path: true } });
            const path = creator.path ? `${creator.path}/${creator.id}` : `/${creator.id}`;
            // Use provided password or fallback to mobile last 4 digits
            const defaultPassword = (lookupMobile && lookupMobile.length >= 4) ? lookupMobile.slice(-4) : "1234";
            const passwordToHash = body.password || defaultPassword;
            const hashedPassword = await bcrypt.hash(passwordToHash, 10);

            const newUser = await prisma.user.create({
              data: {
                id: generateUuid(),
                mobile: lookupMobile,
                fullName: body.firstName + (body.lastName ? " " + body.lastName : ""),
                email: body.email || null,
                gender: (body.gender || "OTHER").toUpperCase(),
                dateOfBirth: body.birthDate ? new Date(body.birthDate) : new Date(),
                password: hashedPassword,
                identity: 'USER',  // Wait for admin approval to become MEMBER
                tenantId,
                parentId: userId,
                path
              }
            });
            targetUserId = newUser.id;
          }
        }
      }

      // Every submission creates a NEW independent application record.
      // No old application is ever deleted — all show up in admin pending list separately.
      // isPaidResubmission: if the last app was REJECTED but payment was already SUCCESS, reuse it (no extra charge).
      const existingApplication = await prisma.membershipApplication.findFirst({
        where: { userId: targetUserId },
        include: { payment: true },
        orderBy: { createdAt: 'desc' }
      });

      // BLOCK if already PENDING or APPROVED
      if (existingApplication && (existingApplication.status === 'PENDING' || existingApplication.status === 'APPROVED')) {
        return res.status(400).json({
          success: false,
          message: `Application already exists. Status: ${existingApplication.status}. You cannot apply again unless rejected.`,
          status: existingApplication.status
        });
      }

      // Check if user is already a MEMBER
      if (user && user.identity === 'MEMBER') {
        return res.status(400).json({ success: false, message: "User is already a MEMBER." });
      }

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

      // Extract fields prioritizing the new complex JSON structure
      const mapComplexToFlat = () => {
        // Find specific addresses from the new array structure if provided
        const currAddress = Array.isArray(body.addresses) ? body.addresses.find(a => a.addressType === 0) || body.addresses[0] || {} : {};
        const permAddress = Array.isArray(body.addresses) ? body.addresses.find(a => a.addressType === 1) || body.addresses[0] || {} : {};
        
        return {
          firstName: body.firstName,
          lastName: body.lastName,
          email: body.email,
          mobile: body.mobile || (Array.isArray(body.documents) ? body.contactNumber1 : null),
          gender: body.gender || body.genderId || "OTHER",
          birthDate: body.birthDate ? new Date(body.birthDate) : null,
          educationId: body.education || body.educationId || "1",
          occupation: body.occupation || "N/A",
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


      const isTopAdmin = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(requesterIdentity);
      const isPartner = ['COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'].includes(requesterIdentity);
      const isFree = isTopAdmin;

      // Create or Update membership application and documents in a TRANSACTION
      const result = await prisma.$transaction(async (tx) => {
        let partnerWallet = null;
        let adminWallet = null;

        if (isPartner && !isPaidResubmission && body.paymentMode === 2 && !isFree) {
          partnerWallet = await walletService.resolveWallet(userId, tenantId, requesterIdentity);
          adminWallet = await walletService.resolveWallet(null, tenantId, 'ADMIN');
        }
        let app;
        if (isPaidResubmission) {
          app = await tx.membershipApplication.update({
            where: { id: existingApplication.id },
            data: { ...mappedData, status: 'PENDING', createdById: userId }
          });
        } else if (existingApplication && existingApplication.status === 'PAYMENT_PENDING') {
          // Update the existing application instead of creating a new one
          app = await tx.membershipApplication.update({
            where: { id: existingApplication.id },
            data: { 
              ...mappedData, 
              createdById: userId,
              paymentType: isFree ? 'ADMIN_BYPASS' : (body.paymentMode === 2 ? 'WALLET' : 'RAZORPAY'),
              tnxStatus: isFree ? 1 : 0
            }
          });

          // Delete old documents as they will be recreated
          await tx.membershipDocument.deleteMany({
            where: { applicationId: app.id }
          });
          
          // Delete old payment if it exists and is pending (to be replaced by new Razorpay order if needed)
          if (existingApplication.payment && existingApplication.payment.status === 'PENDING') {
            await tx.membershipPayment.delete({
              where: { id: existingApplication.payment.id }
            });
          }
        } else {
          const initialStatus = (isFree || (isMethod2 && body.paymentMode !== 1)) ? 'PENDING' : 'PAYMENT_PENDING';
          app = await tx.membershipApplication.create({
            data: {
              id: generateUuid(),
              userId: targetUserId,
              ...mappedData,
              status: initialStatus,
              createdById: userId,
              paymentType: isFree ? 'ADMIN_BYPASS' : (body.paymentMode === 2 ? 'WALLET' : 'RAZORPAY'),
              tnxStatus: isFree ? 1 : 0
            }
          });
        }

        // Create documents
        if (body.documents && body.documents.length > 0) {
          const documentData = body.documents.map(doc => ({
            id: generateUuid(),
            applicationId: app.id,
            documentTypeId: doc.documentTypeId || doc.id || doc.type || "1", // Fallback mapping
            documentNumber: doc.documentNumber || "N/A",
            frontImageUrl: doc.frontImageUrl || doc.documentUrl || "",
            backImageUrl: doc.backImageUrl || null
          }));

          await tx.membershipDocument.createMany({
            data: documentData
          });
        }

        // Record wallet transaction history for Partner
        if (partnerWallet && adminWallet && body.paymentMode === 2 && !isFree) {
          await walletService.payCreationFeeWithHistory(
            partnerWallet.id,
            adminWallet.id,
            config.membershipPrice,
            `Membership Upgrade for ${mappedData.firstName} (User ID: ${targetUserId})`,
            app.id,
            tenantId,
            'WALLET',
            tx,
            false // creditAdminImmediately = false (Wait for approval)
          );
        }

        return app;
      }, {
        maxWait: 10000, // 10 seconds to wait to acquire transaction
        timeout: 20000  // 20 seconds for the transaction to complete
      });

      application = result;

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

      // For Method 2 (Wallet or Cash), we mark payment as success immediately
      if (isMethod2 && body.paymentMode !== 1) {
        const isCash = body.paymentMode === 3;
        const paymentTypeStr = isCash ? 'CASH' : 'WALLET';

        await prisma.membershipPayment.create({
          data: {
            id: generateUuid(),
            applicationId: application.id,
            razorpayOrderId: `${paymentTypeStr.toLowerCase()}_${application.id.slice(0, 20)}`,
            amount: config.membershipPrice,
            currency: config.currency,
            status: 'SUCCESS',
            paidAt: new Date()
          }
        });

        await logAction({
          userId,
          action: `MEMBERSHIP_APPLICATION_CREATED_${paymentTypeStr}`,
          targetId: application.id,
          metadata: { amount: config.membershipPrice, targetUserId }
        });

        return res.status(201).json({
          success: true,
          message: `Membership application created successfully via ${paymentTypeStr.toLowerCase()} payment.`,
          data: {
            applicationId: application.id,
            status: 'PENDING'
          }
        });
      }

      // Method 1 (Razorpay)
      const receipt = `member_${application.id.slice(0, 28)}`;
      const order = await razorpayService.createOrder(
        tenantId,
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
          key: await razorpayService.getKeyId(tenantId)
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
      // Find the application (Admins can verify any app, Users only their own)
      const AUTHORIZED_CREATOR_ROLES = [
        'SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN',
        'COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'
      ];
      const isPrivileged = AUTHORIZED_CREATOR_ROLES.includes(req.user.identity);

      const application = await prisma.membershipApplication.findFirst({
        where: {
          id: applicationId,
          ...(isPrivileged ? {} : { userId }) // Strict check only for regular users
        },
        include: {
          payment: true,
          user: true
        }
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: "Application not found or access denied."
        });
      }

      if (!application.payment) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found"
        });
      }

      // Verify signature
      const isValid = await razorpayService.verifyPaymentSignature(
        application.user.tenantId,
        {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature
        }
      );

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

      // Update application status to PENDING (submitted for review)
      await prisma.membershipApplication.update({
        where: { id: application.id },
        data: { status: 'PENDING' }
      });

      // NEW: Log Razorpay payment in Wallet History (Log only, DO NOT credit Admin here)
      try {
        const partnerId = application.createdById || application.userId;
        const partner = await prisma.user.findUnique({ where: { id: partnerId } });
        const partnerWallet = await walletService.resolveWallet(partnerId, tenantId, partner?.identity);
        
        if (partnerWallet) {
          await prisma.walletTransaction.create({
            data: {
              id: generateUuid(),
              walletId: partnerWallet.id,
              amount: application.payment.amount,
              type: "DEBIT",
              category: "SERVICE_CHARGE",
              description: `Membership Application Fee (Paid via RAZORPAY - Pending Approval)`,
              referenceId: application.id,
              tenantId: tenantId
            }
          });
        }
      } catch (logErr) {
        console.error("Failed to log Membership Razorpay log:", logErr);
      }

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

      // Enrich application with location names
      const enrichedApplication = { ...application };
      
      const [currCountry, currState, currDistrict, currMun] = await Promise.all([
        application.currentCountry ? prisma.country.findUnique({ where: { id: application.currentCountry } }) : null,
        application.currentState ? prisma.state.findUnique({ where: { id: application.currentState } }) : null,
        application.currentDistrict ? prisma.district.findUnique({ where: { id: application.currentDistrict } }) : null,
        application.currentMunicipality ? prisma.municipality.findUnique({ where: { id: application.currentMunicipality } }) : null
      ]);

      const [permCountry, permState, permDistrict, permMun] = await Promise.all([
        application.permanentCountry ? prisma.country.findUnique({ where: { id: application.permanentCountry } }) : null,
        application.permanentState ? prisma.state.findUnique({ where: { id: application.permanentState } }) : null,
        application.permanentDistrict ? prisma.district.findUnique({ where: { id: application.permanentDistrict } }) : null,
        application.permanentMunicipality ? prisma.municipality.findUnique({ where: { id: application.permanentMunicipality } }) : null
      ]);

      enrichedApplication.currentCountryName = currCountry?.name || application.currentCountry;
      enrichedApplication.currentStateName = currState?.name || application.currentState;
      enrichedApplication.currentDistrictName = currDistrict?.name || application.currentDistrict;
      enrichedApplication.currentMunicipalityName = currMun?.name || application.currentMunicipality;

      enrichedApplication.permanentCountryName = permCountry?.name || application.permanentCountry;
      enrichedApplication.permanentStateName = permState?.name || application.permanentState;
      enrichedApplication.permanentDistrictName = permDistrict?.name || application.permanentDistrict;
      enrichedApplication.permanentMunicipalityName = permMun?.name || application.permanentMunicipality;

      res.json({
        success: true,
        data: enrichedApplication
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
