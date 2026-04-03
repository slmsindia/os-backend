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
          "PhoneNumber"
        ],
        properties: {
          FirstName: { type: "string", example: "Ram" },
          LastName: { type: "string", example: "Bahadur" },
          Gender: { type: "string", enum: ["M", "F"], example: "M" },
          DateOfBirth: { type: "string", format: "date", example: "1995-06-15" },
          IDType: { type: "string", enum: ["PP", "DL", "NP_ID"], example: "NP_ID" },
          IDNumber: { type: "string", example: "504XXXXXXXX" },
          PhoneNumber: { type: "string", example: "9841234567" },
          CountryCode: { type: "string", example: "NP" }
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

const prabhuSendTransactionBody = {
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["senderName", "receiverName", "amount", "purpose", "sourceCountry", "destinationCountry"],
        properties: {
          senderName: { type: "string", example: "Ram Bahadur" },
          receiverName: { type: "string", example: "Hari Shrestha" },
          amount: { type: "number", example: 500 },
          purpose: { type: "string", example: "Family support" },
          sourceCountry: { type: "string", example: "IN" },
          destinationCountry: { type: "string", example: "NP" },
          receiverMobile: { type: "string", example: "9801234567" }
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
        required: ["pinNo", "otp"],
        properties: {
          pinNo: { type: "string", example: "PRB123456" },
          otp: { type: "string", example: "123456" }
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
        required: ["firstName", "lastName", "mobile", "idType", "idNumber"],
        properties: {
          firstName: { type: "string", example: "Ram" },
          lastName: { type: "string", example: "Bahadur" },
          mobile: { type: "string", example: "9801234567" },
          idType: { type: "string", example: "NID" },
          idNumber: { type: "string", example: "504XXXXXXXX" }
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
        required: ["firstName", "lastName", "mobile", "bankCode", "accountNo"],
        properties: {
          firstName: { type: "string", example: "Hari" },
          lastName: { type: "string", example: "Shrestha" },
          mobile: { type: "string", example: "9801234567" },
          bankCode: { type: "string", example: "NABIL" },
          accountNo: { type: "string", example: "1234567890" }
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
        required: ["bankCode", "accountNo"],
        properties: {
          bankCode: { type: "string", example: "NABIL" },
          accountNo: { type: "string", example: "1234567890" }
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
        required: ["pinNo"],
        properties: {
          pinNo: { type: "string", example: "PRB123456" },
          referenceNo: { type: "string", example: "REF123" }
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
    summary: "Get customer by ID number",
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
    summary: "Get customer by mobile",
    parameters: [
      { name: "mobile", in: "path", required: true, schema: { type: "string" } },
    ],
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
    requestBody: jsonBody,
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
paths["/api/ime/bank-accounts/validate"].post.requestBody = imeValidateBankAccountBody;
paths["/api/ime/kyc/verify"].post.requestBody = imeVerifyKycBody;

paths[`${prabhuPrefix}/SendTransaction`].post.requestBody = prabhuSendTransactionBody;
paths[`${prabhuPrefix}/ConfirmTransaction`].post.requestBody = prabhuConfirmTransactionBody;
paths[`${prabhuPrefix}/CreateCustomer`].post.requestBody = prabhuCreateCustomerBody;
paths[`${prabhuPrefix}/CreateReceiver`].post.requestBody = prabhuCreateReceiverBody;
paths[`${prabhuPrefix}/ValidateBankAccount`].post.requestBody = prabhuValidateBankBody;
paths[`${prabhuPrefix}/SearchTransaction`].post.requestBody = prabhuSearchTransactionBody;
paths[`${prabhuPrefix}/VerifyTransaction/{pinNo}`].post.requestBody = prabhuSearchTransactionBody;

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
    { name: "Prabhu" },
    { name: "IME" },
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
