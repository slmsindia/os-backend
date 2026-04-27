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
          IDType: { type: "string", enum: ["PP", "DL", "NP_ID", "AADHAR"], example: "NP_ID" },
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
        required: ["EntityId"],
        properties: {
          EntityType: { type: "string", example: "Customer" },
          EntityId: { type: "string", example: "CUST123" },
          CustomerId: { type: "string", example: "CUST123", description: "Backward-compatible alias for EntityId" },
          MobileNo: { type: "string", example: "9800000000", description: "Optional alias source when CustomerId is unavailable" }
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

const imeSendTransactionBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: [
          "SenderName",
          "SenderMobileNo", 
          "ReceiverName",
          "ReceiverAddress",
          "ReceiverGender",
          "ReceiverMobileNo",
          "ReceiverCountry",
          "ReceiverState",
          "ReceiverDistrict", 
          "ReceiverMunicipality",
          "ForexSessionId",
          "CollectAmount",
          "PayoutAmount",
          "SourceOfFund",
          "Relationship",
          "PurposeOfRemittance",
          "PaymentType",
          "CalcBy"
        ],
        properties: {
          // Sender Details
          SenderName: { type: "string", example: "Hemraj Thapa", description: "Sender's full name" },
          SenderMobileNo: { type: "string", example: "7041897207", description: "Registered customer mobile number" },
          Occupation: { type: "string", example: "8081", description: "Occupation ID from IME Static Data (WSST-OCPV1)" },
          
          // Receiver Details  
          ReceiverName: { type: "string", example: "Sita Sharma", description: "Receiver full name in Nepal" },
          ReceiverAddress: { type: "string", example: "Kathmandu, Nepal", description: "Receiver address" },
          ReceiverGender: { type: "string", example: "F", description: "Receiver gender (M/F)" },
          ReceiverMobileNo: { type: "string", example: "9801234567", description: "Receiver mobile number in Nepal" },
          ReceiverCity: { type: "string", example: "Kathmandu", description: "Receiver's city (optional)" },
          ReceiverCountry: { type: "string", example: "NPL", description: "Always NPL for Nepal" },
          ReceiverState: { type: "string", example: "1001", description: "Receiver State ID from IME Static Data" },
          ReceiverDistrict: { type: "string", example: "5025", description: "Receiver District ID from IME Static Data" },
          ReceiverMunicipality: { type: "string", example: "9285", description: "Receiver Municipality ID from IME Static Data" },
          
          // Transaction Details
          ForexSessionId: { type: "string", example: "ABC123XYZ", description: "From GetCalculation response - must be unique each transaction" },
          AgentTxnRefId: { type: "string", example: "TXN20240425001", description: "Your own unique transaction reference ID" },
          CollectAmount: { type: "string", example: "10500", description: "Amount collected from sender including service charge" },
          PayoutAmount: { type: "string", example: "16000", description: "Amount to be paid in Nepal" },
          SourceOfFund: { type: "string", example: "8051", description: "Source of Fund ID from IME Static Data (WSST-SOFV1)" },
          Relationship: { type: "string", example: "7001", description: "Relationship ID from IME Static Data (WSST-RELV1)" },
          PurposeOfRemittance: { type: "string", example: "7001", description: "Purpose ID from IME Static Data (WSST-PORV1)" },
          PaymentType: { type: "string", example: "C", description: "C = Cash, B = Bank Deposit" },
          CalcBy: { type: "string", example: "P", description: "C = Collection Amount, P = Payout Amount" },
          
          // Bank Details (required if PaymentType = B)
          BankId: { type: "string", example: "NABIL", description: "Bank ID - mandatory if PaymentType = B" },
          BankBranchId: { type: "string", example: "123", description: "Bank Branch ID - mandatory if PaymentType = B" },
          BankAccountNumber: { type: "string", example: "001100220033", description: "Beneficiary account - mandatory if PaymentType = B" }
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
        required: ["EntityId"],
        properties: {
          EntityType: { type: "string", example: "Customer" },
          EntityId: { type: "string", example: "CUST001" },
          CustomerId: { type: "string", example: "CUST001", description: "Backward-compatible alias for EntityId" }
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
        description: "Credentials are auto-filled from server env (PRABHU_API_USERNAME/PRABHU_API_PASSWORD).",
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

const prabhuPrefix = "/api/prabhu";

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
    put: {
      tags: ["Users"],
      summary: "Update logged-in profile",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        200: { description: "Profile updated" },
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

  "/api/admin/create-white-label-admin": {
    post: {
      tags: ["Admin"],
      summary: "Create white-label admin (SUPER_ADMIN)",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Created" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/create-admin": {
    post: {
      tags: ["Admin"],
      summary: "Create admin (SUPER_ADMIN/WHITE_LABEL_ADMIN)",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Created" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/create-sub-admin": {
    post: {
      tags: ["Admin"],
      summary: "Create sub-admin (SUPER_ADMIN/WHITE_LABEL_ADMIN/ADMIN)",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Created" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/create-country-head": {
    post: {
      tags: ["Admin"],
      summary: "Create country head (SUPER_ADMIN/WHITE_LABEL_ADMIN/ADMIN/SUB_ADMIN)",
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

  "/api/super-admin/tenants": {
    get: {
      tags: ["Super Admin"],
      summary: "List all tenants (SUPER_ADMIN)",
      security: bearerSecurity,
      responses: {
        200: { description: "Tenant list" },
        403: { description: "Forbidden" },
      },
    },
  },

  // Admin Business Endpoints
  "/api/admin/business/applications": {
    get: {
      tags: ["Admin", "Business"],
      summary: "List business applications",
      security: bearerSecurity,
      responses: {
        200: { description: "Applications list" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/business/applications/{id}/process": {
    post: {
      tags: ["Admin", "Business"],
      summary: "Process business application",
      security: bearerSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: jsonBody,
      responses: {
        200: { description: "Application processed" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/business/skills": {
    post: {
      tags: ["Admin", "Business"],
      summary: "Create business skill master data",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Created" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/business/facilities": {
    post: {
      tags: ["Admin", "Business"],
      summary: "Create job facility master data",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Created" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/business/countries": {
    post: {
      tags: ["Admin", "Business"],
      summary: "Create country master data",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Created" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/business/states": {
    post: {
      tags: ["Admin", "Business"],
      summary: "Create state master data",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Created" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/business/districts": {
    post: {
      tags: ["Admin", "Business"],
      summary: "Create district master data",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Created" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/business/municipalities": {
    post: {
      tags: ["Admin", "Business"],
      summary: "Create municipality master data",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Created" },
        403: { description: "Forbidden" },
      },
    },
  },

  // Business Endpoints
  "/api/business/apply": {
    post: {
      tags: ["Business"],
      summary: "Apply for Business Partner",
      description: "Submit a business partner application",
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["businessName", "brandName", "ownerName", "email", "contactNumber1", "sectorId"],
              properties: {
                businessName: { type: "string", example: "ABC Enterprises" },
                brandName: { type: "string", example: "ABC Brand" },
                ownerName: { type: "string", example: "John Doe" },
                email: { type: "string", example: "john@example.com" },
                contactNumber1: { type: "string", example: "9800000000" },
                contactNumber2: { type: "string", example: "9800000001" },
                sectorId: { type: "string", example: "sector-uuid" },
                amount: { type: "number", example: 10000 },
                paymentMode: { type: "number", example: 1 },
                address: { type: "object" },
                documents: { type: "object" }
              }
            }
          }
        }
      },
      responses: {
        201: { description: "Application submitted successfully" },
        400: { description: "Invalid input" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - insufficient permissions" }
      }
    }
  },

  "/api/business/status": {
    get: {
      tags: ["Business"],
      summary: "Get Business Application Status",
      description: "Check the status of your business application",
      security: bearerSecurity,
      responses: {
        200: { description: "Business status retrieved" },
        401: { description: "Unauthorized" },
        404: { description: "No application found" }
      }
    }
  },

  "/api/business/jobs": {
    post: {
      tags: ["Business"],
      summary: "Post a Job",
      description: "Create a new job posting (Business Partner or Super Admin only)",
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["jobDescription", "offeredAmount", "educationId", "sectorId", "jobRoleId"],
              properties: {
                jobDescription: { type: "string", example: "Software Developer" },
                jobType: { type: "number", example: 0 },
                payStructure: { type: "number", example: 0 },
                offeredAmount: { type: "number", example: 50000 },
                educationId: { type: "string", example: "edu-uuid" },
                experience: { type: "number", example: 2 },
                gender: { type: "string", enum: ["MALE", "FEMALE", "OTHER"], example: "OTHER" },
                minAge: { type: "number", example: 18 },
                maxAge: { type: "number", example: 60 },
                sectorId: { type: "string", example: "sector-uuid" },
                jobRoleId: { type: "string", example: "role-uuid" },
                address: { type: "object" },
                facilities: { type: "array", items: { type: "string" } },
                noOfOpenings: { type: "number", example: 5 }
              }
            }
          }
        }
      },
      responses: {
        201: { description: "Job posted successfully" },
        400: { description: "Invalid input" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Business Partner or Super Admin only" }
      }
    }
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
      requestBody: imeCreateCustomerBody,
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
                ReferenceValue: { type: "string", example: "9812474750", description: "Optional explicit IME reference (customer token/id/mobile)" },
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
      summary: "Get IME Customer Requery Status By EntityId",
      parameters: [
        { name: "customerId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Customer requery result" },
        404: { description: "Customer not found" },
      },
    },
  },

  "/api/ime/customers/validate": {
    post: {
      tags: ["IME"],
      summary: "Check IME Entity Status",
      requestBody: jsonBody,
      responses: {
        200: { description: "Entity status result" },
      },
    },
  },

  "/api/ime/transactions/send": {
    post: {
      tags: ["IME"],
      summary: "Send Money via IME",
      requestBody: imeSendMoneyBody,
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
      summary: "Create IME Receiver (mapped via CustomerRegistration)",
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
      summary: "Check IME Entity Status for KYC",
      requestBody: jsonBody,
      responses: {
        200: { description: "Entity status/KYC result" },
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

  // ==================== IME REPORTS ====================
  "/api/ime/reports/soa": {
    get: {
      tags: ["IME Reports"],
      summary: "Get Statement of Account (SOA) Report",
      parameters: [
        { name: "fromDate", in: "query", required: true, schema: { type: "string", example: "2024/01/01", description: "Start date in YYYY/MM/DD format" } },
        { name: "toDate", in: "query", required: true, schema: { type: "string", example: "2024/12/31", description: "End date in YYYY/MM/DD format" } },
      ],
      responses: {
        200: { description: "SOA report retrieved" },
        400: { description: "Invalid date format" },
      },
    },
  },

  "/api/ime/static-data": {
    get: {
      tags: ["IME"],
      summary: "Get IME static reference data",
      description: "Retrieve static reference data by type code (e.g., WSST-MUNV1 for municipalities)",
      parameters: [
        { name: "typeCode", in: "query", required: true, schema: { type: "string" }, description: "Type code for static data (e.g., WSST-MUNV1)" },
        { name: "DistrictId", in: "query", required: false, schema: { type: "string" }, description: "District ID filter (required for municipality data)" }
      ],
      responses: {
        200: { description: "Static data retrieved successfully" },
        400: { description: "Missing typeCode parameter" },
        500: { description: "Server error" }
      }
    }
  },

  "/api/ime/bank-branches": {
    get: {
      tags: ["IME"],
      summary: "Get bank branches",
      description: "Retrieve list of bank branches filtered by bank ID",
      parameters: [
        { name: "bankId", in: "query", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Bank branches retrieved successfully" },
        400: { description: "Missing bankId parameter" },
        500: { description: "Server error" }
      }
    }
  },

  "/api/ime/id-issue-places": {
    get: {
      tags: ["IME"],
      summary: "Get ID issue places",
      description: "Retrieve list of places where IDs can be issued",
      responses: {
        200: { description: "ID issue places retrieved successfully" },
        500: { description: "Server error" }
      }
    }
  },

  // ==================== IME PHASE 2 eKYC ENDPOINTS ====================
  "/api/ime/ekyc/generate-ott": {
    post: {
      tags: ["IME Phase 2 eKYC"],
      summary: "Generate OTT (One-Time Token) for Aadhar Validation",
      description: "Generates OTT and returns URL for Aadhar number entry. For customers (203), OTP and OTPToken are required.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["EntityType", "EntityId", "Owner"],
              properties: {
                EntityType: { type: "string", example: "203", description: "201=CSP, 203=Customer" },
                EntityId: { type: "string", example: "9812345678", description: "PartnerBranchId for CSP, MobileNo for Customer" },
                Owner: { type: "string", example: "Owner Name" },
                OTPToken: { type: "string", example: "OTP_TOKEN_123", description: "Required only for Customer (203)" },
                OTP: { type: "string", example: "1234", description: "Required only for Customer (203)" }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: "OTT generated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  message: { type: "string" },
                  url: { type: "string", description: "URL to open for Aadhar validation" }
                }
              }
            }
          }
        },
        400: { description: "Missing required fields" }
      }
    }
  },

  "/api/ime/ekyc/get-unique-id": {
    post: {
      tags: ["IME Phase 2 eKYC"],
      summary: "Get Unique Identifier After Aadhar Validation",
      description: "Called after user opens OTT URL and completes Aadhar number entry",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["EntityType", "EntityId"],
              properties: {
                EntityType: { type: "string", example: "203" },
                EntityId: { type: "string", example: "9812345678" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Unique ID retrieved" },
        400: { description: "Invalid request" }
      }
    }
  },

  "/api/ime/ekyc/bio-kyc": {
    post: {
      tags: ["IME Phase 2 eKYC"],
      summary: "Submit Biometric Fingerprint Data for KYC",
      description: "Submits biometric fingerprint data captured from biometric device",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["EntityType", "EntityId", "Pid"],
              properties: {
                EntityType: { type: "string", example: "203" },
                EntityId: { type: "string", example: "9812345678" },
                Pid: { type: "string", description: "Base64 encoded PID XML from biometric device" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Bio KYC completed" },
        400: { description: "Invalid biometric data" }
      }
    }
  },

  "/api/ime/ekyc/customer-onboarding": {
    post: {
      tags: ["IME Phase 2 eKYC"],
      summary: "Complete Customer Registration After eKYC",
      description: "Final step after biometric KYC to complete customer registration",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["MobileNo"],
              properties: {
                MobileNo: { type: "string", example: "9812345678" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Customer onboarding completed" },
        400: { description: "Invalid request" }
      }
    }
  },

  "/api/ime/ekyc/customer-requery": {
    post: {
      tags: ["IME Phase 2 eKYC"],
      summary: "Get Full Customer Details from IME",
      description: "Retrieves comprehensive customer information from IME system",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["MobileNo"],
              properties: {
                MobileNo: { type: "string", example: "9812345678" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Customer details retrieved" },
        404: { description: "Customer not found" }
      }
    }
  },

  "/api/ime/ekyc/check-entity-status": {
    post: {
      tags: ["IME Phase 2 eKYC"],
      summary: "Check Entity Onboarding Status",
      description: "Check the current stage in the onboarding process for CSP or Customer",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["EntityType", "EntityId"],
              properties: {
                EntityType: { type: "string", example: "203" },
                EntityId: { type: "string", example: "9812345678" }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: "Entity status retrieved",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  status: { type: "string" },
                  isEligibleForTxn: { type: "string", example: "Y" }
                }
              }
            }
          }
        }
      }
    }
  },

  "/api/ime/ekyc/aadhar-registration": {
    post: {
      tags: ["IME Phase 2 eKYC"],
      summary: "Register Customer via Aadhar (SOAP-based)",
      description: "Alternative method to register customer using Aadhar number instead of manual registration",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["MobileNo", "FullName", "MaritalStatus", "DOB", "Gender", "Email", "Occupation", "SourceOfFund", "EstimatedAnnualIncome", "Country", "State", "District", "Address", "PinCode", "AadharNo"],
              properties: {
                MobileNo: { type: "string", example: "9812345678" },
                FullName: { type: "string", example: "Ram Bahadur Thapa" },
                MaritalStatus: { type: "string", example: "1902", description: "Marital Status ID from static data" },
                DOB: { type: "string", example: "1995/06/15", description: "Date of Birth in YYYY/MM/DD format" },
                Gender: { type: "string", example: "1801", description: "Gender ID (1801=Male, 1802=Female)" },
                Email: { type: "string", example: "ram@example.com" },
                Occupation: { type: "string", example: "8081", description: "Occupation ID" },
                SourceOfFund: { type: "string", example: "8051", description: "Source of Fund ID" },
                EstimatedAnnualIncome: { type: "string", example: "6", description: "Annual Income ID from WSST-CAIV1" },
                Country: { type: "string", example: "104", description: "Country ID" },
                State: { type: "string", example: "1041", description: "State ID" },
                District: { type: "string", example: "5705", description: "District ID" },
                Address: { type: "string", example: "Sector 55, Noida" },
                PinCode: { type: "string", example: "201301" },
                AadharNo: { type: "string", example: "707139067873", description: "12-digit Aadhar number" },
                PhotoData: { type: "string", description: "Base64 encoded photo (optional)" },
                PhotoDataType: { type: "string", example: "jpg" },
                IdData: { type: "string", description: "Base64 encoded ID document (optional)" },
                IdDataType: { type: "string", example: "pdf" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Aadhar registration initiated" },
        400: { description: "Missing required fields" }
      }
    }
  },

  "/api/ime/ekyc/aadhar-reprocess": {
    post: {
      tags: ["IME Phase 2 eKYC"],
      summary: "Reset/Clear Aadhar KYC Process",
      description: "Used to clear/reset the Aadhar KYC process for a CSP or Customer that needs to restart",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["EntityType", "EntityId", "ReprocessState"],
              properties: {
                EntityType: { type: "string", example: "203", description: "201=CSP, 203=Customer" },
                EntityId: { type: "string", example: "9812345678", description: "PartnerBranchId for CSP, MobileNo for Customer" },
                ReprocessState: { type: "string", description: "Value from GetStaticData where TYPE CODE = WSST-AERV1" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Aadhar entity reprocessed" },
        400: { description: "Invalid request" }
      }
    }
  },

  // ==================== IME LEGACY SOAP ENDPOINTS ====================
  "/api/ime/GetCalculation": {
    post: {
      tags: ["IME Legacy SOAP"],
      summary: "Get Exchange Rate and Service Charge Calculation",
      description: "Calculate exchange rate and service charges. Returns ForexSessionId required for SendTransaction.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["RemitAmount", "PaymentType", "PayoutCountry", "CalcBy"],
              properties: {
                PayoutAgentId: { type: "string", description: "Bank ID - Mandatory if PaymentType=B" },
                RemitAmount: { type: "string", example: "10000", description: "Amount in INR" },
                PaymentType: { type: "string", example: "C", description: "C=Cash, B=Bank" },
                PayoutCountry: { type: "string", example: "NPL" },
                CalcBy: { type: "string", example: "C", description: "C=Collection Amount, P=Payout Amount" }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: "Calculation result with ForexSessionId",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  ForexSessionId: { type: "string", description: "Must be used immediately in SendTransaction" },
                  CollectAmount: { type: "string" },
                  ServiceCharge: { type: "string" },
                  ExchangeRate: { type: "string" },
                  PayoutAmount: { type: "string" },
                  PayoutCurrency: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  },

  "/api/ime/SendTransaction": {
    post: {
      tags: ["IME Legacy SOAP"],
      summary: "Create Money Transfer Transaction",
      description: "Creates a new transaction. ForexSessionId from GetCalculation must be used immediately.",
      requestBody: imeSendTransactionBody,
      responses: {
        200: {
          description: "Transaction created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  RefNo: { type: "string", description: "Reference number for OTP confirmation" },
                  AgentTxnRefId: { type: "string" },
                  CollectAmount: { type: "string" },
                  ServiceCharge: { type: "string" },
                  ExchangeRate: { type: "string" },
                  PayoutAmount: { type: "string" },
                  PayoutCurrency: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  },

  "/api/ime/SendOTP": {
    post: {
      tags: ["IME Legacy SOAP"],
      summary: "Send OTP to Customer",
      description: "Sends OTP for various modules: CR (Customer Registration), ST (Send Transaction), MT (Modify Transaction), CT (Cancel Transaction)",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["Module", "ReferenceValue"],
              properties: {
                Module: { type: "string", example: "CR", description: "CR/ST/MT/CT" },
                ReferenceValue: { type: "string", description: "CustomerToken (CR), RefNo (ST), or ICN (MT/CT)" }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: "OTP sent",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  OTPToken: { type: "string", description: "Required for confirmation" }
                }
              }
            }
          }
        }
      }
    }
  },

  "/api/ime/ConfirmSendTransaction": {
    post: {
      tags: ["IME Legacy SOAP"],
      summary: "Confirm Transaction with OTP",
      description: "Finalizes the transaction after OTP verification. Returns ICN for payout.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["RefNo", "OTPToken", "OTP"],
              properties: {
                RefNo: { type: "string", description: "From SendTransaction response" },
                OTPToken: { type: "string", description: "From SendOTP response" },
                OTP: { type: "string", example: "123456" }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: "Transaction confirmed",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  RefNo: { type: "string", description: "ICN - give to beneficiary for payout" },
                  AgentTxnRefId: { type: "string" },
                  CollectAmount: { type: "string" },
                  ServiceCharge: { type: "string" },
                  ExchangeRate: { type: "string" },
                  PayoutAmount: { type: "string" },
                  PayoutCurrency: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  },

  "/api/ime/CustomerRegistration": {
    post: {
      tags: ["IME Legacy SOAP"],
      summary: "Register Customer (SOAP)",
      description: "Register a new customer in IME system via SOAP",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["MobileNo", "FirstName", "LastName", "Nationality", "MaritalStatus", "DOB", "Gender", "FatherOrMotherName", "Occupation"],
              properties: {
                MobileNo: { type: "string", example: "9812345678" },
                MembershipId: { type: "string" },
                FirstName: { type: "string", example: "Ram" },
                MiddleName: { type: "string", example: "Bahadur" },
                LastName: { type: "string", example: "Thapa" },
                Nationality: { type: "string", example: "NPL" },
                MaritalStatus: { type: "string", example: "1901" },
                DOB: { type: "string", example: "1990/01/15" },
                Gender: { type: "string", example: "1801" },
                FatherOrMotherName: { type: "string", example: "Hari Thapa" },
                Email: { type: "string", example: "ram@example.com" },
                Occupation: { type: "string", example: "8081" },
                SourceOfFund: { type: "string", example: "8051" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Customer registration initiated" }
      }
    }
  },

  "/api/ime/ConfirmCustomerRegistration": {
    post: {
      tags: ["IME Legacy SOAP"],
      summary: "Confirm Customer Registration with OTP",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["OTP", "CustomerToken", "OTPToken"],
              properties: {
                OTP: { type: "string", example: "123456" },
                CustomerToken: { type: "string" },
                OTPToken: { type: "string" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Customer registration confirmed" }
      }
    }
  },

  "/api/ime/CheckCustomer/{mobileNo}": {
    get: {
      tags: ["IME Legacy SOAP"],
      summary: "Check if Customer is Registered",
      description: "Verify if customer exists and is eligible for transactions",
      parameters: [
        { name: "mobileNo", in: "path", required: true, schema: { type: "string", example: "9812345678" } }
      ],
      responses: {
        200: {
          description: "Customer details",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  Name: { type: "string" },
                  MobileNo: { type: "string" },
                  AMLStatus: { type: "boolean", description: "True=eligible for transactions" },
                  KYCStatus: { type: "string", example: "Approved" },
                  RejectedReason: { type: "string" },
                  NewMobileNo: { type: "string" },
                  AmendmentStatus: { type: "string" },
                  AmendmentMessage: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  },

  "/api/ime/TransactionInquiry": {
    post: {
      tags: ["IME Legacy SOAP"],
      summary: "Look Up Transaction Details",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["RefNoType", "RefNo"],
              properties: {
                RefNoType: { type: "string", example: "1", description: "1=IME ICN, 2=AgentTxnRefId" },
                RefNo: { type: "string", example: "ICN123456" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Transaction details" }
      }
    }
  },

  "/api/ime/TransactionInquiryDefault": {
    post: {
      tags: ["IME Legacy SOAP"],
      summary: "Default Transaction Inquiry",
      requestBody: jsonBody,
      responses: {
        200: { description: "Transaction details" }
      }
    }
  },

  "/api/ime/AmendTransaction": {
    post: {
      tags: ["IME Legacy SOAP"],
      summary: "Modify Existing Transaction",
      description: "Modify receiver details or other info. Flow: TransactionInquiry → SendOTP(MT) → AmendmentTransaction",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["RefNo", "OTP", "OTPToken"],
              properties: {
                RefNo: { type: "string", description: "ICN from ConfirmSendTransaction" },
                ReceiverName: { type: "string" },
                ReceiverGender: { type: "string" },
                ReceiverAddress: { type: "string" },
                RelationWithSender: { type: "string" },
                PurposeOfRemittance: { type: "string" },
                SourceOfFund: { type: "string" },
                ReceiverMobileNo: { type: "string" },
                BankId: { type: "string" },
                BankBranchId: { type: "string" },
                AccountNo: { type: "string" },
                OTP: { type: "string", example: "123456" },
                OTPToken: { type: "string" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Transaction amended" }
      }
    }
  },

  "/api/ime/CustomerMobileAmendment": {
    post: {
      tags: ["IME Legacy SOAP"],
      summary: "Amend Customer Mobile Number",
      requestBody: jsonBody,
      responses: {
        200: { description: "Mobile amended" }
      }
    }
  },

  "/api/ime/BalanceInquiry": {
    get: {
      tags: ["IME Legacy SOAP"],
      summary: "Check Agent Account Balance",
      responses: {
        200: {
          description: "Balance details",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  Balance: { type: "string", description: "Current balance amount" }
                }
              }
            }
          }
        }
      }
    }
  },

  "/api/ime/CSPRegistration": {
    post: {
      tags: ["IME Legacy SOAP"],
      summary: "Register CSP (Customer Service Point)",
      description: "Register a new CSP/branch in IME system",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["PartnerCSPCode", "CSPName", "RegistrationType", "RegistrationNumber", "BusinessType", "ContractExpiryDate", "ContractRenewalDate", "PANNumber"],
              properties: {
                PartnerCSPCode: { type: "string", example: "CSP001" },
                CSPName: { type: "string", example: "My CSP Center" },
                RegistrationType: { type: "string", example: "4501", description: "From WSST-REGV1" },
                RegistrationNumber: { type: "string", example: "REG12345" },
                BusinessType: { type: "string", example: "6200", description: "From WSST-BUSV1" },
                ContractExpiryDate: { type: "string", example: "2025/12/31" },
                ContractRenewalDate: { type: "string", example: "2026/01/01" },
                PANNumber: { type: "string", example: "123456789" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "CSP registered" }
      }
    }
  },

  "/api/ime/CheckCSP": {
    get: {
      tags: ["IME Legacy SOAP"],
      summary: "Check CSP Registration Status",
      responses: {
        200: { description: "CSP status and document upload status" }
      }
    }
  },

  "/api/ime/CSPDocumentUpload": {
    post: {
      tags: ["IME Legacy SOAP"],
      summary: "Upload CSP Document",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["DocumentType", "ReferenceId", "DocumentData", "DocumentFormat"],
              properties: {
                DocumentType: { type: "string", example: "17001", description: "From WSST-ADOV1" },
                ReferenceId: { type: "string", description: "CSPCode/BankId/OwnerId from CSPRegistration" },
                DocumentData: { type: "string", description: "Base64 encoded document (max 2MB)" },
                DocumentFormat: { type: "string", example: "pdf", description: "pdf, jpg, jpeg, or png" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Document uploaded" }
      }
    }
  },

  "/api/ime/CancelTransaction": {
    post: {
      tags: ["IME Legacy SOAP"],
      summary: "Cancel Transaction",
      description: "Flow: TransactionInquiry → SendOTP(CT) → CancelTransaction",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["RefNo", "CancelReason", "OTP", "OTPToken"],
              properties: {
                RefNo: { type: "string", description: "ICN of transaction to cancel" },
                CancelReason: { type: "string", example: "7701", description: "From WSST-TCRV1" },
                OTP: { type: "string", example: "123456" },
                OTPToken: { type: "string" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Transaction cancelled" }
      }
    }
  },

  "/api/ime/AadharEntityReprocess": {
    post: {
      tags: ["IME Legacy SOAP"],
      summary: "Reset Aadhar KYC Process",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["EntityType", "EntityId", "ReprocessState"],
              properties: {
                EntityType: { type: "string", example: "203" },
                EntityId: { type: "string", example: "9812345678" },
                ReprocessState: { type: "string", description: "From WSST-AERV1" }
              }
            }
          }
        }
      },
      responses: {
        200: { description: "Aadhar entity reprocessed" }
      }
    }
  },

  // Static Data Endpoints
  "/api/ime/GetAccountType": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Account Type List (WSST-ACCV1)",
      responses: { 200: { description: "Account types" } }
    }
  },

  "/api/ime/Countries": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Country List (WSST-CONV1)",
      responses: { 200: { description: "Countries" } }
    }
  },

  "/api/ime/States/{CountryId}": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get State List by Country (WSST-STTV1)",
      parameters: [
        { name: "CountryId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: { 200: { description: "States" } }
    }
  },

  "/api/ime/Districts/{StateId}": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get District List by State (WSST-DISV1)",
      parameters: [
        { name: "StateId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: { 200: { description: "Districts" } }
    }
  },

  "/api/ime/Genders": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Gender List (WSST-GDRV1)",
      responses: { 200: { description: "Genders" } }
    }
  },

  "/api/ime/MaritalStatus": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Marital Status List (WSST-MSSV1)",
      responses: { 200: { description: "Marital statuses" } }
    }
  },

  "/api/ime/Occupation": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Occupation List (WSST-OCPV1)",
      responses: { 200: { description: "Occupations" } }
    }
  },

  "/api/ime/PurposeOfRemittance": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Purpose of Remittance List (WSST-PORV1)",
      responses: { 200: { description: "Purposes" } }
    }
  },

  "/api/ime/TransactionCancelReason": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Transaction Cancel Reason List (WSST-TCRV1)",
      responses: { 200: { description: "Cancel reasons" } }
    }
  },

  "/api/ime/GetIdTypes": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get ID Type List (WSST-IDTV1)",
      responses: { 200: { description: "ID types" } }
    }
  },

  "/api/ime/GetIdentityTypes": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Identity Types (Alternative endpoint)",
      responses: { 200: { description: "Identity types" } }
    }
  },

  "/api/ime/BankList/{CountryId}": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Bank List by Country (WSST-BKLV1)",
      parameters: [
        { name: "CountryId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: { 200: { description: "Banks" } }
    }
  },

  "/api/ime/BankBranchList/{BankId}": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Bank Branch List by Bank (WSST-BBLV1)",
      parameters: [
        { name: "BankId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: { 200: { description: "Bank branches" } }
    }
  },

  "/api/ime/CSPRegistrationTypeList": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get CSP Registration Type List (WSST-REGV1)",
      responses: { 200: { description: "CSP registration types" } }
    }
  },

  "/api/ime/CSPAddressProofTypeList": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get CSP Address Proof Type List (WSST-ADPV1)",
      responses: { 200: { description: "CSP address proof types" } }
    }
  },

  "/api/ime/CSPOwnerAddressProofTypeList": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get CSP Owner Address Proof Type List (WSST-OAPV1)",
      responses: { 200: { description: "Owner address proof types" } }
    }
  },

  "/api/ime/CSPBusinessTypeList": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get CSP Business Type List (WSST-BUSV1)",
      responses: { 200: { description: "CSP business types" } }
    }
  },

  "/api/ime/CSPDocumentTypeList": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get CSP Document Type List (WSST-ADOV1)",
      responses: { 200: { description: "CSP document types" } }
    }
  },

  "/api/ime/OwnerCategoryTypes": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Owner Category Type List (WSST-CATV1)",
      responses: { 200: { description: "Owner categories" } }
    }
  },

  "/api/ime/EducationalQualificationList": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Educational Qualification List (WSST-EDQV1)",
      responses: { 200: { description: "Educational qualifications" } }
    }
  },

  "/api/ime/Municipalities/{DistrictId}": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Municipality List by District (WSST-MUNV1)",
      parameters: [
        { name: "DistrictId", in: "path", required: true, schema: { type: "string" } }
      ],
      responses: { 200: { description: "Municipalities" } }
    }
  },

  "/api/ime/RelationshipList": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Relationship List (WSST-RELV1)",
      responses: { 200: { description: "Relationships" } }
    }
  },

  "/api/ime/IDPlaceofIssue": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get ID Place of Issue List (WSST-POIV1)",
      responses: { 200: { description: "Places of issue" } }
    }
  },

  "/api/ime/SourceOfFundList": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Source of Fund List (WSST-SOFV1)",
      responses: { 200: { description: "Source of funds" } }
    }
  },

  "/api/ime/bank-branches": {
    get: {
      tags: ["IME Static Data"],
      summary: "Get Bank Branches (Query parameter version)",
      parameters: [
        { name: "bankId", in: "query", required: false, schema: { type: "string" } },
        { name: "countryCode", in: "query", required: false, schema: { type: "string" } }
      ],
      responses: { 200: { description: "Bank branches" } }
    }
  },

  // ==================== WALLET ENDPOINTS ====================
  "/api/wallet": {
    get: {
      tags: ["Wallet"],
      summary: "Get my wallet details",
      security: bearerSecurity,
      responses: {
        200: { description: "Wallet details" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/api/wallet/my-wallet": {
    get: {
      tags: ["Wallet"],
      summary: "Get my wallet details (alias)",
      security: bearerSecurity,
      responses: {
        200: { description: "Wallet details" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/api/wallet/bank-details": {
    get: {
      tags: ["Wallet"],
      summary: "Get all active bank details",
      security: bearerSecurity,
      responses: {
        200: { description: "Active bank details" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/api/wallet/top-up": {
    post: {
      tags: ["Wallet"],
      summary: "Create top-up request",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Top-up request created" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/api/wallet/transactions": {
    get: {
      tags: ["Wallet"],
      summary: "Get my top-up requests (Transactions)",
      security: bearerSecurity,
      responses: {
        200: { description: "Transaction history" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/api/wallet/top-up/requests": {
    get: {
      tags: ["Wallet"],
      summary: "Get my top-up requests (alias)",
      security: bearerSecurity,
      responses: {
        200: { description: "Top-up requests" },
        401: { description: "Unauthorized" },
      },
    },
  },

  // ==================== WALLET ADMIN ENDPOINTS ====================
  "/api/wallet/admin/bank-details": {
    post: {
      tags: ["Wallet Admin"],
      summary: "Create bank details",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Bank details created" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
    get: {
      tags: ["Wallet Admin"],
      summary: "Get all bank details",
      security: bearerSecurity,
      responses: {
        200: { description: "All bank details" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/wallet/admin/bank-details/{id}": {
    put: {
      tags: ["Wallet Admin"],
      summary: "Update bank details (including activate/deactivate)",
      security: bearerSecurity,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: jsonBody,
      responses: {
        200: { description: "Bank details updated" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
    delete: {
      tags: ["Wallet Admin"],
      summary: "Delete bank details",
      security: bearerSecurity,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Bank details deleted" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/wallet/admin/top-up/requests": {
    get: {
      tags: ["Wallet Admin"],
      summary: "Get all top-up requests",
      security: bearerSecurity,
      responses: {
        200: { description: "All top-up requests" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/wallet/admin/top-up/{requestId}/approve": {
    post: {
      tags: ["Wallet Admin"],
      summary: "Approve top-up request",
      security: bearerSecurity,
      parameters: [
        { name: "requestId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Top-up request approved" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/wallet/admin/top-up/{requestId}/reject": {
    post: {
      tags: ["Wallet Admin"],
      summary: "Reject top-up request",
      security: bearerSecurity,
      parameters: [
        { name: "requestId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Top-up request rejected" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  // ==================== MEMBERSHIP ENDPOINTS ====================
  "/api/membership/price": {
    get: {
      tags: ["Membership"],
      summary: "Get membership price",
      security: bearerSecurity,
      responses: {
        200: { description: "Membership price" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/api/membership/reference-data": {
    get: {
      tags: ["Membership"],
      summary: "Get reference data (education, sectors, job roles, document types)",
      security: bearerSecurity,
      responses: {
        200: { description: "Reference data" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/api/membership/apply": {
    post: {
      tags: ["Membership"],
      summary: "Create membership application",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Application created" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/api/membership/verify-payment": {
    post: {
      tags: ["Membership"],
      summary: "Verify payment",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        200: { description: "Payment verified" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/api/membership/status": {
    get: {
      tags: ["Membership"],
      summary: "Get application status",
      security: bearerSecurity,
      responses: {
        200: { description: "Application status" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/api/membership/resubmit": {
    post: {
      tags: ["Membership"],
      summary: "Resubmit rejected application",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        200: { description: "Application resubmitted" },
        401: { description: "Unauthorized" },
      },
    },
  },

  // ==================== ADMIN MEMBERSHIP ENDPOINTS ====================
  "/api/admin/membership/price": {
    put: {
      tags: ["Admin"],
      summary: "Update membership price",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        200: { description: "Price updated" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/membership/applications": {
    get: {
      tags: ["Admin"],
      summary: "Get membership applications",
      security: bearerSecurity,
      responses: {
        200: { description: "Membership applications" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/membership/applications/{applicationId}": {
    get: {
      tags: ["Admin"],
      summary: "Get application details",
      security: bearerSecurity,
      parameters: [
        { name: "applicationId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Application details" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/membership/applications/{applicationId}/approve": {
    post: {
      tags: ["Admin"],
      summary: "Approve application",
      security: bearerSecurity,
      parameters: [
        { name: "applicationId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Application approved" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/membership/applications/{applicationId}/reject": {
    post: {
      tags: ["Admin"],
      summary: "Reject application",
      security: bearerSecurity,
      parameters: [
        { name: "applicationId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Application rejected" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/education": {
    post: {
      tags: ["Admin"],
      summary: "Create education",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Education created" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
    get: {
      tags: ["Admin"],
      summary: "Get educations",
      security: bearerSecurity,
      responses: {
        200: { description: "Educations list" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/sector": {
    post: {
      tags: ["Admin"],
      summary: "Create sector",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Sector created" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
    get: {
      tags: ["Admin"],
      summary: "Get sectors",
      security: bearerSecurity,
      responses: {
        200: { description: "Sectors list" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/job-role": {
    post: {
      tags: ["Admin"],
      summary: "Create job role",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Job role created" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
    get: {
      tags: ["Admin"],
      summary: "Get job roles",
      security: bearerSecurity,
      responses: {
        200: { description: "Job roles list" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/document-type": {
    post: {
      tags: ["Admin"],
      summary: "Create document type",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        201: { description: "Document type created" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  // ==================== ADMIN USER MANAGEMENT ENDPOINTS ====================
  "/api/admin/users": {
    get: {
      tags: ["Admin"],
      summary: "Get all users (with filtering and pagination)",
      security: bearerSecurity,
      responses: {
        200: { description: "Users list" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/users/{id}": {
    get: {
      tags: ["Admin"],
      summary: "Get user by id",
      security: bearerSecurity,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "User details" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "User not found" },
      },
    },
  },

  "/api/admin/members": {
    get: {
      tags: ["Admin"],
      summary: "Get all members/membership applications (with filtering and pagination)",
      security: bearerSecurity,
      responses: {
        200: { description: "Members list" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/api/admin/stats": {
    get: {
      tags: ["Admin"],
      summary: "Get dashboard statistics",
      security: bearerSecurity,
      responses: {
        200: { description: "Dashboard statistics" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  // ==================== USER ENDPOINTS ====================
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
    put: {
      tags: ["Users"],
      summary: "Update profile",
      security: bearerSecurity,
      requestBody: jsonBody,
      responses: {
        200: { description: "Profile updated" },
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
        401: { description: "Unauthorized" },
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
        401: { description: "Unauthorized" },
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
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
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
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  // ==================== DEVICE ENDPOINTS ====================
  "/api/devices": {
    get: {
      tags: ["Devices"],
      summary: "Get user devices",
      security: bearerSecurity,
      responses: {
        200: { description: "User devices" },
        401: { description: "Unauthorized" },
      },
    },
  },

  "/api/devices/{id}": {
    delete: {
      tags: ["Devices"],
      summary: "Remove device",
      security: bearerSecurity,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        200: { description: "Device removed" },
        401: { description: "Unauthorized" },
      },
    },
  },

  // ==================== RD ENDPOINTS ====================
  "/api/rd/capture": {
    post: {
      tags: ["RD"],
      summary: "Capture RD data",
      requestBody: jsonBody,
      responses: {
        200: { description: "Data captured" },
        400: { description: "Bad request" },
      },
    },
  },

  "/api/rd/info": {
    get: {
      tags: ["RD"],
      summary: "Get RD info",
      responses: {
        200: { description: "RD info" },
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

// ==================== IME ENDPOINTS ====================

// Authentication & Session Management
paths["/api/ime/authenticate"] = {
  post: {
    tags: ["IME"],
    summary: "IME Authentication",
    requestBody: jsonBody,
    responses: {
      200: { description: "Authentication successful" },
      401: { description: "Authentication failed" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/login"] = {
  post: {
    tags: ["IME"],
    summary: "IME Login",
    requestBody: jsonBody,
    responses: {
      200: { description: "Login successful" },
      401: { description: "Login failed" },
      500: { description: "Server error" }
    }
  }
};

// Customer Operations
paths["/api/ime/customers/send-otp"] = {
  post: {
    tags: ["IME"],
    summary: "Send OTP to customer",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["ReferenceValue"],
            properties: {
              ReferenceValue: { type: "string", example: "9841234567" },
              Module: { type: "string", example: "CustomerRegistration" }
            }
          }
        }
      }
    },
    responses: {
      200: { description: "OTP sent successfully" },
      400: { description: "Bad request" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/customers/confirm"] = {
  post: {
    tags: ["IME"],
    summary: "Confirm customer with OTP",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["CustomerToken", "OTPToken", "OTP"],
            properties: {
              CustomerToken: { type: "string", example: "CUST-TOKEN-123" },
              OTPToken: { type: "string", example: "OTP-TOKEN-456" },
              OTP: { type: "string", example: "123456" }
            }
          }
        }
      }
    },
    responses: {
      200: { description: "Customer confirmed successfully" },
      400: { description: "Invalid OTP or token" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/customers"] = {
  post: {
    tags: ["IME"],
    summary: "Create new customer",
    requestBody: imeCreateCustomerBody,
    responses: {
      200: { description: "Customer created successfully" },
      400: { description: "Validation error" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/customers/search/mobile/{mobile}"] = {
  get: {
    tags: ["IME"],
    summary: "Search customer by mobile number",
    parameters: [
      { name: "mobile", in: "path", required: true, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "Customer found" },
      404: { description: "Customer not found" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/customers/requery"] = {
  get: {
    tags: ["IME"],
    summary: "Requery customer information",
    parameters: [
      { name: "entityId", in: "query", required: false, schema: { type: "string" } },
      { name: "mobile", in: "query", required: false, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "Customer information retrieved" },
      400: { description: "Bad request" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/customers/{customerId}"] = {
  get: {
    tags: ["IME"],
    summary: "Get customer by ID",
    parameters: [
      { name: "customerId", in: "path", required: true, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "Customer details" },
      404: { description: "Customer not found" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/customers/validate"] = {
  post: {
    tags: ["IME"],
    summary: "Validate customer",
    requestBody: imeValidateCustomerBody,
    responses: {
      200: { description: "Customer validated" },
      400: { description: "Validation failed" },
      500: { description: "Server error" }
    }
  }
};

// Customer Registration Flow Middleware
paths["/api/ime/customers/register-complete"] = {
  post: {
    tags: ["IME"],
    summary: "Complete customer registration",
    requestBody: imeCreateCustomerBody,
    responses: {
      200: { description: "Registration completed" },
      400: { description: "Validation error" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/customers/confirm-registration"] = {
  post: {
    tags: ["IME"],
    summary: "Confirm customer registration",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["CustomerToken", "OTPToken", "OTP"],
            properties: {
              CustomerToken: { type: "string", example: "CUST-TOKEN-123" },
              OTPToken: { type: "string", example: "OTP-TOKEN-456" },
              OTP: { type: "string", example: "123456" }
            }
          }
        }
      }
    },
    responses: {
      200: { description: "Registration confirmed" },
      400: { description: "Confirmation failed" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/customers/check-eligibility"] = {
  post: {
    tags: ["IME"],
    summary: "Check customer eligibility",
    requestBody: jsonBody,
    responses: {
      200: { description: "Eligibility checked" },
      400: { description: "Bad request" },
      500: { description: "Server error" }
    }
  }
};

// Transaction Operations
paths["/api/ime/transactions/send"] = {
  post: {
    tags: ["IME"],
    summary: "Send money/transaction",
    requestBody: imeSendMoneyBody,
    responses: {
      200: { description: "Transaction sent successfully" },
      400: { description: "Validation error" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/transactions/{transactionId}/status"] = {
  get: {
    tags: ["IME"],
    summary: "Get transaction status",
    parameters: [
      { name: "transactionId", in: "path", required: true, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "Transaction status" },
      404: { description: "Transaction not found" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/transactions/{transactionId}/cancel"] = {
  post: {
    tags: ["IME"],
    summary: "Cancel transaction",
    parameters: [
      { name: "transactionId", in: "path", required: true, schema: { type: "string" } }
    ],
    requestBody: imeCancelTransactionBody,
    responses: {
      200: { description: "Transaction cancelled" },
      400: { description: "Cancellation failed" },
      500: { description: "Server error" }
    }
  }
};

// Transaction Flow Middleware
paths["/api/ime/transactions/send-complete"] = {
  post: {
    tags: ["IME"],
    summary: "Complete transaction sending",
    requestBody: imeSendTransactionBody,
    responses: {
      200: { description: "Transaction completed" },
      400: { description: "Validation error" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/transactions/confirm"] = {
  post: {
    tags: ["IME"],
    summary: "Confirm transaction",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["RefNo", "OTPToken", "OTP"],
            properties: {
              RefNo: { type: "string", example: "TXN123456" },
              OTPToken: { type: "string", example: "OTP-TOKEN-456" },
              OTP: { type: "string", example: "123456" }
            }
          }
        }
      }
    },
    responses: {
      200: { description: "Transaction confirmed" },
      400: { description: "Confirmation failed" },
      500: { description: "Server error" }
    }
  }
};

// Receiver Management
paths["/api/ime/receivers"] = {
  post: {
    tags: ["IME"],
    summary: "Create receiver",
    requestBody: imeCreateReceiverBody,
    responses: {
      200: { description: "Receiver created" },
      400: { description: "Validation error" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/receivers/{receiverId}"] = {
  get: {
    tags: ["IME"],
    summary: "Get receiver by ID",
    parameters: [
      { name: "receiverId", in: "path", required: true, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "Receiver details" },
      404: { description: "Receiver not found" },
      500: { description: "Server error" }
    }
  },
  patch: {
    tags: ["IME"],
    summary: "Update receiver",
    parameters: [
      { name: "receiverId", in: "path", required: true, schema: { type: "string" } }
    ],
    requestBody: jsonBody,
    responses: {
      200: { description: "Receiver updated" },
      400: { description: "Validation error" },
      500: { description: "Server error" }
    }
  }
};

// IME Data Storage Operations
paths["/api/ime/data"] = {
  get: {
    tags: ["IME"],
    summary: "List IME data",
    responses: {
      200: { description: "IME data list" },
      500: { description: "Server error" }
    }
  },
  post: {
    tags: ["IME"],
    summary: "Create IME data",
    requestBody: imeDataBody,
    responses: {
      200: { description: "IME data created" },
      400: { description: "Validation error" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/data/{id}"] = {
  patch: {
    tags: ["IME"],
    summary: "Update IME data",
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } }
    ],
    requestBody: imeDataBody,
    responses: {
      200: { description: "IME data updated" },
      400: { description: "Validation error" },
      500: { description: "Server error" }
    }
  },
  delete: {
    tags: ["IME"],
    summary: "Delete IME data",
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "IME data deleted" },
      404: { description: "Data not found" },
      500: { description: "Server error" }
    }
  }
};

// Bank & Payment Operations
paths["/api/ime/payment-modes"] = {
  get: {
    tags: ["IME"],
    summary: "Get payment modes",
    responses: {
      200: { description: "Payment modes retrieved" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/bank-accounts/validate"] = {
  post: {
    tags: ["IME"],
    summary: "Validate bank account",
    requestBody: imeValidateBankAccountBody,
    responses: {
      200: { description: "Bank account validated" },
      400: { description: "Validation failed" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/banks"] = {
  get: {
    tags: ["IME"],
    summary: "Get bank list",
    parameters: [
      { name: "country", in: "query", required: false, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "Bank list retrieved" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/bank-branches"] = {
  get: {
    tags: ["IME"],
    summary: "Get bank branches",
    parameters: [
      { name: "country", in: "query", required: false, schema: { type: "string" } },
      { name: "countryCode", in: "query", required: false, schema: { type: "string" } },
      { name: "bank", in: "query", required: false, schema: { type: "string" } },
      { name: "bankId", in: "query", required: false, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "Bank branches retrieved" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/static-data"] = {
  get: {
    tags: ["IME"],
    summary: "Get static data",
    parameters: [
      { name: "type", in: "query", required: true, schema: { type: "string" } },
      { name: "reference", in: "query", required: false, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "Static data retrieved" },
      400: { description: "Type parameter required" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/id-issue-places"] = {
  get: {
    tags: ["IME"],
    summary: "Get ID issue places",
    parameters: [
      { name: "country", in: "query", required: false, schema: { type: "string" } },
      { name: "idType", in: "query", required: false, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "ID issue places retrieved" },
      500: { description: "Server error" }
    }
  }
};

// Compliance & Verification
paths["/api/ime/kyc/verify"] = {
  post: {
    tags: ["IME"],
    summary: "Verify KYC",
    requestBody: imeVerifyKycBody,
    responses: {
      200: { description: "KYC verified" },
      400: { description: "Verification failed" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/compliance/{customerId}/status"] = {
  get: {
    tags: ["IME"],
    summary: "Get compliance status",
    parameters: [
      { name: "customerId", in: "path", required: true, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "Compliance status retrieved" },
      404: { description: "Customer not found" },
      500: { description: "Server error" }
    }
  }
};

// Reporting & Queries
paths["/api/ime/customers/{customerId}/transactions"] = {
  get: {
    tags: ["IME"],
    summary: "Get customer transaction history",
    parameters: [
      { name: "customerId", in: "path", required: true, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "Transaction history retrieved" },
      404: { description: "Customer not found" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/exchange-rate"] = {
  get: {
    tags: ["IME"],
    summary: "Get exchange rate",
    parameters: [
      { name: "from", in: "query", required: true, schema: { type: "string" } },
      { name: "to", in: "query", required: true, schema: { type: "string" } }
    ],
    responses: {
      200: { description: "Exchange rate retrieved" },
      400: { description: "Invalid currency parameters" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/reports/soa"] = {
  get: {
    tags: ["IME"],
    summary: "Get SOA report",
    responses: {
      200: { description: "SOA report generated" },
      500: { description: "Server error" }
    }
  }
};

// Phase 2 eKYC Endpoints
paths["/api/ime/ekyc/generate-ott"] = {
  post: {
    tags: ["IME eKYC"],
    summary: "Generate OTT",
    requestBody: jsonBody,
    responses: {
      200: { description: "OTT generated" },
      400: { description: "Bad request" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/ekyc/get-unique-id"] = {
  post: {
    tags: ["IME eKYC"],
    summary: "Get unique ID",
    requestBody: jsonBody,
    responses: {
      200: { description: "Unique ID retrieved" },
      400: { description: "Bad request" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/ekyc/bio-kyc"] = {
  post: {
    tags: ["IME eKYC"],
    summary: "Bio KYC verification",
    requestBody: jsonBody,
    responses: {
      200: { description: "Bio KYC completed" },
      400: { description: "Bad request" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/ekyc/customer-onboarding"] = {
  post: {
    tags: ["IME eKYC"],
    summary: "Customer onboarding",
    requestBody: jsonBody,
    responses: {
      200: { description: "Customer onboarded" },
      400: { description: "Bad request" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/ekyc/customer-requery"] = {
  post: {
    tags: ["IME eKYC"],
    summary: "Customer requery",
    requestBody: jsonBody,
    responses: {
      200: { description: "Customer requeried" },
      400: { description: "Bad request" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/ekyc/check-entity-status"] = {
  post: {
    tags: ["IME eKYC"],
    summary: "Check entity status",
    requestBody: jsonBody,
    responses: {
      200: { description: "Entity status checked" },
      400: { description: "Bad request" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/ekyc/aadhar-registration"] = {
  post: {
    tags: ["IME eKYC"],
    summary: "Aadhar customer registration",
    requestBody: jsonBody,
    responses: {
      200: { description: "Aadhar registration completed" },
      400: { description: "Bad request" },
      500: { description: "Server error" }
    }
  }
};

paths["/api/ime/ekyc/aadhar-reprocess"] = {
  post: {
    tags: ["IME eKYC"],
    summary: "Aadhar entity reprocess",
    requestBody: jsonBody,
    responses: {
      200: { description: "Aadhar reprocess completed" },
      400: { description: "Bad request" },
      500: { description: "Server error" }
    }
  }
};

// Legacy IME Contract Compatibility Routes
const imeLegacyRoutes = [
  "AmendTransaction", "BalanceInquiry", "CSPDocumentUpload", "GetAccountType",
  "Countries", "States", "Districts", "Genders", "MaritalStatus", "Occupation",
  "PurposeOfRemittance", "TransactionCancelReason", "GetIdTypes", "GetIdentityTypes",
  "BankList", "BankBranchList", "CSPRegistrationTypeList", "CSPAddressProofTypeList",
  "CSPOwnerAddressProofTypeList", "CSPBusinessTypeList", "CSPDocumentTypeList",
  "OwnerCategoryTypes", "EducationalQualificationList", "Municipalities",
  "RelationshipList", "IDPlaceofIssue", "SourceOfFundList", "CSPRegistration",
  "CancelTransaction", "CheckCSP", "CheckCustomer", "ConfirmCustomerRegistration",
  "ConfirmSendTransaction", "CustomerMobileAmendment", "CustomerRegistration",
  "GetCalculation", "SendOTP", "SendTransaction", "TransactionInquiry",
  "TransactionInquiryDefault"
];

imeLegacyRoutes.forEach(routeName => {
  const path = `/api/ime/${routeName}`;
  paths[path] = {
    post: {
      tags: ["IME Legacy"],
      summary: `${routeName} (Legacy)`,
      requestBody: jsonBody,
      responses: {
        200: { description: "Success" },
        400: { description: "Bad request" },
        500: { description: "Server error" }
      }
    }
  };
});

// Legacy GET routes with parameters
["States/{CountryId}", "Districts/{StateId}", "BankList/{CountryId}", "BankBranchList/{BankId}", 
 "Municipalities/{DistrictId}"].forEach(routeTemplate => {
  const path = `/api/ime/${routeTemplate}`;
  const paramName = routeTemplate.match(/\{([^}]+)\}/)[1];
  paths[path] = {
    get: {
      tags: ["IME Legacy"],
      summary: `${routeTemplate.split('{')[0]} (Legacy)`,
      parameters: [
        { name: paramName, in: "path", required: true, schema: { type: "string" } }
      ],
      responses: {
        200: { description: "Success" },
        400: { description: "Bad request" },
        500: { description: "Server error" }
      }
    }
  };
});

// Update existing IME paths with proper request bodies
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
const ekycPrefix = "/api/ekyc";
const cspPrefix = "/api/csp";

[
  "initiate",
  "unique-ref-status",
  "enrollment",
  "customer-onboarding",
].forEach((name) => {
  addPost(paths, `${ekycPrefix}/${name}`, "Prabhu E-KYC", name, {
    requestBody: jsonBody,
    responses: {
      200: { description: "Success" },
      400: { description: "Validation error" },
      500: { description: "Upstream/Server error" },
    },
  });
});

paths[`${ekycPrefix}/generate-token`] = {
  post: { tags: ["Prabhu E-KYC"], summary: "Generate token", requestBody: jsonBody, responses: { 200: { description: "Success" } } }
};
paths[`${ekycPrefix}/health-auth`] = {
  get: { tags: ["Prabhu E-KYC"], summary: "Health auth", responses: { 200: { description: "Success" } } },
  post: { tags: ["Prabhu E-KYC"], summary: "Health auth (POST)", requestBody: jsonBody, responses: { 200: { description: "Success" } } }
};

[
  "initiate",
  "send-otp",
  "unique-ref-status",
  "enrollment",
  "onboarding",
  "search",
  "create",
  "agent-consent",
  "mapping",
  "bio-kyc-requery",
  "unique-ref-poll",
].forEach((name) => {
  addPost(paths, `${cspPrefix}/${name}`, "Prabhu CSP", name, {
    requestBody: jsonBody,
    responses: {
      200: { description: "Success" },
      400: { description: "Validation error" },
      500: { description: "Upstream/Server error" },
    },
  });
});

paths[`${prabhuPrefix}/data`] = {
  get: { tags: ["Prabhu Data"], summary: "List Prabhu Data", responses: { 200: { description: "Success" } } },
  post: { tags: ["Prabhu Data"], summary: "Create Prabhu Data", requestBody: jsonBody, responses: { 200: { description: "Success" } } }
};
paths[`${prabhuPrefix}/data/{id}`] = {
  patch: { tags: ["Prabhu Data"], summary: "Update Prabhu Data", requestBody: jsonBody, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Success" } } },
  delete: { tags: ["Prabhu Data"], summary: "Delete Prabhu Data", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Success" } } }
};

paths[`${prabhuPrefix}/receivers`] = { get: { tags: ["Prabhu Data"], summary: "List Receivers", responses: { 200: { description: "Success" } } } };
paths[`${prabhuPrefix}/receivers/upsert`] = { post: { tags: ["Prabhu Data"], summary: "Upsert Receiver", requestBody: jsonBody, responses: { 200: { description: "Success" } } } };

paths[`${prabhuPrefix}/senders`] = { get: { tags: ["Prabhu Data"], summary: "List Senders", responses: { 200: { description: "Success" } } } };
paths[`${prabhuPrefix}/senders/upsert`] = { post: { tags: ["Prabhu Data"], summary: "Upsert Sender", requestBody: jsonBody, responses: { 200: { description: "Success" } } } };

paths[`${prabhuPrefix}/customers/search/mobile/{mobile}`] = {
  get: { tags: ["Prabhu Workflow"], summary: "Search customer by mobile", parameters: [{ name: "mobile", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Success" } } }
};
paths[`${prabhuPrefix}/customers/search/mobile`] = {
  post: { tags: ["Prabhu Workflow"], summary: "Search customer by mobile (POST)", requestBody: prabhuGetCustomerByMobileBody, responses: { 200: { description: "Success" } } }
};

paths[`${prabhuPrefix}/workflow/step1-customer`] = {
  post: { tags: ["Prabhu Workflow"], summary: "Workflow step 1 customer", requestBody: jsonBody, responses: { 200: { description: "Success" } } }
};
paths[`${prabhuPrefix}/workflow/step2-receiver`] = {
  post: { tags: ["Prabhu Workflow"], summary: "Workflow step 2 receiver", requestBody: jsonBody, responses: { 200: { description: "Success" } } }
};

// IME Legacy Endpoints (SOAP-based compatibility routes)
// Uppercase legacy base `/api/IME/*` was removed; legacy contract routes are served under `/api/ime/*` only.

// Remittance Endpoints
const remittancePrefix = "/api/Remittance";

// Location endpoints
const locationPrefix = "/api/locations";

paths[`${locationPrefix}/countries`] = {
  get: {
    tags: ["Locations"],
    summary: "Get all active countries",
    description: "Retrieve a list of all active countries for dropdown selection",
    responses: {
      200: {
        description: "Countries retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                data: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string", example: "india-uuid" },
                      name: { type: "string", example: "India" },
                      code: { type: "string", example: "IN" },
                      isActive: { type: "boolean", example: true }
                    }
                  }
                }
              }
            }
          }
        }
      },
      500: { description: "Server error" }
    }
  }
};

paths[`${locationPrefix}/states`] = {
  get: {
    tags: ["Locations"],
    summary: "Get all active states",
    description: "Retrieve a list of all active states, optionally filtered by countryId",
    parameters: [
      {
        name: "countryId",
        in: "query",
        required: false,
        schema: { type: "string" },
        description: "Filter states by country ID"
      }
    ],
    responses: {
      200: {
        description: "States retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                data: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      countryId: { type: "string" },
                      isActive: { type: "boolean" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      500: { description: "Server error" }
    }
  }
};

paths[`${locationPrefix}/districts`] = {
  get: {
    tags: ["Locations"],
    summary: "Get all active districts",
    description: "Retrieve a list of all active districts, optionally filtered by stateId",
    parameters: [
      {
        name: "stateId",
        in: "query",
        required: false,
        schema: { type: "string" },
        description: "Filter districts by state ID"
      }
    ],
    responses: {
      200: {
        description: "Districts retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                data: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      stateId: { type: "string" },
                      isActive: { type: "boolean" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      500: { description: "Server error" }
    }
  }
};

paths[`${locationPrefix}/municipalities`] = {
  get: {
    tags: ["Locations"],
    summary: "Get all active municipalities",
    description: "Retrieve a list of all active municipalities, optionally filtered by districtId",
    parameters: [
      {
        name: "districtId",
        in: "query",
        required: false,
        schema: { type: "string" },
        description: "Filter municipalities by district ID"
      }
    ],
    responses: {
      200: {
        description: "Municipalities retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                data: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      districtId: { type: "string" },
                      isActive: { type: "boolean" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      500: { description: "Server error" }
    }
  }
};

// RD Device endpoints
const rdPrefix = "/api/rd";

paths[`${rdPrefix}/capture`] = {
  post: {
    tags: ["RD Device"],
    summary: "Capture biometric data from RD device",
    description: "Capture biometric (Aadhaar) data from RD service running on client machine",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              xml: {
                type: "string",
                description: "XML string for RD device capture request"
              }
            },
            required: ["xml"]
          }
        }
      }
    },
    responses: {
      200: {
        description: "Biometric data captured successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                data: {
                  type: "object",
                  properties: {
                    EncryptedPid: { type: "string" },
                    EncryptedHmac: { type: "string" },
                    SessionKeyValue: { type: "string" },
                    CertificateIdentifier: { type: "string" },
                    RegisteredDeviceProviderId: { type: "string" },
                    RegisteredDeviceServiceId: { type: "string" },
                    RegisteredDeviceCode: { type: "string" }
                  }
                }
              }
            }
          }
        }
      },
      400: { description: "Invalid request or device error" },
      500: { description: "Device not found or RD service error" }
    }
  }
};

paths[`${rdPrefix}/info`] = {
  get: {
    tags: ["RD Device"],
    summary: "Get RD device information",
    description: "Retrieve information about the RD service running on client machine",
    responses: {
      200: {
        description: "RD device info retrieved successfully"
      },
      500: { description: "Device not found or RD service not reachable" }
    }
  }
};

// Device Management endpoints
const devicePrefix = "/api/devices";

paths[`${devicePrefix}`] = {
  get: {
    tags: ["Devices"],
    summary: "Get current device information",
    description: "Retrieve information about the current logged-in device",
    security: bearerSecurity,
    responses: {
      200: {
        description: "Device information retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  _id: { type: "string", example: "current" },
                  deviceType: { type: "string", enum: ["mobile", "tablet", "desktop"], example: "desktop" },
                  deviceName: { type: "string", example: "Current Device" },
                  os: { type: "string", example: "Windows" },
                  location: { type: "string", example: "Unknown" },
                  lastActive: { type: "string", format: "date-time" }
                }
              }
            }
          }
        }
      },
      401: { description: "Unauthorized" }
    }
  }
};

paths[`${devicePrefix}/{id}`] = {
  delete: {
    tags: ["Devices"],
    summary: "Remove a device",
    description: "Remove a device from the active devices list",
    security: bearerSecurity,
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string" },
        description: "Device ID to remove"
      }
    ],
    responses: {
      200: {
        description: "Device removed successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                message: { type: "string", example: "Device removed" }
              }
            }
          }
        }
      },
      400: { description: "Device ID is required" },
      401: { description: "Unauthorized" }
    }
  }
};

// SendPrabhuTransaction endpoint
paths[`${remittancePrefix}/SendPrabhuTransaction`] = {
  post: {
    tags: ["Remittance"],
    summary: "Save Prabhu Transaction to Database",
    description: "Save successful Prabhu transaction data to PrabhuTransaction table",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["customerId", "senderName", "receiverId", "paymentMode", "transferAmount", "pinNo"],
            properties: {
              customerId: { type: "string", example: "1108405" },
              senderName: { type: "string", example: "Ram Bahadur" },
              senderMobile: { type: "string", example: "7041897207" },
              receiverId: { type: "string", example: "3779896" },
              receiverName: { type: "string", example: "Hemraj Thapa" },
              sendCountry: { type: "string", example: "India" },
              payoutCountry: { type: "string", example: "Nepal" },
              paymentMode: { type: "string", example: "Cash Payment" },
              transferAmount: { type: "string", example: "700" },
              sendAmount: { type: "string", example: "700" },
              sendCurrency: { type: "string", example: "INR" },
              payAmount: { type: "string", example: "1120" },
              payCurrency: { type: "string", example: "NPR" },
              exchangeRate: { type: "string", example: "1.6" },
              serviceCharge: { type: "string", example: "200" },
              collectedAmount: { type: "string", example: "900" },
              accountNumber: { type: "string", example: "" },
              partnerPinNo: { type: "string", example: "PARTNER123" },
              remittanceReason: { type: "string", example: "6" },
              SourceOfFund: { type: "string", example: "10" },
              cspCode: { type: "string", example: "SHUBHPMT" },
              otpProcessId: { type: "string", example: "ff16cb3b-3611-4907-8d6b-9766add460c3" },
              otp: { type: "string", example: "958103" },
              bankCode: { type: "string", example: "" },
              transactionId: { type: "string", example: null },
              pinNo: { type: "string", example: "1111260282751950" },
              responseCode: { type: "string", example: "000" },
              responseMessage: { type: "string", example: "Success" },
              transactionStatus: { type: "string", example: "Success" },
              createdAt: { type: "string", example: "2026-04-21T09:30:00.000Z" }
            }
          }
        }
      }
    },
    responses: {
      201: { description: "Transaction saved successfully" },
      400: { description: "Bad request" },
      500: { description: "Server error" }
    }
  }
};

// Get Prabhu Transactions by User ID
paths[`${remittancePrefix}/prabhu/{userId}`] = {
  get: {
    tags: ["Remittance"],
    summary: "Get Prabhu Transactions by User ID",
    description: "Retrieve all Prabhu transactions for a specific user",
    parameters: [
      { name: "userId", in: "path", required: true, schema: { type: "string" }, example: "1108405" }
    ],
    responses: {
      200: { 
        description: "Transactions retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                message: { type: "string", example: "Prabhu transactions retrieved successfully" },
                data: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string", example: "uuid-string" },
                      customerId: { type: "string", example: "1108405" },
                      senderName: { type: "string", example: "Ram Bahadur" },
                      receiverName: { type: "string", example: "Hemraj Thapa" },
                      transferAmount: { type: "string", example: "700" },
                      transactionStatus: { type: "string", example: "Success" },
                      createdAt: { type: "string", example: "2026-04-21T09:30:00.000Z" }
                    }
                  }
                }
              }
            }
          }
        }
      },
      404: { description: "User not found" },
      500: { description: "Server error" }
    }
  }
};

// Get All Transactions
paths[`${remittancePrefix}/GetTransactions`] = {
  get: {
    tags: ["Remittance"],
    summary: "Get All Transactions",
    description: "Retrieve all transactions from database",
    responses: {
      200: { 
        description: "Transactions retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                message: { type: "string", example: "Transactions retrieved successfully" },
                data: { type: "array", items: { type: "object" } }
              }
            }
          }
        }
      },
      500: { description: "Server error" }
    }
  }
};

// Get Transaction by PIN
paths[`${remittancePrefix}/GetTransactionByPinNo`] = {
  get: {
    tags: ["Remittance"],
    summary: "Get Transaction by PIN Number",
    description: "Retrieve a specific transaction using PIN number",
    parameters: [
      { name: "pinNo", in: "query", required: true, schema: { type: "string" }, example: "1111260282751950" }
    ],
    responses: {
      200: { 
        description: "Transaction retrieved successfully",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                message: { type: "string", example: "Transaction retrieved successfully" },
                data: { type: "object" }
              }
            }
          }
        }
      },
      404: { description: "Transaction not found" },
      500: { description: "Server error" }
    }
  }
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
    { name: "Admin" },
    { name: "Super Admin" },
    { name: "Business" },
    { name: "Wallet" },
    { name: "Wallet Admin" },
    { name: "Membership" },
    { name: "Devices" },
    { name: "RD Device" },
    { name: "RD" },
    { name: "Locations" },
    { name: "Prabhu" },
    { name: "Prabhu CSP" },
    { name: "Prabhu E-KYC" },
    { name: "Prabhu Workflow" },
    { name: "Prabhu Data" },
    { name: "IME" },
    { name: "IME Legacy" },
    { name: "IME Reports" },
    { name: "IME Phase 2 eKYC" },
    { name: "Remittance" },
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
