const imeService = require('./ime.service');
const { getImeResponseMeta } = require('./ime.controller');

/**
 * IME Transaction Middleware - Complete Send Transaction Flow
 * Handles: CheckCustomer → GetCalculation → SendTransaction → SendOTP → ConfirmSendTransaction
 */

const validateTransactionRequest = (req, res, next) => {
  const required = [
    'senderMobileNo',
    'receiverName', 
    'receiverAddress',
    'receiverMobileNo',
    'receiverState',
    'receiverDistrict',
    'receiverMunicipality',
    'remitAmount',
    'sourceOfFund',
    'relationship',
    'purposeOfRemittance',
    'paymentType'
  ];

  const missing = required.filter(field => !req.body[field]);
  if (missing.length) {
    return res.status(400).json({
      success: false,
      message: 'Missing required transaction fields',
      missing
    });
  }

  // Validate payment type
  if (!['C', 'B'].includes(req.body.paymentType)) {
    return res.status(400).json({
      success: false,
      message: 'PaymentType must be C (Cash) or B (Bank)'
    });
  }

  // If bank payment, validate bank details
  if (req.body.paymentType === 'B') {
    const bankRequired = ['bankId', 'bankBranchId', 'bankAccountNumber'];
    const bankMissing = bankRequired.filter(field => !req.body[field]);
    if (bankMissing.length) {
      return res.status(400).json({
        success: false,
        message: 'Bank details required for bank payment',
        missing: bankMissing
      });
    }
  }

  next();
};

/**
 * Complete Transaction Flow
 * This middleware handles the entire IME transaction process
 */
const sendTransactionMiddleware = async (req, res) => {
  try {
    const {
      senderMobileNo,
      receiverName,
      receiverAddress,
      receiverMobileNo,
      receiverState,
      receiverDistrict,
      receiverMunicipality,
      receiverCity,
      remitAmount,
      sourceOfFund,
      relationship,
      purposeOfRemittance,
      paymentType,
      bankId,
      bankBranchId,
      bankAccountNumber,
      calcBy = 'C',
      autoConfirmOTP = false,
      otp
    } = req.body;

    // Generate unique session ID for this transaction
    const agentSessionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // STEP 1: Check Customer (Sender) Eligibility
    console.log('Step 1: Checking customer eligibility...');
    const customerCheckResult = await imeService.checkCustomer({
      MobileNo: senderMobileNo,
      AgentSessionId: agentSessionId
    });

    const customerMeta = getImeResponseMeta(customerCheckResult);
    if (customerMeta.code !== '0') {
      return res.status(400).json({
        success: false,
        message: 'Customer check failed',
        imeCode: customerMeta.code,
        error: customerMeta.message
      });
    }

    // Check if customer is eligible for transactions
    const customerData = getImePayload(customerCheckResult);
    if (customerData.AMLStatus !== 'True' || customerData.KYCStatus !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'Customer not eligible for transactions',
        amlStatus: customerData.AMLStatus,
        kycStatus: customerData.KYCStatus
      });
    }

    // STEP 2: Get Exchange Rate and Forex Session ID
    console.log('Step 2: Getting exchange rate...');
    const calculationResult = await imeService.getCalculation({
      RemitAmount: remitAmount,
      PaymentType: paymentType,
      PayoutCountry: 'NPL',
      CalcBy: calcBy,
      PayoutAgentId: paymentType === 'B' ? bankId : undefined,
      AgentSessionId: agentSessionId
    });

    const calculationMeta = getImeResponseMeta(calculationResult);
    if (calculationMeta.code !== '0') {
      return res.status(400).json({
        success: false,
        message: 'Failed to get exchange rate',
        imeCode: calculationMeta.code,
        error: calculationMeta.message
      });
    }

    const calculationData = getImePayload(calculationResult);
    const { ForexSessionId, CollectAmount, ServiceCharge, ExchangeRate, PayoutAmount } = calculationData;

    // STEP 3: Send Transaction
    console.log('Step 3: Creating transaction...');
    const transactionData = {
      ForexSessionId,
      AgentTxnRefId: agentSessionId,
      CollectAmount,
      PayoutAmount,
      SenderName: customerData.Name || senderMobileNo,
      SenderMobileNo: senderMobileNo,
      Occupation: customerData.Occupation || '8081',
      ReceiverName: receiverName,
      ReceiverAddress: receiverAddress,
      ReceiverGender: 'Male', // Default, can be made configurable
      ReceiverMobileNo: receiverMobileNo,
      ReceiverCity: receiverCity || '',
      ReceiverCountry: 'NPL',
      ReceiverState: receiverState,
      ReceiverDistrict: receiverDistrict,
      ReceiverMunicipality: receiverMunicipality,
      SourceOfFund: sourceOfFund,
      Relationship: relationship,
      PurposeOfRemittance: purposeOfRemittance,
      PaymentType: paymentType,
      CalcBy: calcBy,
      AgentSessionId: agentSessionId
    };

    // Add bank details if payment type is bank
    if (paymentType === 'B') {
      transactionData.BankId = bankId;
      transactionData.BankBranchId = bankBranchId;
      transactionData.BankAccountNumber = bankAccountNumber;
    }

    const sendTransactionResult = await imeService.sendTransaction(transactionData);
    const sendTransactionMeta = getImeResponseMeta(sendTransactionResult);

    if (sendTransactionMeta.code !== '0') {
      return res.status(400).json({
        success: false,
        message: 'Failed to create transaction',
        imeCode: sendTransactionMeta.code,
        error: sendTransactionMeta.message
      });
    }

    const transactionPayload = getImePayload(sendTransactionResult);
    const { RefNo } = transactionPayload;

    // STEP 4: Send OTP for Transaction
    console.log('Step 4: Sending OTP...');
    const otpResult = await imeService.sendOTP({
      Module: 'ST',
      ReferenceValue: RefNo,
      AgentSessionId: agentSessionId
    });

    const otpMeta = getImeResponseMeta(otpResult);
    if (otpMeta.code !== '0') {
      return res.status(400).json({
        success: false,
        message: 'Failed to send OTP',
        imeCode: otpMeta.code,
        error: otpMeta.message
      });
    }

    const otpPayload = getImePayload(otpResult);
    const { OTPToken } = otpPayload;

    // If autoConfirmOTP is true and OTP is provided, confirm the transaction
    if (autoConfirmOTP && otp) {
      console.log('Step 5: Auto-confirming transaction...');
      const confirmResult = await imeService.confirmSendTransaction({
        RefNo,
        OTPToken,
        OTP: otp,
        AgentSessionId: agentSessionId
      });

      const confirmMeta = getImeResponseMeta(confirmResult);
      if (confirmMeta.code !== '0') {
        return res.status(400).json({
          success: false,
          message: 'Failed to confirm transaction',
          imeCode: confirmMeta.code,
          error: confirmMeta.message,
          transaction: {
            refNo: RefNo,
            collectAmount: CollectAmount,
            payoutAmount: PayoutAmount,
            serviceCharge: ServiceCharge,
            exchangeRate: ExchangeRate,
            status: 'OTP_SENT'
          }
        });
      }

      const confirmPayload = getImePayload(confirmResult);
      const { RefNo: ICN } = confirmPayload;

      return res.json({
        success: true,
        message: 'Transaction completed successfully',
        transaction: {
          icn: ICN,
          refNo: RefNo,
          collectAmount: CollectAmount,
          payoutAmount: PayoutAmount,
          serviceCharge: ServiceCharge,
          exchangeRate: ExchangeRate,
          status: 'COMPLETED'
        },
        customer: {
          name: customerData.Name,
          mobileNo: customerData.MobileNo,
          amlStatus: customerData.AMLStatus,
          kycStatus: customerData.KYCStatus
        }
      });
    }

    // Return transaction details for manual OTP confirmation
    return res.json({
      success: true,
      message: 'Transaction created successfully. OTP sent to customer mobile.',
      transaction: {
        refNo: RefNo,
        collectAmount: CollectAmount,
        payoutAmount: PayoutAmount,
        serviceCharge: ServiceCharge,
        exchangeRate: ExchangeRate,
        status: 'OTP_SENT',
        otpToken: OTPToken
      },
      customer: {
        name: customerData.Name,
        mobileNo: customerData.MobileNo,
        amlStatus: customerData.AMLStatus,
        kycStatus: customerData.KYCStatus
      },
      nextSteps: {
        action: 'CONFIRM_OTP',
        endpoint: '/api/ime/transactions/confirm',
        required: {
          refNo: RefNo,
          otpToken: OTPToken,
          otp: '6-digit OTP from customer mobile'
        }
      }
    });

  } catch (error) {
    console.error('Transaction middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Transaction failed',
      error: error.message
    });
  }
};

/**
 * Confirm Transaction with OTP
 */
const confirmTransactionMiddleware = async (req, res) => {
  try {
    const { refNo, otpToken, otp } = req.body;

    if (!refNo || !otpToken || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: refNo, otpToken, otp'
      });
    }

    const agentSessionId = `CONFIRM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const confirmResult = await imeService.confirmSendTransaction({
      RefNo: refNo,
      OTPToken: otpToken,
      OTP: otp,
      AgentSessionId: agentSessionId
    });

    const confirmMeta = getImeResponseMeta(confirmResult);
    if (confirmMeta.code !== '0') {
      return res.status(400).json({
        success: false,
        message: 'Failed to confirm transaction',
        imeCode: confirmMeta.code,
        error: confirmMeta.message
      });
    }

    const confirmPayload = getImePayload(confirmResult);
    const { RefNo: ICN } = confirmPayload;

    return res.json({
      success: true,
      message: 'Transaction confirmed successfully',
      transaction: {
        icn: ICN,
        refNo: refNo,
        status: 'COMPLETED'
      },
      instructions: {
        message: 'Share the ICN with the beneficiary to collect money in Nepal',
        icnExpiry: 'ICN expires in 7 days as per RBI guidelines'
      }
    });

  } catch (error) {
    console.error('Confirm transaction error:', error);
    return res.status(500).json({
      success: false,
      message: 'Transaction confirmation failed',
      error: error.message
    });
  }
};

module.exports = {
  validateTransactionRequest,
  sendTransactionMiddleware,
  confirmTransactionMiddleware
};
