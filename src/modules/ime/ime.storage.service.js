const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * IME Data Storage Service
 * Handles saving all IME API responses to database tables
 */

class ImeStorageService {
  /**
   * Save IME API log entry
   */
  async saveApiLog(operation, endpointPath, requestMethod, requestPayload, responsePayload, statusCode, success, errorMessage = null, durationMs = null, userId = null, tenantId = null, ipAddress = null, userAgent = null) {
    try {
      // Extract IME response code and message from response
      let imeResponseCode = null;
      let imeResponseMessage = null;
      
      if (responsePayload && responsePayload.data) {
        const body = this.extractSoapBody(responsePayload);
        const firstKey = Object.keys(body)[0];
        const payload = firstKey ? body[firstKey] : {};
        const response = payload?.Response || {};
        
        imeResponseCode = String(response.Code || '');
        imeResponseMessage = String(response.Message || '');
      }

      await prisma.imeApiLog.create({
        data: {
          operation,
          endpointPath,
          requestMethod,
          requestPayload,
          responsePayload: {
            ...responsePayload,
            data: Array.isArray(responsePayload.data) 
              ? responsePayload.data.map(item => item === undefined ? null : item)
              : responsePayload.data
          },
          statusCode,
          imeResponseCode,
          imeResponseMessage,
          success,
          errorMessage,
          durationMs,
          userId,
          tenantId,
          ipAddress,
          userAgent
        }
      });
    } catch (error) {
      console.error('Error saving IME API log:', error);
    }
  }

  /**
   * Save static data from GetStaticData API
   */
  async saveStaticData(typeCode, reference, dataList, agentSessionId = null) {
    try {
      if (!Array.isArray(dataList)) return;

      for (const item of dataList) {
        await prisma.imeStaticData.upsert({
          where: {
            typeCode_dataId: {
              typeCode,
              dataId: String(item.Id || item.id)
            }
          },
          update: {
            dataValue: String(item.Value || item.value || ''),
            reference: reference || null,
            isActive: true,
            updatedAt: new Date()
          },
          create: {
            typeCode,
            reference: reference || null,
            dataId: String(item.Id || item.id),
            dataValue: String(item.Value || item.value || ''),
            agentSessionId
          }
        });
      }
    } catch (error) {
      console.error('Error saving IME static data:', error);
    }
  }

  /**
   * Save customer data from CustomerRegistration API
   */
  async saveCustomer(customerData, apiResponse, agentSessionId = null) {
    try {
      const response = this.extractImeResponse(apiResponse);
      
      await prisma.imeCustomer.upsert({
        where: {
          mobileNumber: customerData.mobileNumber
        },
        update: {
          firstName: customerData.firstName,
          middleName: customerData.middleName || null,
          lastName: customerData.lastName,
          gender: customerData.gender,
          dateOfBirth: customerData.dateOfBirth,
          nationality: customerData.nationality,
          maritalStatus: customerData.maritalStatus,
          fatherOrMotherName: customerData.fatherOrMotherName,
          email: customerData.email || null,
          occupation: customerData.occupation,
          sourceOfFund: customerData.sourceOfFund || null,
          idType: customerData.idType,
          idNumber: customerData.idNumber,
          idPlaceOfIssue: customerData.idPlaceOfIssue || null,
          idIssueDate: customerData.idIssueDate,
          idExpiryDate: customerData.idExpiryDate || null,
          idData: customerData.idData || null,
          idDataType: customerData.idDataType || null,
          photoData: customerData.photoData || null,
          photoDataType: customerData.photoDataType || null,
          permanentState: customerData.permanentState,
          permanentDistrict: customerData.permanentDistrict,
          permanentMunicipality: customerData.permanentMunicipality || null,
          permanentAddress: customerData.permanentAddress,
          permanentWardNo: customerData.permanentWardNo || null,
          permanentHouseNo: customerData.permanentHouseNo || null,
          permanentPostalCode: customerData.permanentPostalCode || null,
          temporaryState: customerData.temporaryState,
          temporaryDistrict: customerData.temporaryDistrict,
          temporaryAddress: customerData.temporaryAddress,
          temporaryPostalCode: customerData.temporaryPostalCode || null,
          temporaryHouseNo: customerData.temporaryHouseNo || null,
          customerToken: response.customerToken || null,
          imeResponseCode: response.code || null,
          imeResponseMessage: response.message || null,
          agentSessionId,
          updatedAt: new Date()
        },
        create: {
          customerId: response.customerId || null,
          membershipId: customerData.membershipId || null,
          mobileNumber: customerData.mobileNumber,
          firstName: customerData.firstName,
          middleName: customerData.middleName || null,
          lastName: customerData.lastName,
          gender: customerData.gender,
          dateOfBirth: customerData.dateOfBirth,
          nationality: customerData.nationality,
          maritalStatus: customerData.maritalStatus,
          fatherOrMotherName: customerData.fatherOrMotherName,
          email: customerData.email || null,
          occupation: customerData.occupation,
          sourceOfFund: customerData.sourceOfFund || null,
          idType: customerData.idType,
          idNumber: customerData.idNumber,
          idPlaceOfIssue: customerData.idPlaceOfIssue || null,
          idIssueDate: customerData.idIssueDate,
          idExpiryDate: customerData.idExpiryDate || null,
          idData: customerData.idData || null,
          idDataType: customerData.idDataType || null,
          photoData: customerData.photoData || null,
          photoDataType: customerData.photoDataType || null,
          permanentState: customerData.permanentState,
          permanentDistrict: customerData.permanentDistrict,
          permanentMunicipality: customerData.permanentMunicipality || null,
          permanentAddress: customerData.permanentAddress,
          permanentWardNo: customerData.permanentWardNo || null,
          permanentHouseNo: customerData.permanentHouseNo || null,
          permanentPostalCode: customerData.permanentPostalCode || null,
          temporaryState: customerData.temporaryState,
          temporaryDistrict: customerData.temporaryDistrict,
          temporaryAddress: customerData.temporaryAddress,
          temporaryPostalCode: customerData.temporaryPostalCode || null,
          temporaryHouseNo: customerData.temporaryHouseNo || null,
          customerToken: response.customerToken || null,
          imeResponseCode: response.code || null,
          imeResponseMessage: response.message || null,
          agentSessionId
        }
      });
    } catch (error) {
      console.error('Error saving IME customer:', error);
    }
  }

  /**
   * Save receiver data from CustomerRegistration (as receiver) API
   */
  async saveReceiver(receiverData, apiResponse, agentSessionId = null) {
    try {
      const response = this.extractImeResponse(apiResponse);
      
      await prisma.imeReceiver.upsert({
        where: {
          receiverId: response.receiverId || undefined
        },
        update: {
          customerId: receiverData.customerId || null,
          firstName: receiverData.firstName,
          middleName: receiverData.middleName || null,
          lastName: receiverData.lastName,
          fullName: receiverData.fullName || null,
          mobileNumber: receiverData.mobileNumber,
          gender: receiverData.gender || null,
          relationship: receiverData.relationship || null,
          paymentMode: receiverData.paymentMode || null,
          bankCode: receiverData.bankCode || null,
          bankBranchId: receiverData.bankBranchId || null,
          accountNumber: receiverData.accountNumber || null,
          address: receiverData.address || null,
          state: receiverData.state || null,
          district: receiverData.district || null,
          municipality: receiverData.municipality || null,
          imeResponseCode: response.code || null,
          imeResponseMessage: response.message || null,
          agentSessionId,
          updatedAt: new Date()
        },
        create: {
          receiverId: response.receiverId || null,
          customerId: receiverData.customerId || null,
          firstName: receiverData.firstName,
          middleName: receiverData.middleName || null,
          lastName: receiverData.lastName,
          fullName: receiverData.fullName || null,
          mobileNumber: receiverData.mobileNumber,
          gender: receiverData.gender || null,
          relationship: receiverData.relationship || null,
          paymentMode: receiverData.paymentMode || null,
          bankCode: receiverData.bankCode || null,
          bankBranchId: receiverData.bankBranchId || null,
          accountNumber: receiverData.accountNumber || null,
          address: receiverData.address || null,
          state: receiverData.state || null,
          district: receiverData.district || null,
          municipality: receiverData.municipality || null,
          imeResponseCode: response.code || null,
          imeResponseMessage: response.message || null,
          agentSessionId
        }
      });
    } catch (error) {
      console.error('Error saving IME receiver:', error);
    }
  }

  /**
   * Save transaction data from SendTransaction API
   */
  async saveTransaction(transactionData, apiResponse, agentSessionId = null) {
    try {
      const response = this.extractImeResponse(apiResponse);
      
      await prisma.imeTransaction.create({
        data: {
          transactionId: response.transactionId || null,
          agentTxnRefId: transactionData.agentTxnRefId || null,
          icn: response.icn || null,
          forexSessionId: transactionData.forexSessionId || null,
          senderCustomerId: transactionData.senderCustomerId || null,
          senderName: transactionData.senderName,
          senderMobile: transactionData.senderMobile,
          receiverCustomerId: transactionData.receiverCustomerId || null,
          receiverId: transactionData.receiverId || null,
          receiverName: transactionData.receiverName,
          receiverMobile: transactionData.receiverMobile,
          receiverAddress: transactionData.receiverAddress || null,
          receiverGender: transactionData.receiverGender || null,
          receiverCountry: transactionData.receiverCountry || 'NPL',
          receiverState: transactionData.receiverState || null,
          receiverDistrict: transactionData.receiverDistrict || null,
          receiverMunicipality: transactionData.receiverMunicipality || null,
          collectAmount: transactionData.collectAmount ? parseFloat(transactionData.collectAmount) : null,
          payoutAmount: transactionData.payoutAmount ? parseFloat(transactionData.payoutAmount) : null,
          sendAmount: transactionData.sendAmount ? parseFloat(transactionData.sendAmount) : null,
          serviceCharge: transactionData.serviceCharge ? parseFloat(transactionData.serviceCharge) : null,
          exchangeRate: transactionData.exchangeRate ? parseFloat(transactionData.exchangeRate) : null,
          sourceCurrency: transactionData.sourceCurrency || 'INR',
          destinationCurrency: transactionData.destinationCurrency || 'NPR',
          paymentMode: transactionData.paymentMode || null,
          purposeOfRemittance: transactionData.purposeOfRemittance || null,
          sourceOfFund: transactionData.sourceOfFund || null,
          relationship: transactionData.relationship || null,
          bankCode: transactionData.bankCode || null,
          bankBranchId: transactionData.bankBranchId || null,
          bankAccountNumber: transactionData.bankAccountNumber || null,
          status: response.code === '0' ? 'Success' : 'Failed',
          responseCode: response.code || null,
          responseMessage: response.message || null,
          otpProcessId: response.otpProcessId || null,
          imeResponsePayload: apiResponse,
          requestPayload: transactionData,
          agentSessionId
        }
      });
    } catch (error) {
      console.error('Error saving IME transaction:', error);
    }
  }

  /**
   * Save OTP log from SendOTP API
   */
  async saveOtpLog(mobileNumber, module, referenceValue, otpToken, apiResponse, agentSessionId = null) {
    try {
      const response = this.extractImeResponse(apiResponse);
      
      await prisma.imeOtpLog.create({
        data: {
          mobileNumber,
          module,
          referenceValue,
          otpToken: response.otpToken || otpToken,
          otpExpiryAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
          responseCode: response.code || null,
          responseMessage: response.message || null,
          agentSessionId
        }
      });
    } catch (error) {
      console.error('Error saving IME OTP log:', error);
    }
  }

  /**
   * Update OTP verification
   */
  async updateOtpVerification(mobileNumber, otp, isVerified = true) {
    try {
      await prisma.imeOtpLog.updateMany({
        where: {
          mobileNumber,
          otp,
          isVerified: false
        },
        data: {
          isVerified,
          verificationAttempt: { increment: 1 },
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error updating OTP verification:', error);
    }
  }

  /**
   * Save exchange rate data
   */
  async saveExchangeRate(sourceCurrency, destinationCurrency, exchangeRate, serviceCharge = null, apiResponse = null, agentSessionId = null) {
    try {
      const response = apiResponse ? this.extractImeResponse(apiResponse) : {};
      
      await prisma.imeExchangeRate.create({
        data: {
          sourceCurrency,
          destinationCurrency,
          exchangeRate: parseFloat(exchangeRate),
          serviceCharge: serviceCharge ? parseFloat(serviceCharge) : null,
          validFrom: new Date(),
          validTo: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours validity
          imeResponseCode: response.code || null,
          imeResponseMessage: response.message || null,
          agentSessionId
        }
      });
    } catch (error) {
      console.error('Error saving IME exchange rate:', error);
    }
  }

  /**
   * Save bank data
   */
  async saveBank(bankData, apiResponse = null, agentSessionId = null) {
    try {
      const response = apiResponse ? this.extractImeResponse(apiResponse) : {};
      
      await prisma.imeBank.upsert({
        where: {
          bankCode: bankData.bankCode
        },
        update: {
          bankId: bankData.bankId || null,
          bankName: bankData.bankName,
          country: bankData.country || 'NP',
          isActive: true,
          imeResponseCode: response.code || null,
          imeResponseMessage: response.message || null,
          agentSessionId,
          updatedAt: new Date()
        },
        create: {
          bankId: bankData.bankId || null,
          bankCode: bankData.bankCode,
          bankName: bankData.bankName,
          country: bankData.country || 'NP',
          imeResponseCode: response.code || null,
          imeResponseMessage: response.message || null,
          agentSessionId
        }
      });
    } catch (error) {
      console.error('Error saving IME bank:', error);
    }
  }

  /**
   * Save bank branch data
   */
  async saveBankBranch(branchData, apiResponse = null, agentSessionId = null) {
    try {
      const response = apiResponse ? this.extractImeResponse(apiResponse) : {};
      
      await prisma.imeBankBranch.upsert({
        where: {
          branchId: branchData.branchId || undefined
        },
        update: {
          bankId: branchData.bankId,
          bankCode: branchData.bankCode,
          branchName: branchData.branchName,
          branchCode: branchData.branchCode || null,
          state: branchData.state || null,
          district: branchData.district || null,
          city: branchData.city || null,
          isActive: true,
          imeResponseCode: response.code || null,
          imeResponseMessage: response.message || null,
          agentSessionId,
          updatedAt: new Date()
        },
        create: {
          branchId: branchData.branchId || null,
          bankId: branchData.bankId,
          bankCode: branchData.bankCode,
          branchName: branchData.branchName,
          branchCode: branchData.branchCode || null,
          state: branchData.state || null,
          district: branchData.district || null,
          city: branchData.city || null,
          imeResponseCode: response.code || null,
          imeResponseMessage: response.message || null,
          agentSessionId
        }
      });
    } catch (error) {
      console.error('Error saving IME bank branch:', error);
    }
  }

  /**
   * Save transaction history
   */
  async saveTransactionHistory(customerId, transactionData, apiResponse = null, agentSessionId = null) {
    try {
      const response = apiResponse ? this.extractImeResponse(apiResponse) : {};
      
      await prisma.imeTransactionHistory.create({
        data: {
          customerId,
          transactionId: transactionData.transactionId || null,
          senderName: transactionData.senderName,
          receiverName: transactionData.receiverName,
          receiverMobile: transactionData.receiverMobile,
          amount: parseFloat(transactionData.amount),
          serviceCharge: transactionData.serviceCharge ? parseFloat(transactionData.serviceCharge) : null,
          exchangeRate: transactionData.exchangeRate ? parseFloat(transactionData.exchangeRate) : null,
          status: transactionData.status || 'Unknown',
          transactionDate: transactionData.transactionDate || null,
          currency: transactionData.currency || 'NPR',
          imeResponseCode: response.code || null,
          imeResponseMessage: response.message || null,
          agentSessionId
        }
      });
    } catch (error) {
      console.error('Error saving IME transaction history:', error);
    }
  }

  /**
   * Update customer status from CheckCustomer API
   */
  async updateCustomerStatus(mobileNumber, statusData, apiResponse = null, agentSessionId = null) {
    try {
      const response = apiResponse ? this.extractImeResponse(apiResponse) : {};
      
      await prisma.imeCustomer.updateMany({
        where: {
          mobileNumber
        },
        data: {
          amlStatus: statusData.amlStatus || null,
          kycStatus: statusData.kycStatus || null,
          rejectionReason: statusData.rejectionReason || null,
          amendmentStatus: statusData.amendmentStatus || null,
          amendmentMessage: statusData.amendmentMessage || null,
          newMobileNo: statusData.newMobileNo || null,
          imeResponseCode: response.code || null,
          imeResponseMessage: response.message || null,
          agentSessionId,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error updating IME customer status:', error);
    }
  }

  /**
   * Helper method to extract SOAP body
   */
  extractSoapBody(serviceResult) {
    const dataArray = Array.isArray(serviceResult?.data) ? serviceResult.data : [];
    return dataArray.find((item) => item && typeof item === 'object' && !Array.isArray(item)) || {};
  }

  /**
   * Helper method to extract IME response
   */
  extractImeResponse(serviceResult) {
    const body = this.extractSoapBody(serviceResult);
    const firstKey = Object.keys(body)[0];
    const payload = firstKey ? body[firstKey] : {};
    const response = payload?.Response || {};
    
    return {
      code: String(response.Code || ''),
      message: String(response.Message || ''),
      agentSessionId: response.AgentSessionId || '',
      customerId: response.CustomerId || null,
      receiverId: response.ReceiverId || null,
      transactionId: response.TransactionId || null,
      icn: response.ICN || null,
      otpToken: response.OTPToken || null,
      customerToken: response.CustomerToken || null,
      forexSessionId: response.ForexSessionId || null,
      otpProcessId: response.OTPProcessId || null
    };
  }
}

module.exports = new ImeStorageService();
