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

// Remittance Endpoints
const remittancePrefix = "/api/Remittance";

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
    { name: "Wallet" },
    { name: "Wallet Admin" },
    { name: "Membership" },
    { name: "Devices" },
    { name: "RD" },
    { name: "Prabhu" },
    { name: "Prabhu CSP" },
    { name: "Prabhu E-KYC" },
    { name: "Prabhu Workflow" },
    { name: "Prabhu Data" },
    { name: "IME" },
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
