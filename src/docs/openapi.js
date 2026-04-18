const port = process.env.PORT || 5000;
const serverUrl = process.env.SWAGGER_SERVER_URL || `http://localhost:${port}`;

const jsonBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        additionalProperties: true,
      },
    },
  },
};

const imeCreateCustomerBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: [
          "FirstName",
          "LastName",
          "Gender",
          "DateOfBirth",
          "IDType",
          "IDNumber",
          "PhoneNumber",
          "Nationality",
          "MaritalStatus",
          "FatherOrMotherName",
          "Occupation",
          "State",
          "District",
          "Municipality",
          "Address",
          "IDIssueDate",
          "IdData"
        ],
        properties: {
          FirstName: { type: "string", example: "Ram" },
          LastName: { type: "string", example: "Bahadur" },
          Gender: { type: "string", enum: ["M", "F"], example: "M" },
          DateOfBirth: { type: "string", format: "date", example: "1995-06-15" },
          IDType: { type: "string", enum: ["PP", "DL", "NP_ID"], example: "NP_ID" },
          IDNumber: { type: "string", example: "29383-239334-2" },
          IDIssueDate: { type: "string", example: "2018-02-15" },
          PhoneNumber: { type: "string", example: "9841234567" },
          CountryCode: { type: "string", example: "NP" },
          Nationality: { type: "string", example: "NPL" },
          MaritalStatus: { type: "string", example: "Single" },
          FatherOrMotherName: { type: "string", example: "Dhan Bahadur Thapa" },
          Occupation: { type: "string", example: "Service" },
          SourceOfFund: { type: "string", example: "Salary" },
          State: { type: "string", example: "Bagmati" },
          District: { type: "string", example: "Kathmandu" },
          Municipality: { type: "string", example: "Kathmandu" },
          Address: { type: "string", example: "Baneshwor" }
          ,IdData: { type: "string", example: "<base64-id-document>" }
          ,IdDataType: { type: "string", example: "image/jpeg" }
          ,OTPToken: { type: "string", example: "IME-OTP-TOKEN" }
          ,OTP: { type: "string", example: "123456" }
        }
      }
    }
  }
};

const imeValidateCustomerBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["CustomerId"],
        properties: {
          CustomerId: { type: "string", example: "CUST123" },
          IDType: { type: "string", example: "NP_ID" },
          IDNumber: { type: "string", example: "504XXXXXXXX" }
        }
      }
    }
  }
};

const imeSendMoneyBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: [
          "SenderCustomerId",
          "ReceiverCustomerId",
          "Amount",
          "SourceCurrency",
          "DestinationCurrency",
          "PaymentMode"
        ],
        properties: {
          SenderCustomerId: { type: "string", example: "CUST001" },
          ReceiverCustomerId: { type: "string", example: "RCV001" },
          Amount: { type: "number", example: 500 },
          SourceCurrency: { type: "string", enum: ["AUD", "USD", "NZD", "CAD", "GBP"], example: "AUD" },
          DestinationCurrency: { type: "string", enum: ["NPR"], example: "NPR" },
          PaymentMode: { type: "string", enum: ["CASH", "BANK"], example: "BANK" },
          Purpose: { type: "string", example: "Family support" },
          Notes: { type: "string", example: "Monthly transfer" }
        }
      }
    }
  }
};

const imeCancelTransactionBody = {
  required: false,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          reason: { type: "string", example: "Customer requested cancellation" }
        }
      }
    }
  }
};

const imeCreateReceiverBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["CustomerId", "FirstName", "LastName", "IDType", "IDNumber", "PhoneNumber"],
        properties: {
          CustomerId: { type: "string", example: "CUST001" },
          FirstName: { type: "string", example: "Hari" },
          LastName: { type: "string", example: "Shrestha" },
          IDType: { type: "string", enum: ["PP", "DL", "NP_ID"], example: "NP_ID" },
          IDNumber: { type: "string", example: "509XXXXXXXX" },
          PhoneNumber: { type: "string", example: "9801234567" },
          BankCode: { type: "string", example: "NABIL" },
          AccountNumber: { type: "string", example: "1234567890" },
          CountryCode: { type: "string", example: "NP" }
        }
      }
    }
  }
};

const imeValidateBankAccountBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["BankCode", "AccountNumber"],
        properties: {
          BankCode: { type: "string", example: "NABIL" },
          AccountNumber: { type: "string", example: "1234567890" },
          CountryCode: { type: "string", example: "NP" }
        }
      }
    }
  }
};

const imeVerifyKycBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["CustomerId", "IDType", "IDNumber"],
        properties: {
          CustomerId: { type: "string", example: "CUST001" },
          IDType: { type: "string", enum: ["PP", "DL", "NP_ID"], example: "NP_ID" },
          IDNumber: { type: "string", example: "509XXXXXXXX" }
        }
      }
    }
  }
};

const imeDataBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["name", "mobile", "relationship"],
        properties: {
          name: { type: "string", example: "Sita Sharma" },
          mobile: { type: "string", example: "9801234567" },
          relationship: { type: "string", example: "Self" },
          sendAmountInr: { type: "number", example: 1000 },
          receiveAmountNpr: { type: "number", example: 1600 }
        }
      }
    }
  }
};

const prabhuCredentialsBody = {
  required: false,
  content: {
    "application/json": {
      schema: {
        type: "object",
        description: "Credentials are auto-filled from server env (PRABHU_API_KEY/PRABHU_API_SECRET).",
        additionalProperties: true,
        properties: {}
      }
    }
  }
};

const prabhuGetStateDistrictBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        description: "userName/password are auto-filled from env.",
        properties: {
          country: { type: "string", example: "Nepal" }
        }
      }
    }
  }
};

const prabhuGetStaticDataBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        description: "userName/password are auto-filled from env.",
        properties: {
          type: { type: "string", example: "paymentMode" }
        }
      }
    }
  }
};

const prabhuGetEchoBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["agentSessionId"],
        properties: {
          agentSessionId: { type: "string", example: "1712213374" }
        }
      }
    }
  }
};

const prabhuGetCashPayLocationListBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        description: "userName/password are auto-filled from env.",
        properties: {
          country: { type: "string", example: "Nepal" },
          state: { type: "string", example: "Bagmati" },
          district: { type: "string", example: "Kathmandu" },
          city: { type: "string", example: "Kathmandu" },
          locationName: { type: "string", example: "New Road" }
        }
      }
    }
  }
};

const prabhuGetAcPayBankBranchListBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        description: "userName/password are auto-filled from env.",
        properties: {
          country: { type: "string", example: "Nepal" },
          state: { type: "string", example: "Bagmati" },
          district: { type: "string", example: "Kathmandu" },
          city: { type: "string", example: "Kathmandu" },
          bankName: { type: "string", example: "Nabil" },
          branchName: { type: "string", example: "Putalisadak" }
        }
      }
    }
  }
};

const prabhuSendOtpBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["operation"],
        description: "userName/password are auto-filled from env.",
        properties: {
          operation: { type: "string", example: "CreateCustomer" },
          mobile: { type: "string", example: "7041897207" },
          customerId: { type: "string", example: "1001" },
          receiverId: { type: "string", example: "2001" },
          pinNo: { type: "string", example: "PRB12345" },
          paymentMode: { type: "string", example: "Bank" },
          customerFullName: { type: "string", example: "Ram Bahadur" },
          sendAmount: { type: "string", example: "10000" },
          cspMobile: { type: "string", example: "9876543210" },
          cspName: { type: "string", example: "Subhalaxmi CSP" },
          idType: { type: "string", example: "12" }
        }
      }
    }
  }
};

const prabhuGetServiceChargeBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        description: "userName/password are auto-filled from env.",
        properties: {
          country: { type: "string", example: "Nepal" },
          paymentMode: { type: "string", example: "Bank" },
          transferAmount: { type: "string", example: "10000" },
          payoutAmount: { type: "string", example: "16000" },
          bankBranchId: { type: "string", example: "123" },
          isNewAccount: { type: "string", example: "false" },
          customerId: { type: "string", example: "1" }
        }
      }
    }
  }
};

const prabhuGetServiceChargeByCollectionBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        description: "userName/password are auto-filled from env.",
        properties: {
          country: { type: "string", example: "Nepal" },
          paymentMode: { type: "string", example: "Bank" },
          collectionAmount: { type: "string", example: "11000" },
          payoutAmount: { type: "string", example: "16000" },
          bankBranchId: { type: "string", example: "123" },
          isNewAccount: { type: "string", example: "false" },
          customerId: { type: "string", example: "1" }
        }
      }
    }
  }
};

const prabhuCancelTransactionBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["pinNo"],
        description: "userName/password are auto-filled from env.",
        properties: {
          pinNo: { type: "string", example: "PRB12345" },
          reasonForCancellation: { type: "string", example: "Customer request" },
          otpProcessId: { type: "string", example: "OTP12345" },
          otp: { type: "string", example: "123456" }
        }
      }
    }
  }
};

const prabhuUploadDocumentBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["customerId", "idType", "frontImgFileBase64"],
        description: "userName/password are auto-filled from env.",
        properties: {
          customerId: { type: "string", example: "1001" },
          idType: { type: "string", example: "12" },
          frontImgFileBase64: { type: "string", example: "iVBORw0KGgoAAAANSUhEUg..." },
          backImgFileBase64: { type: "string", example: "iVBORw0KGgoAAAANSUhEUg..." },
          additionalImgFileBase64: { type: "string", example: "iVBORw0KGgoAAAANSUhEUg..." }
        }
      }
    }
  }
};

const prabhuSendTransactionBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["customerId", "receiverId", "paymentMode", "sendAmount", "otpProcessId", "otp"],
        description: "userName/password are auto-filled from env.",
        properties: {
          customerId: { type: "number", example: 1001 },
          senderName: { type: "string", example: "Ram Bahadur" },
          senderMobile: { type: "string", example: "7041897207" },
          senderIDType: { type: "string", example: "12" },
          receiverId: { type: "number", example: 2001 },
          receiverName: { type: "string", example: "Hari Shrestha" },
          sendCountry: { type: "string", example: "India" },
          payoutCountry: { type: "string", example: "Nepal" },
          paymentMode: { type: "string", example: "Bank" },
          collectedAmount: { type: "string", example: "11000" },
          serviceCharge: { type: "string", example: "100" },
          sendAmount: { type: "string", example: "10900" },
          sendCurrency: { type: "string", example: "INR" },
          payAmount: { type: "string", example: "17440" },
          payCurrency: { type: "string", example: "NPR" },
          exchangeRate: { type: "string", example: "1.6" },
          accountNumber: { type: "string", example: "001100220033" },
          partnerPinNo: { type: "string", example: "PARTNER123" },
          remittanceReason: { type: "string", example: "Family support" },
          SourceOfFund: { type: "string", example: "Salary" },
          cspCode: { type: "string", example: "CSP001" },
          otpProcessId: { type: "string", example: "OTP12345" },
          otp: { type: "string", example: "123456" }
        }
      }
    }
  }
};

const prabhuConfirmTransactionBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["pinNo"],
        description: "userName/password are auto-filled from env.",
        properties: {
          pinNo: { type: "string", example: "PRB123456" }
        }
      }
    }
  }
};

const prabhuGetCustomerByIdBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["customerIdNo"],
        description: "userName/password are auto-filled from env.",
        properties: {
          customerIdNo: { type: "string", example: "A12345678" }
        }
      }
    }
  }
};

const prabhuGetCustomerByMobileBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["customerMobile"],
        description: "userName/password are auto-filled from env.",
        properties: {
          customerMobile: { type: "string", example: "7041897207" }
        }
      }
    }
  }
};

const prabhuCreateReceiverBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["customerId", "firstName", "lastName", "mobile", "paymentMode"],
        description: "userName/password are auto-filled from env.",
        properties: {
          customerId: { type: "string", example: "1001" },
          firstName: { type: "string", example: "Hari" },
          middleName: { type: "string", example: "Bahadur" },
          lastName: { type: "string", example: "Shrestha" },
          gender: { type: "string", example: "Male" },
          mobile: { type: "string", example: "9801234567" },
          relationship: { type: "string", example: "Brother" },
          address: { type: "string", example: "Kathmandu" },
          state: { type: "string", example: "Bagmati" },
          district: { type: "string", example: "Kathmandu" },
          localLevel: { type: "string", example: "KMC" },
          country: { type: "string", example: "Nepal" },
          paymentMode: { type: "string", example: "Bank" },
          bankBranchId: { type: "string", example: "123" },
          accountNumber: { type: "string", example: "001100220033" },
          nepaleseIdType: { type: "string", example: "Citizenship" },
          nepaleseIdNumber: { type: "string", example: "11-01-76-12345" },
          nepaleseIdIssueDistrict: { type: "string", example: "Kathmandu" },
          nepaleseIdIssueDate: { type: "string", example: "2020-01-01" },
          nepaleseIdExpiryDate: { type: "string", example: "2030-01-01" },
          nepaleseIdIssueCountry: { type: "string", example: "Nepal" }
        }
      }
    }
  }
};

const prabhuCreateCustomerBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["firstName", "lastName", "gender", "dobAD", "mobile", "idType", "idNumber", "otpProcessId", "otp"],
        description: "userName/password are auto-filled from env.",
        properties: {
          firstName: { type: "string", example: "Ram" },
          middleName: { type: "string", example: "Bahadur" },
          lastName: { type: "string", example: "Karki" },
          gender: { type: "string", example: "Male" },
          dobAD: { type: "string", example: "1995-05-15" },
          mobile: { type: "string", example: "7041897207" },
          temporaryAddress: { type: "string", example: "Delhi" },
          temporaryState: { type: "string", example: "Delhi" },
          temporaryDistrict: { type: "string", example: "New Delhi" },
          temporaryCity: { type: "string", example: "New Delhi" },
          temporaryPINCode: { type: "string", example: "110001" },
          nationality: { type: "string", example: "NPL" },
          permanentAddress: { type: "string", example: "Kathmandu" },
          permanentState: { type: "string", example: "Bagmati" },
          permanentDistrict: { type: "string", example: "Kathmandu" },
          permanentLocalLevel: { type: "string", example: "KMC" },
          permanentWardNo: { type: "string", example: "10" },
          fatherName: { type: "string", example: "Shyam Karki" },
          email: { type: "string", example: "ram@example.com" },
          employer: { type: "string", example: "ABC Pvt Ltd" },
          idType: { type: "string", example: "12" },
          idNumber: { type: "string", example: "A12345678" },
          citizenshipNo: { type: "string", example: "01-01-76-12345" },
          idIssuedDateAD: { type: "string", example: "2019-01-01" },
          idExpiryDate: { type: "string", example: "2029-01-01" },
          idIssuedPlace: { type: "string", example: "Kathmandu" },
          otpProcessId: { type: "string", example: "OTP12345" },
          otp: { type: "string", example: "123456" },
          customerType: { type: "string", example: "Retail" },
          sourceIncomeType: { type: "string", example: "Salary" },
          annualIncome: { type: "string", example: "500000" },
          cspCode: { type: "string", example: "CSP001" }
        }
      }
    }
  }
};

const prabhuValidateBankBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["bankCode", "accountNumber"],
        description: "userName/password are auto-filled from env.",
        properties: {
          bankCode: { type: "string", example: "NABIL" },
          accountNumber: { type: "string", example: "1234567890" }
        }
      }
    }
  }
};

const prabhuSearchTransactionBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        description: "userName/password are auto-filled from env.",
        properties: {
          pinNo: { type: "string", example: "PRB123456" },
          partnerPinNo: { type: "string", example: "PARTNER123" },
          fromDate: { type: "string", example: "2026-01-01" },
          toDate: { type: "string", example: "2026-01-31" }
        }
      }
    }
  }
};

const prabhuRegisterComplaintBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["complainType", "mobileNumber"],
        description: "userName/password are auto-filled from env.",
        properties: {
          complainType: { type: "string", example: "Transaction" },
          mobileNumber: { type: "string", example: "7041897207" },
          referenceNumber: { type: "string", example: "PRB123456" },
          ticketType: { type: "string", example: "Support" },
          category: { type: "string", example: "Delay" },
          remarks: { type: "string", example: "Transaction pending for more than 24 hours" }
        }
      }
    }
  }
};

const prabhuTrackComplaintBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["complainId"],
        description: "userName/password are auto-filled from env.",
        properties: {
          complainId: { type: "string", example: "CMP12345" }
        }
      }
    }
  }
};

// eKYC Request Bodies
const prabhuEkycGenerateTokenBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        description: "Generate eKYC token credentials",
        properties: {
          apiKey: { type: "string", example: "32127EE9-2A6C-4742-B9B6-D0263FE30E8E" },
          username: { type: "string", example: "SHUBH_API" },
          password: { type: "string", example: "Subhalaxmi#12345" }
        }
      }
    }
  }
};

const prabhuEkycInitiateBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["mobile", "consent"],
        properties: {
          mobile: { type: "string", example: "9876543210" },
          consent: { type: "string", enum: ["Y", "N"], example: "Y" },
          purpose: { type: "string", example: "Customer Registration" }
        }
      }
    }
  }
};

const prabhuEkycUniqueRefStatusBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["uniqueRef"],
        properties: {
          uniqueRef: { type: "string", example: "REF123456789" }
        }
      }
    }
  }
};

const prabhuEkycEnrollmentBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["uniqueRef", "biometricData"],
        properties: {
          uniqueRef: { type: "string", example: "REF123456789" },
          biometricData: { type: "string", example: "base64-encoded-biometric-data" },
          pidData: { type: "string", example: "base64-encoded-pid-data" }
        }
      }
    }
  }
};

const prabhuEkycCustomerOnboardingBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["customerId", "ekycData"],
        properties: {
          customerId: { type: "string", example: "CUST001" },
          ekycData: {
            type: "object",
            properties: {
              name: { type: "string", example: "Ram Bahadur" },
              dob: { type: "string", example: "1995-06-15" },
              gender: { type: "string", enum: ["M", "F"], example: "M" },
              address: { type: "string", example: "Kathmandu, Nepal" },
              aadhaar: { type: "string", example: "123456789012" }
            }
          }
        }
      }
    }
  }
};

// CSP Request Bodies
const prabhuCspInitiateBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["mobile", "consent"],
        properties: {
          mobile: { type: "string", example: "9876543210" },
          consent: { type: "string", enum: ["Y", "N"], example: "Y" },
          purpose: { type: "string", example: "CSP Registration" }
        }
      }
    }
  }
};

const prabhuCspSendOtpBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["mobile", "operation"],
        properties: {
          mobile: { type: "string", example: "9876543210" },
          operation: { type: "string", example: "CSP_REGISTRATION" },
          consent: { type: "string", enum: ["Y", "N"], example: "Y" }
        }
      }
    }
  }
};

const prabhuCspUniqueRefStatusBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["uniqueRef"],
        properties: {
          uniqueRef: { type: "string", example: "CSPREF123456789" }
        }
      }
    }
  }
};

const prabhuCspEnrollmentBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["uniqueRef", "biometricData"],
        properties: {
          uniqueRef: { type: "string", example: "CSPREF123456789" },
          biometricData: { type: "string", example: "base64-encoded-biometric-data" },
          pidData: { type: "string", example: "base64-encoded-pid-data" },
          cspCode: { type: "string", example: "CSP001" }
        }
      }
    }
  }
};

const prabhuCspOnboardingBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["cspData"],
        properties: {
          cspData: {
            type: "object",
            properties: {
              cspCode: { type: "string", example: "CSP001" },
              name: { type: "string", example: "Subhalaxmi CSP" },
              mobile: { type: "string", example: "9876543210" },
              email: { type: "string", example: "csp@example.com" },
              address: { type: "string", example: "Kathmandu, Nepal" },
              panNumber: { type: "string", example: "ABCDE1234F" },
              aadhaarNumber: { type: "string", example: "123456789012" },
              bankAccount: { type: "string", example: "1234567890" },
              bankName: { type: "string", example: "NABIL Bank" },
              ifsc: { type: "string", example: "NABIL001" }
            }
          }
        }
      }
    }
  }
};

const prabhuCspSearchBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          mobile: { type: "string", example: "9876543210" },
          cspCode: { type: "string", example: "CSP001" },
          name: { type: "string", example: "Subhalaxmi CSP" },
          status: { type: "string", enum: ["ACTIVE", "INACTIVE", "PENDING"], example: "ACTIVE" }
        }
      }
    }
  }
};

const prabhuCspCreateBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["name", "mobile", "address"],
        properties: {
          name: { type: "string", example: "Subhalaxmi CSP" },
          mobile: { type: "string", example: "9876543210" },
          email: { type: "string", example: "csp@example.com" },
          address: { type: "string", example: "Kathmandu, Nepal" },
          panNumber: { type: "string", example: "ABCDE1234F" },
          aadhaarNumber: { type: "string", example: "123456789012" },
          bankAccount: { type: "string", example: "1234567890" },
          bankName: { type: "string", example: "NABIL Bank" },
          ifsc: { type: "string", example: "NABIL001" }
        }
      }
    }
  }
};

const prabhuCspAgentConsentBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["agentId", "consent"],
        properties: {
          agentId: { type: "string", example: "AGENT001" },
          consent: { type: "string", enum: ["Y", "N"], example: "Y" },
          consentType: { type: "string", example: "Biometric" }
        }
      }
    }
  }
};

const prabhuCspMappingBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["cspCode", "agentId"],
        properties: {
          cspCode: { type: "string", example: "CSP001" },
          agentId: { type: "string", example: "AGENT001" },
          mappingType: { type: "string", example: "PRIMARY" }
        }
      }
    }
  }
};

const prabhuCspBioKycRequeryBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["uniqueRef"],
        properties: {
          uniqueRef: { type: "string", example: "CSPREF123456789" },
          retryCount: { type: "number", example: 1 }
        }
      }
    }
  }
};

const prabhuCspUniqueRefPollBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["uniqueRef"],
        properties: {
          uniqueRef: { type: "string", example: "CSPREF123456789" },
          pollType: { type: "string", example: "STATUS" }
        }
      }
    }
  }
};

const bearerSecurity = [{ bearerAuth: [] }];

const addPost = (paths, path, tag, summary, options = {}) => {
  paths[path] = paths[path] || {};
  paths[path].post = {
    tags: [tag],
    summary,
    requestBody: options.requestBody || jsonBody,
    responses: options.responses || {
      200: { description: "Success" },
      400: { description: "Bad request" },
      500: { description: "Server error" },
    },
    ...(options.security ? { security: options.security } : {}),
  };
};

const prabhuPrefix = "/api/Prabhu";

const paths = {
  "/api/ping": {
    get: {
      tags: ["System"],
      summary: "Health check",
      responses: {
        200: { description: "Pong" },
      },
    },
  },

  "/api/auth/send-otp": {
    post: {
      tags: ["Auth"],
      summary: "Send OTP to mobile",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["mobile"],
              properties: {
                mobile: { type: "string", example: "98XXXXXXXX" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "OTP sent" },
        409: { description: "Already registered" },
        429: { description: "Rate limited" },
      },
    },
  },

  "/api/auth/verify-otp": {
    post: {
      tags: ["Auth"],
      summary: "Verify OTP",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["mobile", "otp"],
              properties: {
                mobile: { type: "string", example: "98XXXXXXXX" },
                otp: { type: "string", example: "123456" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Verified" },
        400: { description: "Invalid OTP" },
      },
    },
  },

  "/api/auth/check-mobile": {
    post: {
      tags: ["Auth"],
      summary: "Check if mobile is registered",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["mobile"],
              properties: {
                mobile: { type: "string", example: "98XXXXXXXX" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Exists or not" },
      },
    },
  },

  "/api/auth/forgot-password": {
    post: {
      tags: ["Auth"],
      summary: "Send OTP for password reset",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["mobile"],
              properties: {
                mobile: { type: "string", example: "98XXXXXXXX" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "OTP sent" },
        404: { description: "User not found" },
      },
    },
  },

  "/api/auth/reset-password": {
    post: {
      tags: ["Auth"],
      summary: "Reset password using OTP",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["mobile", "otp", "newPassword"],
              properties: {
                mobile: { type: "string", example: "98XXXXXXXX" },
                otp: { type: "string", example: "123456" },
                newPassword: { type: "string", example: "Strong@123" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Password reset successful" },
        400: { description: "Invalid OTP or input" },
      },
    },
  },

  "/api/auth/register": {
    post: {
      tags: ["Auth"],
      summary: "Register a new user",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["mobile", "fullName", "gender", "dateOfBirth", "password"],
              properties: {
                mobile: { type: "string", example: "98XXXXXXXX" },
                fullName: { type: "string", example: "Ram Bahadur" },
                gender: { type: "string", example: "MALE" },
                dateOfBirth: { type: "string", format: "date", example: "1997-06-12" },
                password: { type: "string", example: "Strong@123" },
                referredBy: { type: "string", nullable: true, example: "98YYYYYYYY" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Registered" },
        409: { description: "Already registered" },
      },
    },
  },

  "/api/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Login",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["mobile", "password"],
              properties: {
                mobile: { type: "string", example: "98XXXXXXXX" },
                password: { type: "string", example: "Strong@123" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Logged in" },
        401: { description: "Invalid credentials" },
      },
    },
  },

  "/api/auth/logout": {
    post: {
      tags: ["Auth"],
      summary: "Logout",
      security: bearerSecurity,
      responses: {
        200: { description: "Logged out" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/api/users/profile": {
    get: {
      tags: ["Users"],
      summary: "Get logged-in profile",
      security: bearerSecurity,
      responses: {
        200: { description: "Profile" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/api/users/approvals/pending": {
    get: {
      tags: ["Users"],
      summary: "List pending approvals (ADMIN/SUPER_ADMIN)",
      security: bearerSecurity,
      responses: {
        200: { description: "Pending approval list" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/users/{id}/role": {
    patch: {
      tags: ["Users"],
      summary: "Change user role (ADMIN/SUPER_ADMIN)",
      security: bearerSecurity,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: jsonBody,
      responses: {
        200: { description: "Role updated" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/users/{id}/user-type": {
    patch: {
      tags: ["Users"],
      summary: "Set user type (ADMIN/SUPER_ADMIN)",
      security: bearerSecurity,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: jsonBody,
      responses: {
        200: { description: "User type updated" },
      },
    },
  },

  "/api/users/{id}/approval": {
    patch: {
      tags: ["Users"],
      summary: "Approve user (ADMIN/SUPER_ADMIN)",
      security: bearerSecurity,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: jsonBody,
      responses: {
        200: { description: "Approval updated" },
      },
    },
  },

  "/api/admin/create-state": {
    post: {
      tags: ["Admin"],
      summary: "Create state (ADMIN)",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Created" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/create-district": {
    post: {
      tags: ["Admin"],
      summary: "Create district (ADMIN/STATE_PARTNER)",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Created" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/create-agent": {
    post: {
      tags: ["Admin"],
      summary: "Create agent (ADMIN/STATE_PARTNER/DISTRICT_PARTNER)",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Created" },
      },
    },
  },

  "/api/admin/create-user": {
    post: {
      tags: ["Admin"],
      summary: "Create user by hierarchy",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Created" },
      },
    },
  },

  "/api/super-admin/create-tenant": {
    post: {
      tags: ["Super Admin"],
      summary: "Create tenant",
      requestBody: jsonBody,
      responses: {
        201: { description: "Tenant created" },
      },
    },
  },

  "/api/ime/authenticate": {
    post: {
      tags: ["IME"],
      summary: "IME Authenticate (SOAP)",
      requestBody: jsonBody,
      responses: {
        200: { description: "Authentication successful" },
        500: { description: "IME SOAP error" },
      },
    },
  },

  "/api/ime/login": {
    post: {
      tags: ["IME"],
      summary: "IME Login (SOAP)",
      requestBody: jsonBody,
      responses: {
        200: { description: "Login successful" },
        500: { description: "IME SOAP error" },
      },
    },
  },

  "/api/ime/customers": {
    post: {
      tags: ["IME"],
      summary: "Create IME Customer",
      requestBody: jsonBody,
      responses: {
        201: { description: "Customer created" },
        400: { description: "Invalid input" },
      },
    },
  },

  "/api/ime/customers/send-otp": {
    post: {
      tags: ["IME"],
      summary: "Send OTP for IME Customer Registration",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["PhoneNumber"],
              properties: {
                PhoneNumber: { type: "string", example: "9812474750" },
                Module: { type: "string", example: "CustomerRegistration" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "OTP sent" },
        400: { description: "Invalid input" },
      },
    },
  },

  "/api/ime/customers/confirm": {
    post: {
      tags: ["IME"],
      summary: "Confirm IME Customer Registration with OTP",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["CustomerToken", "OTPToken", "OTP"],
              properties: {
                CustomerToken: { type: "string", example: "IME-CUSTOMER-TOKEN" },
                OTPToken: { type: "string", example: "IME-OTP-TOKEN" },
                OTP: { type: "string", example: "123456" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Customer confirmed" },
        400: { description: "Invalid OTP/Token" },
      },
    },
  },

  "/api/ime/customers/search/mobile/{mobile}": {
    get: {
      tags: ["IME"],
      summary: "Search IME Customer By Mobile",
      parameters: [
        { name: "mobile", in: "path", required: true, schema: { type: "string", example: "9841234567" } },
      ],
      responses: {
        200: { description: "Customer search result" },
        400: { description: "Invalid mobile" },
      },
    },
  },

  "/api/ime/customers/{customerId}": {
    get: {
      tags: ["IME"],
      summary: "Get IME Customer Details",
      parameters: [
        { name: "customerId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Customer details" },
        404: { description: "Customer not found" },
      },
    },
  },

  "/api/ime/customers/validate": {
    post: {
      tags: ["IME"],
      summary: "Validate IME Customer",
      requestBody: jsonBody,
      responses: {
        200: { description: "Validation result" },
      },
    },
  },

  "/api/ime/transactions/send": {
    post: {
      tags: ["IME"],
      summary: "Send Money via IME",
      requestBody: jsonBody,
      responses: {
        200: { description: "Money sent successfully" },
        400: { description: "Invalid transaction data" },
      },
    },
  },

  "/api/ime/transactions/{transactionId}/status": {
    get: {
      tags: ["IME"],
      summary: "Get IME Transaction Status",
      parameters: [
        { name: "transactionId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Transaction status" },
      },
    },
  },

  "/api/ime/transactions/{transactionId}/cancel": {
    post: {
      tags: ["IME"],
      summary: "Cancel IME Transaction",
      parameters: [
        { name: "transactionId", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: jsonBody,
      responses: {
        200: { description: "Transaction cancelled" },
      },
    },
  },

  "/api/ime/receivers": {
    post: {
      tags: ["IME"],
      summary: "Create IME Receiver",
      requestBody: jsonBody,
      responses: {
        201: { description: "Receiver created" },
      },
    },
  },

  "/api/ime/receivers/{receiverId}": {
    get: {
      tags: ["IME"],
      summary: "Get IME Receiver Details",
      parameters: [
        { name: "receiverId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Receiver details" },
      },
    },
    patch: {
      tags: ["IME"],
      summary: "Update IME Receiver",
      parameters: [
        { name: "receiverId", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: jsonBody,
      responses: {
        200: { description: "Receiver updated" },
      },
    },
  },

  "/api/ime/data": {
    get: {
      tags: ["IME"],
      summary: "List persisted IME data",
      responses: {
        200: { description: "IME data list" },
      },
    },
    post: {
      tags: ["IME"],
      summary: "Create persisted IME data",
      requestBody: jsonBody,
      responses: {
        200: { description: "IME data created" },
      },
    },
  },

  "/api/ime/data/{id}": {
    patch: {
      tags: ["IME"],
      summary: "Update persisted IME data",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: jsonBody,
      responses: {
        200: { description: "IME data updated" },
      },
    },
    delete: {
      tags: ["IME"],
      summary: "Delete persisted IME data",
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "IME data deleted" },
      },
    },
  },

  "/api/ime/payment-modes": {
    get: {
      tags: ["IME"],
      summary: "Get IME Payment Modes",
      responses: {
        200: { description: "Payment modes list" },
      },
    },
  },

  "/api/ime/bank-accounts/validate": {
    post: {
      tags: ["IME"],
      summary: "Validate IME Bank Account",
      requestBody: jsonBody,
      responses: {
        200: { description: "Bank account validation result" },
      },
    },
  },

  "/api/ime/banks": {
    get: {
      tags: ["IME"],
      summary: "Get IME Bank List",
      parameters: [
        { name: "country", in: "query", required: false, schema: { type: "string", example: "NP" } },
      ],
      responses: {
        200: { description: "Bank list" },
      },
    },
  },

  "/api/ime/kyc/verify": {
    post: {
      tags: ["IME"],
      summary: "Verify IME KYC",
      requestBody: jsonBody,
      responses: {
        200: { description: "KYC verification result" },
      },
    },
  },

  "/api/ime/compliance/{customerId}/status": {
    get: {
      tags: ["IME"],
      summary: "Get IME Compliance Status",
      parameters: [
        { name: "customerId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Compliance status" },
      },
    },
  },

  "/api/ime/customers/{customerId}/transactions": {
    get: {
      tags: ["IME"],
      summary: "Get IME Transaction History",
      parameters: [
        { name: "customerId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Transaction history" },
      },
    },
  },

  "/api/ime/exchange-rate": {
    get: {
      tags: ["IME"],
      summary: "Get IME Exchange Rate",
      parameters: [
        { name: "from", in: "query", required: true, schema: { type: "string", example: "USD" } },
        { name: "to", in: "query", required: true, schema: { type: "string", example: "NPR" } },
      ],
      responses: {
        200: { description: "Exchange rate" },
      },
    },
  },

};

paths[`${prabhuPrefix}/GetCustomerByIdNumber/{customerIdNo}`] = {
  get: {
    tags: ["Prabhu"],
    summary: "Get customer by ID number (legacy)",
    parameters: [
      { name: "customerIdNo", in: "path", required: true, schema: { type: "string" } },
    ],
    responses: {
      200: { description: "Customer details" },
    },
  },
};

paths[`${prabhuPrefix}/GetCustomerByMobile/{mobile}`] = {
  get: {
    tags: ["Prabhu"],
    summary: "Get customer by mobile (legacy)",
    parameters: [
      { name: "mobile", in: "path", required: true, schema: { type: "string" } },
    ],
    responses: {
      200: { description: "Customer details" },
    },
  },
};

paths[`${prabhuPrefix}/GetCustomerById`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Get customer by ID number",
    requestBody: prabhuGetCustomerByIdBody,
    responses: {
      200: { description: "Customer details" },
    },
  },
};

paths[`${prabhuPrefix}/GetCustomerByMobile`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Get customer by mobile",
    requestBody: prabhuGetCustomerByMobileBody,
    responses: {
      200: { description: "Customer details" },
    },
  },
};

paths[`${prabhuPrefix}/VerifyTransaction/{pinNo}`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Verify transaction",
    parameters: [
      { name: "pinNo", in: "path", required: true, schema: { type: "string" } },
    ],
    requestBody: prabhuSearchTransactionBody,
    responses: {
      200: { description: "Verification result" },
    },
  },
};

[
  "GetStateDistrict",
  "GetStaticData",
  "GetEcho",
  "GetCashPayLocationList",
  "GetAcPayBankBranchList",
  "GetBalance",
  "SendOTP",
  "GetServiceCharge",
  "GetServiceChargeByCollection",
  "CancelTransaction",
  "UnverifiedTransactions",
  "ComplianceTransactions",
  "UploadDocument",
  "SendTransaction",
  "ConfirmTransaction",
  "SearchTransaction",
  "ValidateBankAccount",
  "CreateReceiver",
  "CreateCustomer",
  "GetUnverifiedCustomers",
  "RegisterComplaint",
  "TrackComplaint",
].forEach((name) => {
  addPost(paths, `${prabhuPrefix}/${name}`, "Prabhu", name, {
    requestBody: jsonBody,
    responses: {
      200: { description: "Success" },
      400: { description: "Validation error" },
      500: { description: "Upstream/Server error" },
    },
  });
});

paths["/api/ime/customers"].post.requestBody = imeCreateCustomerBody;
paths["/api/ime/customers/validate"].post.requestBody = imeValidateCustomerBody;
paths["/api/ime/transactions/send"].post.requestBody = imeSendMoneyBody;
paths["/api/ime/transactions/{transactionId}/cancel"].post.requestBody = imeCancelTransactionBody;
paths["/api/ime/receivers"].post.requestBody = imeCreateReceiverBody;
paths["/api/ime/data"].post.requestBody = imeDataBody;
paths["/api/ime/data/{id}"].patch.requestBody = imeDataBody;
paths["/api/ime/bank-accounts/validate"].post.requestBody = imeValidateBankAccountBody;
paths["/api/ime/kyc/verify"].post.requestBody = imeVerifyKycBody;

paths[`${prabhuPrefix}/SendTransaction`].post.requestBody = prabhuSendTransactionBody;
paths[`${prabhuPrefix}/ConfirmTransaction`].post.requestBody = prabhuConfirmTransactionBody;
paths[`${prabhuPrefix}/CreateCustomer`].post.requestBody = prabhuCreateCustomerBody;
paths[`${prabhuPrefix}/CreateReceiver`].post.requestBody = prabhuCreateReceiverBody;
paths[`${prabhuPrefix}/ValidateBankAccount`].post.requestBody = prabhuValidateBankBody;
paths[`${prabhuPrefix}/SearchTransaction`].post.requestBody = prabhuSearchTransactionBody;
paths[`${prabhuPrefix}/VerifyTransaction/{pinNo}`].post.requestBody = prabhuSearchTransactionBody;
paths[`${prabhuPrefix}/GetStateDistrict`].post.requestBody = prabhuGetStateDistrictBody;
paths[`${prabhuPrefix}/GetStaticData`].post.requestBody = prabhuGetStaticDataBody;
paths[`${prabhuPrefix}/GetEcho`].post.requestBody = prabhuGetEchoBody;
paths[`${prabhuPrefix}/GetCashPayLocationList`].post.requestBody = prabhuGetCashPayLocationListBody;
paths[`${prabhuPrefix}/GetAcPayBankBranchList`].post.requestBody = prabhuGetAcPayBankBranchListBody;
paths[`${prabhuPrefix}/GetBalance`].post.requestBody = prabhuCredentialsBody;
paths[`${prabhuPrefix}/SendOTP`].post.requestBody = prabhuSendOtpBody;
paths[`${prabhuPrefix}/GetServiceCharge`].post.requestBody = prabhuGetServiceChargeBody;
paths[`${prabhuPrefix}/GetServiceChargeByCollection`].post.requestBody = prabhuGetServiceChargeByCollectionBody;
paths[`${prabhuPrefix}/CancelTransaction`].post.requestBody = prabhuCancelTransactionBody;
paths[`${prabhuPrefix}/UnverifiedTransactions`].post.requestBody = prabhuCredentialsBody;
paths[`${prabhuPrefix}/ComplianceTransactions`].post.requestBody = prabhuCredentialsBody;
paths[`${prabhuPrefix}/UploadDocument`].post.requestBody = prabhuUploadDocumentBody;
paths[`${prabhuPrefix}/GetUnverifiedCustomers`].post.requestBody = prabhuCredentialsBody;
paths[`${prabhuPrefix}/RegisterComplaint`].post.requestBody = prabhuRegisterComplaintBody;
paths[`${prabhuPrefix}/TrackComplaint`].post.requestBody = prabhuTrackComplaintBody;

// ==================== PRABHU CSP & eKYC ENDPOINTS ====================

// eKYC Endpoints
paths[`${prabhuPrefix}/ekyc/generate-token`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Generate eKYC token",
    requestBody: prabhuEkycGenerateTokenBody,
    responses: {
      200: { description: "Token generated" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/ekyc/health-auth`] = {
  get: {
    tags: ["Prabhu"],
    summary: "eKYC health check",
    responses: {
      200: { description: "Health check" }
    }
  },
  post: {
    tags: ["Prabhu"],
    summary: "eKYC health check",
    requestBody: prabhuEkycGenerateTokenBody,
    responses: {
      200: { description: "Health check" }
    }
  }
};

paths[`${prabhuPrefix}/ekyc/initiate`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Initiate eKYC process",
    requestBody: prabhuEkycInitiateBody,
    responses: {
      200: { description: "eKYC initiated" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/ekyc/unique-ref-status`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Check eKYC unique reference status",
    requestBody: prabhuEkycUniqueRefStatusBody,
    responses: {
      200: { description: "Status retrieved" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/ekyc/enrollment`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Complete eKYC enrollment",
    requestBody: prabhuEkycEnrollmentBody,
    responses: {
      200: { description: "Enrollment completed" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/ekyc/customer-onboarding`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Customer onboarding with eKYC",
    requestBody: prabhuEkycCustomerOnboardingBody,
    responses: {
      200: { description: "Customer onboarded" },
      500: { description: "Server error" }
    }
  }
};

// CSP Endpoints
paths[`${prabhuPrefix}/csp/initiate`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Initiate CSP process",
    requestBody: prabhuCspInitiateBody,
    responses: {
      200: { description: "CSP initiated" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/csp/send-otp`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Send CSP OTP",
    requestBody: prabhuCspSendOtpBody,
    responses: {
      200: { description: "OTP sent" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/csp/unique-ref-status`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Check CSP unique reference status",
    requestBody: prabhuCspUniqueRefStatusBody,
    responses: {
      200: { description: "Status retrieved" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/csp/enrollment`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Complete CSP enrollment",
    requestBody: prabhuCspEnrollmentBody,
    responses: {
      200: { description: "Enrollment completed" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/csp/onboarding`] = {
  post: {
    tags: ["Prabhu"],
    summary: "CSP onboarding",
    requestBody: prabhuCspOnboardingBody,
    responses: {
      200: { description: "Onboarding completed" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/csp/search`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Search CSP records",
    requestBody: prabhuCspSearchBody,
    responses: {
      200: { description: "Search results" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/csp/create`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Create CSP record",
    requestBody: prabhuCspCreateBody,
    responses: {
      200: { description: "CSP created" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/csp/agent-consent`] = {
  post: {
    tags: ["Prabhu"],
    summary: "CSP agent consent",
    requestBody: prabhuCspAgentConsentBody,
    responses: {
      200: { description: "Consent processed" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/csp/mapping`] = {
  post: {
    tags: ["Prabhu"],
    summary: "CSP mapping",
    requestBody: prabhuCspMappingBody,
    responses: {
      200: { description: "Mapping completed" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/csp/bio-kyc-requery`] = {
  post: {
    tags: ["Prabhu"],
    summary: "CSP biometric KYC requery",
    requestBody: prabhuCspBioKycRequeryBody,
    responses: {
      200: { description: "Biometric KYC requery processed" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/csp/unique-ref-poll`] = {
  post: {
    tags: ["Prabhu"],
    summary: "CSP unique reference polling",
    requestBody: prabhuCspUniqueRefPollBody,
    responses: {
      200: { description: "Polling result" },
      500: { description: "Server error" }
    }
  }
};

// Workflow Endpoints
paths[`${prabhuPrefix}/workflow/step1-customer`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Workflow step 1 - Customer",
    requestBody: jsonBody,
    responses: {
      200: { description: "Step 1 completed" },
      500: { description: "Server error" }
    }
  }
};

paths[`${prabhuPrefix}/workflow/step2-receiver`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Workflow step 2 - Receiver",
    requestBody: jsonBody,
    responses: {
      200: { description: "Step 2 completed" },
      500: { description: "Server error" }
    }
  }
};

// Customer Search Endpoints
paths[`${prabhuPrefix}/customers/search/mobile/:mobile`] = {
  get: {
    tags: ["Prabhu"],
    summary: "Search customer by mobile (GET)",
    parameters: [
      { name: "mobile", in: "path", required: true, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "Customer found" },
      404: { description: "Customer not found" }
    }
  }
};

paths[`${prabhuPrefix}/customers/search/mobile`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Search customer by mobile (POST)",
    requestBody: jsonBody,
    responses: {
      200: { description: "Customer found" },
      404: { description: "Customer not found" }
    }
  }
};

// Data Management Endpoints
paths[`${prabhuPrefix}/data`] = {
  get: {
    tags: ["Prabhu"],
    summary: "List Prabhu data",
    responses: {
      200: { description: "Data list" }
    }
  },
  post: {
    tags: ["Prabhu"],
    summary: "Create Prabhu data",
    requestBody: jsonBody,
    responses: {
      201: { description: "Data created" }
    }
  }
};

paths[`${prabhuPrefix}/data/:id`] = {
  patch: {
    tags: ["Prabhu"],
    summary: "Update Prabhu data",
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } }
    ],
    requestBody: jsonBody,
    responses: {
      200: { description: "Data updated" }
    }
  },
  delete: {
    tags: ["Prabhu"],
    summary: "Delete Prabhu data",
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "Data deleted" }
    }
  }
};

paths[`${prabhuPrefix}/receivers`] = {
  get: {
    tags: ["Prabhu"],
    summary: "List Prabhu receivers",
    responses: {
      200: { description: "Receivers list" }
    }
  }
};

paths[`${prabhuPrefix}/receivers/upsert`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Upsert Prabhu receiver",
    requestBody: jsonBody,
    responses: {
      200: { description: "Receiver upserted" }
    }
  }
};

paths[`${prabhuPrefix}/senders`] = {
  get: {
    tags: ["Prabhu"],
    summary: "List Prabhu senders",
    responses: {
      200: { description: "Senders list" }
    }
  }
};

paths[`${prabhuPrefix}/senders/upsert`] = {
  post: {
    tags: ["Prabhu"],
    summary: "Upsert Prabhu sender",
    requestBody: jsonBody,
    responses: {
      200: { description: "Sender upserted" }
    }
  }
};

// ==================== CSP ENDPOINTS (/api prefix) ====================

paths["/api/csp/token"] = {
  post: {
    tags: ["CSP"],
    summary: "Generate CSP token",
    requestBody: prabhuEkycGenerateTokenBody,
    responses: {
      200: { description: "Token generated" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/csp/search"] = {
  post: {
    tags: ["CSP"],
    summary: "Search CSP records",
    requestBody: prabhuCspSearchBody,
    responses: {
      200: { description: "Search results" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/csp/send-otp"] = {
  post: {
    tags: ["CSP"],
    summary: "Send CSP OTP",
    requestBody: prabhuCspSendOtpBody,
    responses: {
      200: { description: "OTP sent" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/csp/create"] = {
  post: {
    tags: ["CSP"],
    summary: "Create CSP record",
    requestBody: prabhuCspCreateBody,
    responses: {
      200: { description: "CSP created" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/csp/mapping"] = {
  post: {
    tags: ["CSP"],
    summary: "CSP mapping",
    requestBody: prabhuCspMappingBody,
    responses: {
      200: { description: "Mapping completed" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/csp/initiate"] = {
  post: {
    tags: ["CSP"],
    summary: "Initiate CSP process",
    requestBody: prabhuCspInitiateBody,
    responses: {
      200: { description: "CSP initiated" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/csp/uniquerefstatus"] = {
  post: {
    tags: ["CSP"],
    summary: "Check CSP unique reference status",
    requestBody: prabhuCspUniqueRefStatusBody,
    responses: {
      200: { description: "Status retrieved" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/csp/enrollment"] = {
  post: {
    tags: ["CSP"],
    summary: "Complete CSP enrollment",
    requestBody: prabhuCspEnrollmentBody,
    responses: {
      200: { description: "Enrollment completed" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/csp/biokyc-requery"] = {
  post: {
    tags: ["CSP"],
    summary: "CSP biometric KYC requery",
    requestBody: prabhuCspBioKycRequeryBody,
    responses: {
      200: { description: "Biometric KYC requery processed" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/csp/onboarding"] = {
  post: {
    tags: ["CSP"],
    summary: "CSP onboarding",
    requestBody: prabhuCspOnboardingBody,
    responses: {
      200: { description: "Onboarding completed" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/csp/agent-consent"] = {
  post: {
    tags: ["CSP"],
    summary: "CSP agent consent",
    requestBody: prabhuCspAgentConsentBody,
    responses: {
      200: { description: "Consent processed" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/states"] = {
  get: {
    tags: ["CSP"],
    summary: "Get states list",
    responses: {
      200: { description: "States list" },
      500: { description: "Server error" }
    }
  }
};

// ==================== NEW MODULES (Tasks 2-10) ====================

// Profile Module
paths["/api/profile"] = {
  get: {
    tags: ["Profile"],
    summary: "Get user profile",
    security: bearerSecurity,
    responses: { 200: { description: "Profile data" }, 401: { description: "Unauthorized" } },
  },
  post: {
    tags: ["Profile"],
    summary: "Create or update profile",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 200: { description: "Profile saved" }, 401: { description: "Unauthorized" } },
  },
  delete: {
    tags: ["Profile"],
    summary: "Delete profile",
    security: bearerSecurity,
    responses: { 200: { description: "Profile deleted" }, 401: { description: "Unauthorized" } },
  },
};

// Job Profile Module
paths["/api/job-profile/my-profile"] = {
  get: {
    tags: ["Job Profile"],
    summary: "Get my job profile",
    security: bearerSecurity,
    responses: { 200: { description: "Job profile" }, 404: { description: "Profile not found" } },
  },
};

paths["/api/job-profile/save"] = {
  post: {
    tags: ["Job Profile"],
    summary: "Create or update comprehensive job profile",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: [
              "fullName", "phoneNumber", "maritalStatus", "gender", "dateOfBirth", "languages",
              "currentCountry", "currentState", "currentDistrict", "currentAddress", "currentPincode",
              "permanentCountry", "permanentState", "permanentDistrict", "permanentAddress", "permanentPincode",
              "jobType", "jobRole", "skills", "transactionType"
            ],
            properties: {
              // Personal Info
              fullName: { type: "string", example: "John Doe" },
              phoneNumber: { type: "string", example: "9876543210" },
              email: { type: "string", example: "john@example.com" },
              maritalStatus: { type: "string", enum: ["Married", "Unmarried"], example: "Unmarried" },
              gender: { type: "string", enum: ["Male", "Female"], example: "Male" },
              dateOfBirth: { type: "string", format: "date", example: "1990-01-01" },
              languages: { type: "array", items: { type: "string" }, example: ["Hindi", "English"] },
              // Current Address
              currentCountry: { type: "string", example: "India" },
              currentState: { type: "string", example: "Gujarat" },
              currentDistrict: { type: "string", example: "Ahmedabad" },
              currentAddress: { type: "string", example: "123 Main St" },
              currentPincode: { type: "string", example: "380001" },
              // Permanent Address
              permanentCountry: { type: "string", example: "India" },
              permanentState: { type: "string", example: "Gujarat" },
              permanentDistrict: { type: "string", example: "Ahmedabad" },
              permanentAddress: { type: "string", example: "456 Park Ave" },
              permanentPincode: { type: "string", example: "380002" },
              // Job Preferences
              jobType: { type: "string", enum: ["Daily wages", "Part time", "Full Time"], example: "Full Time" },
              jobRole: { type: "string", example: "Software Engineer" },
              jobRoleCategory: { type: "string", example: "IT" },
              skills: { type: "array", items: { type: "string" }, example: ["JavaScript", "Node.js"] },
              jobDescription: { type: "string", example: "Looking for developer role" },
              // Education
              education: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    level: { type: "string", example: "Bachelor" },
                    schoolName: { type: "string", example: "XYZ University" },
                    degree: { type: "string", example: "B.Tech" },
                    passingYear: { type: "integer", example: 2020 },
                    percentage: { type: "number", example: 85.5 }
                  }
                }
              },
              // Work Experience
              totalExperience: { type: "integer", example: 3 },
              workExperience: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    jobRole: { type: "string", example: "Developer" },
                    companyName: { type: "string", example: "ABC Corp" },
                    salary: { type: "number", example: 50000 },
                    yearsExp: { type: "number", example: 2 },
                    country: { type: "string", example: "India" },
                    city: { type: "string", example: "Mumbai" },
                    startDate: { type: "string", example: "2021-01-01" },
                    endDate: { type: "string", example: "2023-01-01" },
                    currentlyWorking: { type: "boolean", example: false }
                  }
                }
              },
              // Document
              documentType: { type: "string", enum: ["Aadhar", "Passport", "Driving License", "Voter Id"], example: "Aadhar" },
              documentFront: { type: "string", example: "https://cdn.example.com/doc-front.jpg" },
              documentBack: { type: "string", example: "https://cdn.example.com/doc-back.jpg" },
              documentNumber: { type: "string", example: "123456789012" },
              // Transaction Type
              transactionType: { type: "string", enum: ["ONLY_PROFILE", "PROFILE_WITH_RESUME"], example: "ONLY_PROFILE" }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Profile saved" }, 400: { description: "Validation error" } },
  },
};

paths["/api/job-profile/can-view-jobs"] = {
  get: {
    tags: ["Job Profile"],
    summary: "Check if user can view jobs",
    security: bearerSecurity,
    responses: { 200: { description: "Can view status" } },
  },
};

paths["/api/job-profile/categories"] = {
  get: {
    tags: ["Job Profile"],
    summary: "Get job categories and roles",
    security: bearerSecurity,
    responses: { 200: { description: "Categories list" } },
  },
};

paths["/api/job-profile/skills"] = {
  get: {
    tags: ["Job Profile"],
    summary: "Get available skills",
    security: bearerSecurity,
    responses: { 200: { description: "Skills list" } },
  },
};

paths["/api/job-profile/admin/category"] = {
  post: {
    tags: ["Job Profile"],
    summary: "Create job category (Admin)",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 201: { description: "Category created" } },
  },
};

paths["/api/job-profile/admin/role"] = {
  post: {
    tags: ["Job Profile"],
    summary: "Create job role (Admin)",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 201: { description: "Role created" } },
  },
};

paths["/api/job-profile/admin/skill"] = {
  post: {
    tags: ["Job Profile"],
    summary: "Create skill (Admin)",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 201: { description: "Skill created" } },
  },
};

paths["/api/job-profile/admin/pending-verifications"] = {
  get: {
    tags: ["Job Profile"],
    summary: "Get pending profile verifications (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Pending verifications" } },
  },
};

paths["/api/job-profile/admin/verify/{verificationId}"] = {
  patch: {
    tags: ["Job Profile"],
    summary: "Verify or reject profile (Admin)",
    security: bearerSecurity,
    parameters: [{ name: "verificationId", in: "path", required: true, schema: { type: "string" } }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["action"],
            properties: {
              action: { type: "string", enum: ["VERIFY", "REJECT"], example: "VERIFY" },
              rejectionReason: { type: "string", example: "Documents unclear" }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Verification processed" } },
  },
};

paths["/api/profile/skills"] = {
  post: {
    tags: ["Profile"],
    summary: "Add skills",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 200: { description: "Skills added" } },
  },
  delete: {
    tags: ["Profile"],
    summary: "Remove skills",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 200: { description: "Skills removed" } },
  },
};

paths["/api/profile/location"] = {
  patch: {
    tags: ["Profile"],
    summary: "Update location",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 200: { description: "Location updated" } },
  },
};

paths["/api/profile/education"] = {
  post: {
    tags: ["Profile"],
    summary: "Add education",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 200: { description: "Education added" } },
  },
};

// Business Module
paths["/api/business"] = {
  get: {
    tags: ["Business"],
    summary: "Get my business profile",
    security: bearerSecurity,
    responses: { 200: { description: "Business profile" } },
  },
  post: {
    tags: ["Business"],
    summary: "Register business",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 201: { description: "Business registered" } },
  },
  patch: {
    tags: ["Business"],
    summary: "Update business",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 200: { description: "Business updated" } },
  },
};

paths["/api/business/admin/all"] = {
  get: {
    tags: ["Business"],
    summary: "Get all businesses (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Business list" } },
  },
};

paths["/api/business/admin/{id}/verify"] = {
  patch: {
    tags: ["Business"],
    summary: "Verify business (Admin)",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    responses: { 200: { description: "Business verified" } },
  },
};

paths["/api/business/jobs"] = {
  get: {
    tags: ["Business"],
    summary: "Get my job postings",
    security: bearerSecurity,
    responses: { 200: { description: "Job list" } },
  },
  post: {
    tags: ["Business"],
    summary: "Post a job",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 201: { description: "Job posted" } },
  },
};

paths["/api/business/jobs/{jobId}/applicants"] = {
  get: {
    tags: ["Business"],
    summary: "Get job applicants",
    security: bearerSecurity,
    parameters: [{ name: "jobId", in: "path", required: true, schema: { type: "string" } }],
    responses: { 200: { description: "Applicant list" } },
  },
};

// Jobs Module
paths["/api/jobs/search"] = {
  get: {
    tags: ["Jobs"],
    summary: "Search jobs",
    security: bearerSecurity,
    responses: { 200: { description: "Job search results" } },
  },
};

paths["/api/jobs/recommended"] = {
  get: {
    tags: ["Jobs"],
    summary: "Get recommended jobs",
    security: bearerSecurity,
    responses: { 200: { description: "Recommended jobs" } },
  },
};

paths["/api/jobs/{id}"] = {
  get: {
    tags: ["Jobs"],
    summary: "Get job details",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    responses: { 200: { description: "Job details" } },
  },
};

paths["/api/jobs/{id}/apply"] = {
  post: {
    tags: ["Jobs"],
    summary: "Apply to job",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    requestBody: jsonBody,
    responses: { 200: { description: "Application submitted" } },
  },
};

paths["/api/jobs/my-applications"] = {
  get: {
    tags: ["Jobs"],
    summary: "Get my applications",
    security: bearerSecurity,
    responses: { 200: { description: "Application list" } },
  },
};

paths["/api/jobs/applications/{id}/withdraw"] = {
  patch: {
    tags: ["Jobs"],
    summary: "Withdraw application",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    responses: { 200: { description: "Application withdrawn" } },
  },
};

// Member Module
paths["/api/members/plans"] = {
  get: {
    tags: ["Members"],
    summary: "Get membership plans",
    security: bearerSecurity,
    responses: { 200: { description: "Plans list" } },
  },
};

paths["/api/members/my-membership"] = {
  get: {
    tags: ["Members"],
    summary: "Get my membership",
    security: bearerSecurity,
    responses: { 200: { description: "Membership details" } },
  },
};

paths["/api/members/upgrade"] = {
  post: {
    tags: ["Members"],
    summary: "Upgrade to member",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 200: { description: "Membership upgraded" } },
  },
};

paths["/api/members/renew"] = {
  post: {
    tags: ["Members"],
    summary: "Renew membership",
    security: bearerSecurity,
    responses: { 200: { description: "Membership renewed" } },
  },
};

paths["/api/members/auto-renew"] = {
  patch: {
    tags: ["Members"],
    summary: "Toggle auto-renew",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 200: { description: "Auto-renew updated" } },
  },
};

paths["/api/members/admin/all"] = {
  get: {
    tags: ["Members"],
    summary: "Get all members (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Member list" } },
  },
};

// Saathi Module
paths["/api/saathi/search"] = {
  get: {
    tags: ["Saathi"],
    summary: "Search Saathis (agents)",
    security: bearerSecurity,
    responses: { 200: { description: "Saathi list" } },
  },
};

paths["/api/saathi/{id}"] = {
  get: {
    tags: ["Saathi"],
    summary: "Get Saathi details",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    responses: { 200: { description: "Saathi details" } },
  },
};

paths["/api/saathi/{id}/book"] = {
  post: {
    tags: ["Saathi"],
    summary: "Book Saathi",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    requestBody: jsonBody,
    responses: { 201: { description: "Booking created" } },
  },
};

paths["/api/saathi/my-bookings"] = {
  get: {
    tags: ["Saathi"],
    summary: "Get my bookings",
    security: bearerSecurity,
    responses: { 200: { description: "Booking list" } },
  },
};

paths["/api/saathi/bookings/{id}/cancel"] = {
  patch: {
    tags: ["Saathi"],
    summary: "Cancel booking",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    responses: { 200: { description: "Booking cancelled" } },
  },
};

paths["/api/saathi/agent/bookings"] = {
  get: {
    tags: ["Saathi"],
    summary: "Get agent bookings",
    security: bearerSecurity,
    responses: { 200: { description: "Booking list" } },
  },
};

paths["/api/saathi/agent/bookings/{id}/status"] = {
  patch: {
    tags: ["Saathi"],
    summary: "Update booking status",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    requestBody: jsonBody,
    responses: { 200: { description: "Status updated" } },
  },
};

paths["/api/saathi/agent/stats"] = {
  get: {
    tags: ["Saathi"],
    summary: "Get agent stats",
    security: bearerSecurity,
    responses: { 200: { description: "Agent statistics" } },
  },
};

paths["/api/saathi/admin/all"] = {
  get: {
    tags: ["Saathi"],
    summary: "Get all Saathis (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Saathi list" } },
  },
};

paths["/api/saathi/admin/bookings"] = {
  get: {
    tags: ["Saathi"],
    summary: "Get all bookings (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "All bookings" } },
  },
};

// Scheme Module
// Scheme Module
paths["/api/schemes"] = {
  get: {
    tags: ["Schemes"],
    summary: "List schemes",
    security: bearerSecurity,
    responses: { 200: { description: "Scheme list" } },
  },
  post: {
    tags: ["Schemes"],
    summary: "Create scheme",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 201: { description: "Scheme created" } },
  },
};

paths["/api/schemes/categories"] = {
  get: {
    tags: ["Schemes"],
    summary: "Get scheme categories",
    security: bearerSecurity,
    responses: { 200: { description: "Categories" } },
  },
};

paths["/api/schemes/{id}"] = {
  get: {
    tags: ["Schemes"],
    summary: "Get scheme details",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    responses: { 200: { description: "Scheme details" } },
  },
  patch: {
    tags: ["Schemes"],
    summary: "Update scheme",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    requestBody: jsonBody,
    responses: { 200: { description: "Scheme updated" } },
  },
};

paths["/api/schemes/{id}/eligibility"] = {
  get: {
    tags: ["Schemes"],
    summary: "Check eligibility",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    responses: { 200: { description: "Eligibility result" } },
  },
};

paths["/api/schemes/{id}/deactivate"] = {
  patch: {
    tags: ["Schemes"],
    summary: "Deactivate scheme",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    responses: { 200: { description: "Scheme deactivated" } },
  },
};

paths["/api/schemes/my-schemes"] = {
  get: {
    tags: ["Schemes"],
    summary: "Get my schemes",
    security: bearerSecurity,
    responses: { 200: { description: "My schemes" } },
  },
};

paths["/api/schemes/admin/all"] = {
  get: {
    tags: ["Schemes"],
    summary: "Get all schemes (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "All schemes" } },
  },
};

// Wallet Module
paths["/api/wallet"] = {
  get: {
    tags: ["Wallet"],
    summary: "Get my wallet",
    security: bearerSecurity,
    responses: { 200: { description: "Wallet details" } },
  },
};

paths["/api/wallet/transactions"] = {
  get: {
    tags: ["Wallet"],
    summary: "Get transactions",
    security: bearerSecurity,
    responses: { 200: { description: "Transaction list" } },
  },
};

paths["/api/wallet/topup"] = {
  post: {
    tags: ["Wallet"],
    summary: "Request top-up",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 201: { description: "Top-up requested" } },
  },
};

paths["/api/wallet/topups/pending"] = {
  get: {
    tags: ["Wallet"],
    summary: "Get pending top-ups",
    security: bearerSecurity,
    responses: { 200: { description: "Pending top-ups" } },
  },
};

paths["/api/wallet/admin/topups/pending"] = {
  get: {
    tags: ["Wallet"],
    summary: "Get all pending top-ups (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Pending top-ups" } },
  },
};

paths["/api/wallet/admin/topups/{id}/approve"] = {
  patch: {
    tags: ["Wallet"],
    summary: "Approve top-up (Admin)",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    requestBody: jsonBody,
    responses: { 200: { description: "Top-up approved" } },
  },
};

paths["/api/wallet/admin/add-money"] = {
  post: {
    tags: ["Wallet"],
    summary: "Add money to wallet (Admin)",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 200: { description: "Money added" } },
  },
};

paths["/api/wallet/admin/deduct-money"] = {
  post: {
    tags: ["Wallet"],
    summary: "Deduct money from wallet (Admin)",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 200: { description: "Money deducted" } },
  },
};

paths["/api/wallet/admin/all"] = {
  get: {
    tags: ["Wallet"],
    summary: "Get all wallets (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Wallet list" } },
  },
};

paths["/api/wallet/admin/stats"] = {
  get: {
    tags: ["Wallet"],
    summary: "Get wallet stats (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Wallet statistics" } },
  },
};

// Payment Module
paths["/api/payments/order/wallet"] = {
  post: {
    tags: ["Payments"],
    summary: "Create wallet top-up order",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 200: { description: "Order created" } },
  },
};

paths["/api/payments/order/membership"] = {
  post: {
    tags: ["Payments"],
    summary: "Create membership order",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 200: { description: "Order created" } },
  },
};

paths["/api/payments/verify"] = {
  post: {
    tags: ["Payments"],
    summary: "Verify payment",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 200: { description: "Payment verified" } },
  },
};

paths["/api/payments/admin/all"] = {
  get: {
    tags: ["Payments"],
    summary: "Get all payments (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Payment list" } },
  },
};

paths["/api/payments/admin/stats"] = {
  get: {
    tags: ["Payments"],
    summary: "Get payment stats (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Payment statistics" } },
  },
};

// Service Registry Module
paths["/api/services/active"] = {
  get: {
    tags: ["Services"],
    summary: "Get active services",
    security: bearerSecurity,
    responses: { 200: { description: "Active services" } },
  },
};

paths["/api/services/service/{name}"] = {
  get: {
    tags: ["Services"],
    summary: "Get service by name",
    security: bearerSecurity,
    parameters: [{ name: "name", in: "path", required: true, schema: { type: "string" } }],
    responses: { 200: { description: "Service details" } },
  },
};

paths["/api/services/failover/{name}"] = {
  get: {
    tags: ["Services"],
    summary: "Get failover chain",
    security: bearerSecurity,
    parameters: [{ name: "name", in: "path", required: true, schema: { type: "string" } }],
    responses: { 200: { description: "Failover chain" } },
  },
};

paths["/api/services/best/{type}"] = {
  get: {
    tags: ["Services"],
    summary: "Get best service for type",
    security: bearerSecurity,
    parameters: [{ name: "type", in: "path", required: true, schema: { type: "string" } }],
    responses: { 200: { description: "Best service" } },
  },
};

paths["/api/services/admin/all"] = {
  get: {
    tags: ["Services"],
    summary: "Get all services (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Service list" } },
  },
};

paths["/api/services/admin"] = {
  post: {
    tags: ["Services"],
    summary: "Create service (Admin)",
    security: bearerSecurity,
    requestBody: jsonBody,
    responses: { 201: { description: "Service created" } },
  },
};

paths["/api/services/admin/{id}"] = {
  patch: {
    tags: ["Services"],
    summary: "Update service (Admin)",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    requestBody: jsonBody,
    responses: { 200: { description: "Service updated" } },
  },
  delete: {
    tags: ["Services"],
    summary: "Delete service (Admin)",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    responses: { 200: { description: "Service deleted" } },
  },
};

paths["/api/services/admin/{id}/status"] = {
  patch: {
    tags: ["Services"],
    summary: "Toggle service status (Admin)",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    requestBody: jsonBody,
    responses: { 200: { description: "Status updated" } },
  },
};

paths["/api/services/admin/{id}/health"] = {
  patch: {
    tags: ["Services"],
    summary: "Update service health (Admin)",
    security: bearerSecurity,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    requestBody: jsonBody,
    responses: { 200: { description: "Health updated" } },
  },
};

paths["/api/services/admin/initialize"] = {
  post: {
    tags: ["Services"],
    summary: "Initialize default services (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Services initialized" } },
  },
};

paths["/api/services/admin/stats"] = {
  get: {
    tags: ["Services"],
    summary: "Get service stats (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Service statistics" } },
  },
};

// Role Upgrade Module
paths["/api/role-upgrade/available"] = {
  get: {
    tags: ["Role Upgrade"],
    summary: "Get available role upgrades",
    security: bearerSecurity,
    responses: { 200: { description: "Available upgrades" } },
  },
};

paths["/api/role-upgrade/my-status"] = {
  get: {
    tags: ["Role Upgrade"],
    summary: "Get my upgrade request status",
    security: bearerSecurity,
    responses: { 200: { description: "Upgrade status" } },
  },
};

paths["/api/role-upgrade/request"] = {
  post: {
    tags: ["Role Upgrade"],
    summary: "Submit role upgrade request",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["targetRole"],
            properties: {
              targetRole: { type: "string", enum: ["MEMBER", "AGENT"], example: "AGENT" },
              paymentId: { type: "string", nullable: true, example: "payment-uuid" }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Request submitted" }, 400: { description: "Payment required" } },
  },
};

paths["/api/role-upgrade/payment-order"] = {
  post: {
    tags: ["Role Upgrade"],
    summary: "Create payment order for upgrade",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["targetRole"],
            properties: {
              targetRole: { type: "string", enum: ["MEMBER", "AGENT"], example: "AGENT" }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Payment order created" } },
  },
};

paths["/api/role-upgrade/admin/pending"] = {
  get: {
    tags: ["Role Upgrade"],
    summary: "Get pending upgrade requests (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Pending requests" } },
  },
};

paths["/api/role-upgrade/admin/{userId}/process"] = {
  patch: {
    tags: ["Role Upgrade"],
    summary: "Approve or reject upgrade (Admin)",
    security: bearerSecurity,
    parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["action"],
            properties: {
              action: { type: "string", enum: ["APPROVE", "REJECT"], example: "APPROVE" },
              reason: { type: "string", nullable: true, example: "Documents verified" }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Request processed" } },
  },
};

// Hierarchy Module
paths["/api/hierarchy/my-hierarchy"] = {
  get: {
    tags: ["Hierarchy"],
    summary: "Get my hierarchy info",
    security: bearerSecurity,
    responses: { 200: { description: "Hierarchy info" } },
  },
};

paths["/api/hierarchy/my-team"] = {
  get: {
    tags: ["Hierarchy"],
    summary: "Get my team members",
    security: bearerSecurity,
    responses: { 200: { description: "Team list" } },
  },
};

paths["/api/hierarchy/my-tree"] = {
  get: {
    tags: ["Hierarchy"],
    summary: "Get my full hierarchy tree",
    security: bearerSecurity,
    responses: { 200: { description: "Hierarchy tree" } },
  },
};

paths["/api/hierarchy/structure"] = {
  get: {
    tags: ["Hierarchy"],
    summary: "Get hierarchy structure",
    security: bearerSecurity,
    responses: { 200: { description: "Hierarchy structure" } },
  },
};

paths["/api/hierarchy/create"] = {
  post: {
    tags: ["Hierarchy"],
    summary: "Create user in hierarchy (enforced)",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["mobile", "fullName", "password", "identity"],
            properties: {
              mobile: { type: "string", example: "98XXXXXXXX" },
              fullName: { type: "string", example: "John Doe" },
              password: { type: "string", example: "Strong@123" },
              identity: { type: "string", enum: ["SUB_ADMIN", "COUNTRY_HEAD", "STATE_HEAD", "DISTRICT_PARTNER", "AGENT", "USER"], example: "AGENT" },
              gender: { type: "string", example: "MALE" },
              dateOfBirth: { type: "string", example: "1990-01-01" },
              parentId: { type: "string", nullable: true, example: "user-uuid" }
            }
          }
        }
      }
    },
    responses: { 201: { description: "User created" }, 403: { description: "Hierarchy violation" } },
  },
};

paths["/api/hierarchy/admin/create"] = {
  post: {
    tags: ["Hierarchy"],
    summary: "Create user in hierarchy (Admin - no restrictions)",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["mobile", "fullName", "password", "identity"],
            properties: {
              mobile: { type: "string", example: "98XXXXXXXX" },
              fullName: { type: "string", example: "John Doe" },
              password: { type: "string", example: "Strong@123" },
              identity: { type: "string", enum: ["SUB_ADMIN", "COUNTRY_HEAD", "STATE_HEAD", "DISTRICT_PARTNER", "AGENT", "USER"], example: "AGENT" },
              gender: { type: "string", example: "MALE" },
              dateOfBirth: { type: "string", example: "1990-01-01" },
              parentId: { type: "string", nullable: true, example: "user-uuid" }
            }
          }
        }
      }
    },
    responses: { 201: { description: "User created" } },
  },
};

// ============================================
// JOB POSTING MODULE
// ============================================

paths["/api/job-posting/jobs"] = {
  post: {
    tags: ["Job Posting"],
    summary: "Create a new job posting (Admin or Business Partner)",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["jobRole", "jobDescription", "jobType", "payStructure", "offeredAmount", "country", "state", "district", "pincode", "fullAddress", "contactName", "contactNumber"],
            properties: {
              jobRole: { type: "string", example: "Software Engineer" },
              jobDescription: { type: "string", example: "Looking for experienced software engineer..." },
              requiredSkills: { type: "array", items: { type: "string" }, example: ["JavaScript", "Node.js"] },
              jobType: { type: "string", enum: ["Daily Wages", "Part Time", "Full Time"], example: "Full Time" },
              payStructure: { type: "string", enum: ["Daily Wages", "Part Time", "Full Time"], example: "Full Time" },
              offeredAmount: { type: "number", example: 50000 },
              openings: { type: "integer", example: 5 },
              shift: { type: "string", example: "Day" },
              urgentHiring: { type: "boolean", example: false },
              education: { type: "string", example: "Bachelor's Degree" },
              experience: { type: "integer", example: 2 },
              gender: { type: "string", example: "Any" },
              minAge: { type: "integer", example: 21 },
              maxAge: { type: "integer", example: 35 },
              country: { type: "string", example: "India" },
              state: { type: "string", example: "Gujarat" },
              district: { type: "string", example: "Ahmedabad" },
              pincode: { type: "string", example: "380001" },
              fullAddress: { type: "string", example: "123 Business Park, SG Highway" },
              weekOffDays: { type: "string", example: "Sunday" },
              facilities: { type: "array", items: { type: "string" }, example: ["PF", "Health Insurance"] },
              joiningFees: { type: "boolean", example: false },
              contactName: { type: "string", example: "HR Manager" },
              contactNumber: { type: "string", example: "9876543210" }
            }
          }
        }
      }
    },
    responses: {
      201: { description: "Job posted successfully" },
      402: { description: "Insufficient credits - payment required" },
      403: { description: "Not authorized to post jobs" }
    }
  }
};

paths["/api/job-posting/jobs/my-posted"] = {
  get: {
    tags: ["Job Posting"],
    summary: "Get jobs posted by current user",
    security: bearerSecurity,
    parameters: [
      { name: "status", in: "query", schema: { type: "string" } },
      { name: "page", in: "query", schema: { type: "integer", default: 1 } },
      { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
    ],
    responses: { 200: { description: "List of posted jobs" } }
  }
};

paths["/api/job-posting/jobs/credits"] = {
  get: {
    tags: ["Job Posting"],
    summary: "Get job posting credits (Business Partner only)",
    security: bearerSecurity,
    responses: { 200: { description: "Job credits info" } }
  }
};

paths["/api/job-posting/jobs/facilities"] = {
  get: {
    tags: ["Job Posting"],
    summary: "Get all active facilities for job posting",
    security: bearerSecurity,
    responses: { 200: { description: "List of facilities" } }
  }
};

paths["/api/job-posting/jobs/{id}"] = {
  get: {
    tags: ["Job Posting"],
    summary: "Get job by ID",
    security: bearerSecurity,
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } }
    ],
    responses: { 200: { description: "Job details" } }
  },
  patch: {
    tags: ["Job Posting"],
    summary: "Update a job posting",
    security: bearerSecurity,
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } }
    ],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              jobRole: { type: "string" },
              jobDescription: { type: "string" },
              offeredAmount: { type: "number" },
              openings: { type: "integer" },
              status: { type: "string", enum: ["ACTIVE", "CLOSED", "FILLED"] }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Job updated" } }
  }
};

paths["/api/job-posting/jobs/{id}/close"] = {
  patch: {
    tags: ["Job Posting"],
    summary: "Close a job posting",
    security: bearerSecurity,
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } }
    ],
    responses: { 200: { description: "Job closed" } }
  }
};

// Admin Job Posting APIs
paths["/api/job-posting/admin/jobs/facilities"] = {
  post: {
    tags: ["Job Posting"],
    summary: "Create a facility (Admin only)",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["name"],
            properties: {
              name: { type: "string", example: "Health Insurance" },
              description: { type: "string", example: "Comprehensive health coverage" },
              icon: { type: "string", example: "https://example.com/icon.png" }
            }
          }
        }
      }
    },
    responses: { 201: { description: "Facility created" } }
  },
  get: {
    tags: ["Job Posting"],
    summary: "Get all facilities including inactive (Admin only)",
    security: bearerSecurity,
    parameters: [
      { name: "page", in: "query", schema: { type: "integer", default: 1 } },
      { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
    ],
    responses: { 200: { description: "List of all facilities" } }
  }
};

paths["/api/job-posting/admin/jobs/facilities/{id}"] = {
  patch: {
    tags: ["Job Posting"],
    summary: "Update a facility (Admin only)",
    security: bearerSecurity,
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } }
    ],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              icon: { type: "string" },
              isActive: { type: "boolean" }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Facility updated" } }
  }
};

paths["/api/job-posting/admin/jobs"] = {
  get: {
    tags: ["Job Posting"],
    summary: "Get all jobs (Admin only)",
    security: bearerSecurity,
    parameters: [
      { name: "status", in: "query", schema: { type: "string" } },
      { name: "postedByRole", in: "query", schema: { type: "string" } },
      { name: "state", in: "query", schema: { type: "string" } },
      { name: "district", in: "query", schema: { type: "string" } },
      { name: "page", in: "query", schema: { type: "integer", default: 1 } },
      { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
    ],
    responses: { 200: { description: "List of all jobs" } }
  }
};

paths["/api/job-posting/admin/jobs/posting-fee"] = {
  post: {
    tags: ["Job Posting"],
    summary: "Set job posting fee (Admin only)",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["amount"],
            properties: {
              amount: { type: "number", example: 100 }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Fee updated" } }
  },
  get: {
    tags: ["Job Posting"],
    summary: "Get job posting fee (Admin only)",
    security: bearerSecurity,
    responses: { 200: { description: "Current fee" } }
  }
};

// ============================================
// MEMBER & AGENT REGISTRATION MODULE
// ============================================

// Member Routes
paths["/api/member-agent/members/register"] = {
  post: {
    tags: ["Member & Agent"],
    summary: "Register as member (User - with payment)",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["firstName", "lastName"],
            properties: {
              firstName: { type: "string", example: "John" },
              lastName: { type: "string", example: "Doe" },
              birthDate: { type: "string", example: "1990-01-01" },
              email: { type: "string", example: "john@example.com" },
              profilePhoto: { type: "string" },
              imageName: { type: "string" },
              genderId: { type: "string" },
              maritalStatus: { type: "string" },
              citizen: { type: "string" },
              education: { type: "string" },
              occupation: { type: "string" },
              sector: { type: "string" },
              jobRoles: { type: "array", items: { type: "string" } },
              isMigrantWorker: { type: "boolean", example: false },
              incomeAboveThreshold: { type: "boolean", example: false },
              parentId: { type: "string" },
              addresses: { type: "array" },
              documents: { type: "array" },
              razorPayReferenceNo: { type: "string" },
              paymentMode: { type: "string", example: "ONLINE" }
            }
          }
        }
      }
    },
    responses: {
      201: { description: "Member registered" },
      402: { description: "Insufficient balance" }
    }
  }
};

paths["/api/member-agent/members/me"] = {
  get: {
    tags: ["Member & Agent"],
    summary: "Get my member profile",
    security: bearerSecurity,
    responses: { 200: { description: "Member profile" } }
  },
  patch: {
    tags: ["Member & Agent"],
    summary: "Update my member profile",
    security: bearerSecurity,
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              firstName: { type: "string" },
              lastName: { type: "string" },
              email: { type: "string" },
              addresses: { type: "array" },
              documents: { type: "array" }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Profile updated" } }
  }
};

// Agent Routes
paths["/api/member-agent/agents/register"] = {
  post: {
    tags: ["Member & Agent"],
    summary: "Register as agent (User - with payment)",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["aadharNumber", "panCardNo", "shopName"],
            properties: {
              aadharNumber: { type: "string" },
              maskAadharNumber: { type: "string" },
              aadhaarFatherName: { type: "string" },
              aadhaarName: { type: "string" },
              aadhaarAddress: { type: "string" },
              aadhaarDOB: { type: "string" },
              panCardNo: { type: "string" },
              panFirstName: { type: "string" },
              panLastName: { type: "string" },
              computerLiteracy: { type: "boolean" },
              isPC: { type: "boolean" },
              isEKYCDevice: { type: "boolean" },
              shopName: { type: "string" },
              shopType: { type: "string" },
              licenceNo: { type: "string" },
              shopAddress: { type: "string" },
              shopDistrictId: { type: "string" },
              shopStateId: { type: "string" },
              shopPinCode: { type: "string" },
              documents: { type: "array" },
              sections: { type: "array", items: { type: "string" } },
              schemeFees: { type: "number" },
              razorPayReferenceNo: { type: "string" }
            }
          }
        }
      }
    },
    responses: {
      201: { description: "Agent registration submitted" },
      402: { description: "Insufficient balance" }
    }
  }
};

paths["/api/member-agent/agents/upgrade"] = {
  post: {
    tags: ["Member & Agent"],
    summary: "Member upgrade to agent (with payment)",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["aadharNumber", "panCardNo", "shopName"],
            properties: {
              aadharNumber: { type: "string" },
              panCardNo: { type: "string" },
              shopName: { type: "string" },
              shopAddress: { type: "string" },
              documents: { type: "array" },
              razorPayReferenceNo: { type: "string" }
            }
          }
        }
      }
    },
    responses: {
      201: { description: "Upgrade submitted" },
      402: { description: "Insufficient balance" },
      403: { description: "Must be a member" }
    }
  }
};

paths["/api/member-agent/agents/me"] = {
  get: {
    tags: ["Member & Agent"],
    summary: "Get my agent profile",
    security: bearerSecurity,
    responses: { 200: { description: "Agent profile" } }
  },
  patch: {
    tags: ["Member & Agent"],
    summary: "Update my agent profile",
    security: bearerSecurity,
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              shopName: { type: "string" },
              shopAddress: { type: "string" },
              documents: { type: "array" }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Profile updated" } }
  }
};

// Admin Member Routes
paths["/api/member-agent/admin/members"] = {
  post: {
    tags: ["Member & Agent"],
    summary: "Create member (Admin - no payment)",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["userId"],
            properties: {
              userId: { type: "string" },
              firstName: { type: "string" },
              lastName: { type: "string" },
              email: { type: "string" },
              addresses: { type: "array" },
              documents: { type: "array" }
            }
          }
        }
      }
    },
    responses: { 201: { description: "Member created" } }
  },
  get: {
    tags: ["Member & Agent"],
    summary: "Get all members (Admin)",
    security: bearerSecurity,
    parameters: [
      { name: "status", in: "query", schema: { type: "string" } },
      { name: "isAdminCreated", in: "query", schema: { type: "boolean" } },
      { name: "page", in: "query", schema: { type: "integer", default: 1 } },
      { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
    ],
    responses: { 200: { description: "List of members" } }
  }
};

paths["/api/member-agent/admin/members/{id}"] = {
  get: {
    tags: ["Member & Agent"],
    summary: "Get member by ID (Admin)",
    security: bearerSecurity,
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } }
    ],
    responses: { 200: { description: "Member details" } }
  },
  patch: {
    tags: ["Member & Agent"],
    summary: "Update member (Admin)",
    security: bearerSecurity,
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } }
    ],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              firstName: { type: "string" },
              lastName: { type: "string" },
              status: { type: "string", enum: ["ACTIVE", "EXPIRED", "CANCELLED"] },
              autoRenew: { type: "boolean" }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Member updated" } }
  }
};

paths["/api/member-agent/admin/members/fee"] = {
  post: {
    tags: ["Member & Agent"],
    summary: "Set member registration fee (Admin)",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["amount"],
            properties: {
              amount: { type: "number", example: 500 }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Fee updated" } }
  },
  get: {
    tags: ["Member & Agent"],
    summary: "Get member registration fee (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Current fee" } }
  }
};

// Admin Agent Routes
paths["/api/member-agent/admin/agents"] = {
  post: {
    tags: ["Member & Agent"],
    summary: "Create agent (Admin - no payment)",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["userId", "aadharNumber", "panCardNo", "shopName"],
            properties: {
              userId: { type: "string" },
              aadharNumber: { type: "string" },
              panCardNo: { type: "string" },
              shopName: { type: "string" },
              shopAddress: { type: "string" },
              documents: { type: "array" }
            }
          }
        }
      }
    },
    responses: { 201: { description: "Agent created" } }
  },
  get: {
    tags: ["Member & Agent"],
    summary: "Get all agents (Admin)",
    security: bearerSecurity,
    parameters: [
      { name: "status", in: "query", schema: { type: "string" } },
      { name: "isAdminCreated", in: "query", schema: { type: "boolean" } },
      { name: "upgradedFromMember", in: "query", schema: { type: "boolean" } },
      { name: "page", in: "query", schema: { type: "integer", default: 1 } },
      { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
    ],
    responses: { 200: { description: "List of agents" } }
  }
};

paths["/api/member-agent/admin/agents/{id}"] = {
  get: {
    tags: ["Member & Agent"],
    summary: "Get agent by ID (Admin)",
    security: bearerSecurity,
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } }
    ],
    responses: { 200: { description: "Agent details" } }
  },
  patch: {
    tags: ["Member & Agent"],
    summary: "Update agent (Admin)",
    security: bearerSecurity,
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } }
    ],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              shopName: { type: "string" },
              status: { type: "string", enum: ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"] },
              isAadharApproved: { type: "boolean" },
              isPanCardApproved: { type: "boolean" }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Agent updated" } }
  }
};

paths["/api/member-agent/admin/agents/{id}/approve"] = {
  patch: {
    tags: ["Member & Agent"],
    summary: "Approve or reject agent (Admin)",
    security: bearerSecurity,
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } }
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["status"],
            properties: {
              status: { type: "string", enum: ["ACTIVE", "REJECTED"] },
              rejectionReason: { type: "string" }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Agent approved/rejected" } }
  }
};

paths["/api/member-agent/admin/agents/fee"] = {
  post: {
    tags: ["Member & Agent"],
    summary: "Set agent fees (Admin)",
    security: bearerSecurity,
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["type", "amount"],
            properties: {
              type: { type: "string", enum: ["AGENT_REGISTRATION_FEE", "MEMBER_TO_AGENT_UPGRADE_FEE"] },
              amount: { type: "number", example: 1000 }
            }
          }
        }
      }
    },
    responses: { 200: { description: "Fee updated" } }
  },
  get: {
    tags: ["Member & Agent"],
    summary: "Get agent fees (Admin)",
    security: bearerSecurity,
    responses: { 200: { description: "Agent fees" } }
  }
};

// --- Added Missing API Endpoints Placeholders ---

// Device Module
paths["/api/devices"] = {
  get: { tags: ["Device"], summary: "Get devices", security: bearerSecurity, responses: { 200: { description: "Success" } } },
};

// Membership Module
paths["/api/membership"] = {
  get: { tags: ["Membership"], summary: "Get membership details", security: bearerSecurity, responses: { 200: { description: "Success" } } },
};
paths["/api/admin/membership"] = {
  get: { tags: ["Membership"], summary: "Admin membership details", security: bearerSecurity, responses: { 200: { description: "Success" } } },
};

// RD Services
paths["/api/rd"] = {
  get: { tags: ["RD Services"], summary: "RD Services endpoint", security: bearerSecurity, responses: { 200: { description: "Success" } } },
};

// Profile & Job Profile
paths["/api/profile"] = {
  get: { tags: ["Profile"], summary: "Get profile", security: bearerSecurity, responses: { 200: { description: "Success" } } },
};
paths["/api/job-profile"] = {
  get: { tags: ["Job Profile"], summary: "Get job profile", security: bearerSecurity, responses: { 200: { description: "Success" } } },
};

// Business & Jobs
paths["/api/business"] = {
  get: { tags: ["Business"], summary: "Get businesses", security: bearerSecurity, responses: { 200: { description: "Success" } } },
};
paths["/api/jobs"] = {
  get: { tags: ["Jobs"], summary: "Get jobs", security: bearerSecurity, responses: { 200: { description: "Success" } } },
};
paths["/api/job-posting"] = {
  get: { tags: ["Job Posting"], summary: "Get job postings", security: bearerSecurity, responses: { 200: { description: "Success" } } },
};

// Master/Setup
paths["/api/setup"] = {
  get: { tags: ["Setup"], summary: "Setup configurations", security: bearerSecurity, responses: { 200: { description: "Success" } } },
};
paths["/api/setup-location"] = {
  get: { tags: ["Setup"], summary: "Setup location data", security: bearerSecurity, responses: { 200: { description: "Success" } } },
};
paths["/api/setup-job-table"] = {
  get: { tags: ["Setup"], summary: "Setup job tables", security: bearerSecurity, responses: { 200: { description: "Success" } } },
};
paths["/api/location"] = {
  get: { tags: ["Location"], summary: "Location endpoints", security: bearerSecurity, responses: { 200: { description: "Success" } } },
};

// Member endpoints
paths["/api/member"] = {
  get: { tags: ["Members"], summary: "Get member info", security: bearerSecurity, responses: { 200: { description: "Success" } } },
};


module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Online Saathi Backend API",
    version: "1.0.0",
    description:
      "Live testing documentation for backend endpoints. Use Authorize with Bearer token for protected routes. IME and Prabhu integrations for remittance services.",
  },
  servers: [{ url: serverUrl }],
  tags: [
    { name: "System" },
    { name: "Auth" },
    { name: "Users" },
    { name: "Profile" },
    { name: "Job Profile" },
    { name: "Business" },
    { name: "Jobs" },
    { name: "Members" },
    { name: "Saathi" },
    { name: "Schemes" },
    { name: "Wallet" },
    { name: "Payments" },
    { name: "Services" },
    { name: "Hierarchy" },
    { name: "Role Upgrade" },
    { name: "Job Posting" },
    { name: "Member & Agent" },
    { name: "Admin" },
    { name: "Super Admin" },
    { name: "Prabhu" },
    { name: "IME" },
    { name: "CSP" },
    { name: "Device" },
    { name: "Membership" },
    { name: "RD Services" },
    { name: "Location" },
    { name: "Setup" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  paths,
};
