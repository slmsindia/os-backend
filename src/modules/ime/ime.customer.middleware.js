const imeService = require('./ime.service');
const { getImeResponseMeta } = require('./ime.controller');

/**
 * IME Customer Registration Middleware
 * Handles: CustomerRegistration → SendOTP → ConfirmCustomerRegistration
 */

const validateCustomerRegistrationRequest = (req, res, next) => {
  const { CustomerDetails, PermanentAddresss, TemporaryAddress, IdentityDetails } = req.body;

  // Validate CustomerDetails
  if (!CustomerDetails) {
    return res.status(400).json({
      success: false,
      message: 'CustomerDetails is required'
    });
  }

  const customerRequired = [
    'MobileNo',
    'FirstName', 
    'LastName',
    'Nationality',
    'MaritalStatus',
    'DOB',
    'Gender',
    'FatherOrMotherName',
    'Occupation'
  ];

  const missingCustomer = customerRequired.filter(field => !CustomerDetails[field]);
  if (missingCustomer.length) {
    return res.status(400).json({
      success: false,
      message: 'Missing required CustomerDetails fields',
      missing: missingCustomer
    });
  }

  // Validate PermanentAddresss
  if (!PermanentAddresss) {
    return res.status(400).json({
      success: false,
      message: 'PermanentAddresss is required'
    });
  }

  const permanentRequired = ['State', 'District', 'Address'];
  const missingPermanent = permanentRequired.filter(field => !PermanentAddresss[field]);
  if (missingPermanent.length) {
    return res.status(400).json({
      success: false,
      message: 'Missing required PermanentAddresss fields',
      missing: missingPermanent
    });
  }

  // Validate TemporaryAddress
  if (!TemporaryAddress) {
    return res.status(400).json({
      success: false,
      message: 'TemporaryAddress is required'
    });
  }

  const tempRequired = ['State', 'District', 'Address'];
  const missingTemp = tempRequired.filter(field => !TemporaryAddress[field]);
  if (missingTemp.length) {
    return res.status(400).json({
      success: false,
      message: 'Missing required TemporaryAddress fields',
      missing: missingTemp
    });
  }

  // Validate IdentityDetails
  if (!IdentityDetails) {
    return res.status(400).json({
      success: false,
      message: 'IdentityDetails is required'
    });
  }

  const identityRequired = ['IdType', 'IdNo', 'IssueDate', 'IdData', 'IdDataType'];
  const missingIdentity = identityRequired.filter(field => !IdentityDetails[field]);
  if (missingIdentity.length) {
    return res.status(400).json({
      success: false,
      message: 'Missing required IdentityDetails fields',
      missing: missingIdentity
    });
  }

  // Validate ID data is base64
  if (IdentityDetails.IdData && !IdentityDetails.IdData.startsWith('data:')) {
    return res.status(400).json({
      success: false,
      message: 'IdData must be a base64 encoded string'
    });
  }

  next();
};

/**
 * Complete Customer Registration Flow
 * Handles: CustomerRegistration → SendOTP → ConfirmCustomerRegistration
 */
const registerCustomerMiddleware = async (req, res) => {
  try {
    const { CustomerDetails, PermanentAddresss, TemporaryAddress, IdentityDetails, autoConfirmOTP = false, otp } = req.body;

    // Generate unique session ID for this registration
    const agentSessionId = `REG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // STEP 1: Customer Registration
    console.log('Step 1: Registering customer...');
    const registrationData = {
      CustomerDetails: {
        ...CustomerDetails,
        MembershipId: CustomerDetails.MembershipId || ''
      },
      PermanentAddresss,
      TemporaryAddress,
      IdentityDetails,
      AgentSessionId: agentSessionId
    };

    const registrationResult = await imeService.createCustomer(registrationData);
    const registrationMeta = getImeResponseMeta(registrationResult);

    if (registrationMeta.code !== '0') {
      let errorMessage = registrationMeta.message || 'Customer registration failed in IME';
      
      switch (registrationMeta.code) {
        case '503':
          errorMessage = 'Parameter Missing - Required field is missing';
          break;
        case '504':
          errorMessage = 'Bad Request (Invalid Input Value) - Invalid data provided';
          break;
        case '901':
          errorMessage = 'Technical Error - Server-side error occurred';
          break;
        case '999':
          errorMessage = 'Internal Server Error - Serious server error';
          break;
      }

      return res.status(400).json({
        success: false,
        message: errorMessage,
        imeCode: registrationMeta.code,
        error: registrationMeta.code
      });
    }

    const registrationPayload = getImePayload(registrationResult);
    const { CustomerToken } = registrationPayload;

    // STEP 2: Send OTP for Customer Registration
    console.log('Step 2: Sending OTP for customer registration...');
    const otpResult = await imeService.sendOTP({
      Module: 'CR',
      ReferenceValue: CustomerToken,
      AgentSessionId: agentSessionId
    });

    const otpMeta = getImeResponseMeta(otpResult);
    if (otpMeta.code !== '0') {
      return res.status(400).json({
        success: false,
        message: 'Failed to send OTP for customer registration',
        imeCode: otpMeta.code,
        error: otpMeta.message,
        customerToken: CustomerToken
      });
    }

    const otpPayload = getImePayload(otpResult);
    const { OTPToken } = otpPayload;

    // If autoConfirmOTP is true and OTP is provided, confirm the registration
    if (autoConfirmOTP && otp) {
      console.log('Step 3: Auto-confirming customer registration...');
      const confirmResult = await imeService.confirmCustomerRegistration({
        OTP: otp,
        CustomerToken,
        OTPToken,
        AgentSessionId: agentSessionId
      });

      const confirmMeta = getImeResponseMeta(confirmResult);
      if (confirmMeta.code !== '0') {
        return res.status(400).json({
          success: false,
          message: 'Failed to confirm customer registration',
          imeCode: confirmMeta.code,
          error: confirmMeta.message,
          customerToken: CustomerToken,
          status: 'OTP_SENT'
        });
      }

      return res.json({
        success: true,
        message: 'Customer registration completed successfully',
        customer: {
          customerToken: CustomerToken,
          mobileNo: CustomerDetails.MobileNo,
          firstName: CustomerDetails.FirstName,
          lastName: CustomerDetails.LastName,
          status: 'REGISTERED'
        }
      });
    }

    // Return customer registration details for manual OTP confirmation
    return res.json({
      success: true,
      message: 'Customer registration initiated successfully. OTP sent to customer mobile.',
      customer: {
        customerToken: CustomerToken,
        mobileNo: CustomerDetails.MobileNo,
        firstName: CustomerDetails.FirstName,
        lastName: CustomerDetails.LastName,
        status: 'OTP_SENT'
      },
      nextSteps: {
        action: 'CONFIRM_OTP',
        endpoint: '/api/ime/customers/confirm-registration',
        required: {
          customerToken: CustomerToken,
          otpToken: OTPToken,
          otp: '6-digit OTP from customer mobile'
        }
      }
    });

  } catch (error) {
    console.error('Customer registration middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Customer registration failed',
      error: error.message
    });
  }
};

/**
 * Confirm Customer Registration with OTP
 */
const confirmCustomerRegistrationMiddleware = async (req, res) => {
  try {
    const { customerToken, otpToken, otp } = req.body;

    if (!customerToken || !otpToken || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customerToken, otpToken, otp'
      });
    }

    const agentSessionId = `CONFIRM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const confirmResult = await imeService.confirmCustomerRegistration({
      OTP: otp,
      CustomerToken: customerToken,
      OTPToken: otpToken,
      AgentSessionId: agentSessionId
    });

    const confirmMeta = getImeResponseMeta(confirmResult);
    if (confirmMeta.code !== '0') {
      return res.status(400).json({
        success: false,
        message: 'Failed to confirm customer registration',
        imeCode: confirmMeta.code,
        error: confirmMeta.message
      });
    }

    return res.json({
      success: true,
      message: 'Customer registration confirmed successfully',
      customer: {
        customerToken: customerToken,
        status: 'REGISTERED'
      }
    });

  } catch (error) {
    console.error('Confirm customer registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Customer registration confirmation failed',
      error: error.message
    });
  }
};

/**
 * Check Customer Eligibility
 */
const checkCustomerEligibilityMiddleware = async (req, res) => {
  try {
    const { mobileNo } = req.body;

    if (!mobileNo) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required'
      });
    }

    const agentSessionId = `CHECK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const checkResult = await imeService.checkCustomer({
      MobileNo: mobileNo,
      AgentSessionId: agentSessionId
    });

    const checkMeta = getImeResponseMeta(checkResult);
    if (checkMeta.code !== '0') {
      return res.status(400).json({
        success: false,
        message: 'Customer check failed',
        imeCode: checkMeta.code,
        error: checkMeta.message
      });
    }

    const customerData = getImePayload(checkResult);
    
    return res.json({
      success: true,
      message: 'Customer eligibility checked successfully',
      customer: {
        name: customerData.Name,
        mobileNo: customerData.MobileNo,
        amlStatus: customerData.AMLStatus,
        kycStatus: customerData.KYCStatus,
        rejectedReason: customerData.RejectedReason,
        newMobileNo: customerData.NewMobileNo,
        amendmentStatus: customerData.AmendmentStatus,
        amendmentMessage: customerData.AmendmentMessage
      },
      eligible: customerData.AMLStatus === 'True' && customerData.KYCStatus === 'Approved'
    });

  } catch (error) {
    console.error('Check customer eligibility error:', error);
    return res.status(500).json({
      success: false,
      message: 'Customer eligibility check failed',
      error: error.message
    });
  }
};

module.exports = {
  validateCustomerRegistrationRequest,
  registerCustomerMiddleware,
  confirmCustomerRegistrationMiddleware,
  checkCustomerEligibilityMiddleware
};
