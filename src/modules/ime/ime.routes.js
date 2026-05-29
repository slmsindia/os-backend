<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main

const express = require('express');
const imeController = require('./ime.controller');
const router = express.Router();

// IME Base & Auth Endpoints
router.post('/GetCalculation', imeController.getCalculation);
router.post('/SendOTP', imeController.sendOtp);
router.post('/authenticate', imeController.authenticate);
router.post('/login', imeController.login);

// IME Modern Customers Endpoints
<<<<<<< HEAD
=======
const express = require('express');
const imeController = require('./ime.controller');

const router = express.Router();

/**
 * Authentication & Session Management
 */
router.post('/authenticate', imeController.authenticate);
router.post('/login', imeController.login);

/**
 * Customer Operations
 */
>>>>>>> main
=======
>>>>>>> origin/main
router.post('/customers/send-otp', imeController.sendCustomerOtp);
router.post('/customers/confirm', imeController.confirmCustomer);
router.post('/customers', imeController.createCustomer);
router.get('/customers/search/mobile/:mobile', imeController.searchCustomerByMobile);
router.get('/customers/requery', imeController.customerRequery);
router.get('/customers/:customerId', imeController.getCustomer);
router.post('/customers/validate', imeController.validateCustomer);

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main
// IME Transactions Endpoints
router.post('/SendTransaction', imeController.sendTransaction);
router.post('/TransactionInquiry', imeController.transactionInquiry);
router.post('/CancelTransaction', imeController.cancelTransaction);
router.post('/ConfirmSendTransaction', imeController.confirmSendTransaction);

// IME Receivers Endpoints
<<<<<<< HEAD
=======
/**
 * Remittance/Transaction Operations
 */
router.post('/transactions/send', imeController.sendMoney);
router.get('/transactions/:transactionId/status', imeController.getTransactionStatus);
router.post('/transactions/:transactionId/cancel', imeController.cancelTransaction);

/**
 * Receiver Management
 */
>>>>>>> main
=======
>>>>>>> origin/main
router.post('/receivers', imeController.createReceiver);
router.get('/receivers/:receiverId', imeController.getReceiver);
router.patch('/receivers/:receiverId', imeController.updateReceiver);

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main
// IME Storage/Database Endpoints
router.get('/storage/transactions', imeController.getStoredTransactions);
router.get('/storage/receivers', imeController.getStoredReceivers);


// IME Static & Utility Endpoints
router.post('/bank-accounts/validate', imeController.validateBankAccount);

// Standard Legacy Aliases (Full 32 items support)
router.get('/GetAccountType', imeController.getStaticData);
router.get('/Countries', imeController.getStaticData);
router.get('/Genders', imeController.getStaticData);
router.get('/MaritalStatus', imeController.getStaticData);
router.get('/Occupation', imeController.getStaticData);
router.get('/PurposeOfRemittance', imeController.getStaticData);
router.get('/TransactionCancelReason', imeController.getStaticData);
router.get('/GetIdTypes', imeController.getStaticData);
router.get('/GetIdentityTypes', imeController.getStaticData);
router.get('/CSPRegistrationTypeList', imeController.getStaticData);
router.get('/CSPAddressProofTypeList', imeController.getStaticData);
router.get('/CSPOwnerAddressProofTypeList', imeController.getStaticData);
router.get('/CSPBusinessTypeList', imeController.getStaticData);
router.get('/CSPDocumentTypeList', imeController.getStaticData);
router.get('/OwnerCategoryTypes', imeController.getStaticData);
router.get('/EducationalQualificationList', imeController.getStaticData);
router.get('/RelationshipList', imeController.getStaticData);
router.get('/IDPlaceofIssue', imeController.getStaticData);
router.get('/SourceOfFundList', imeController.getStaticData);
router.get('/DeviceList', imeController.getStaticData);
router.get('/ConnectivityTypeList', imeController.getStaticData);
router.get('/CustomerAnnualIncomeList', imeController.getStaticData);
router.get('/PhysicallyHandicappedList', imeController.getStaticData);
router.get('/AlternateOccupationList', imeController.getStaticData);
router.get('/OwnerIdTypeList', imeController.getStaticData);
router.get('/AdditionalCourseList', imeController.getStaticData);
router.get('/OwnerByAgentList/:AgentId', imeController.getStaticData);
router.get('/BankByAgentList/:AgentId', imeController.getStaticData);

// Parameterized Legacy Routes
router.get('/States/:CountryId', imeController.getStaticData);
router.get('/Districts/:StateId', imeController.getStaticData);
router.get('/Municipalities/:DistrictId', imeController.getStaticData);
router.get('/GetIdTypes/:CountryId', imeController.getStaticData);
router.get('/BankList/:CountryId', imeController.getStaticData);
router.get('/BankBranchList/:BankId', imeController.getStaticData);

router.post('/kyc/verify', imeController.verifyKYC);
router.get('/compliance/:customerId/status', imeController.getComplianceStatus);
router.get('/customers/:customerId/transactions', imeController.getTransactionHistory);
router.get('/exchange-rate', imeController.getExchangeRate);

<<<<<<< HEAD
=======
/**
 * IME Data Storage Operations
 */
router.get('/data', imeController.listImeData);
router.post('/data', imeController.createImeData);
router.patch('/data/:id', imeController.updateImeData);
router.delete('/data/:id', imeController.deleteImeData);

/**
 * Bank & Payment Operations
 */
router.get('/payment-modes', imeController.getPaymentModes);
router.post('/bank-accounts/validate', imeController.validateBankAccount);
router.get('/banks', imeController.getBankList);
router.get('/bank-branches', imeController.getBankBranches);
router.get('/static-data', imeController.getStaticData);
router.get('/id-issue-places', imeController.getIssuePlaces);

/**
 * Compliance & Verification
 */
router.post('/kyc/verify', imeController.verifyKYC);
router.get('/compliance/:customerId/status', imeController.getComplianceStatus);

/**
 * Reporting & Queries
 */
router.get('/customers/:customerId/transactions', imeController.getTransactionHistory);
router.get('/exchange-rate', imeController.getExchangeRate);

/**
 * Legacy IME Contract Compatibility Routes
 */
router.post('/AmendTransaction', imeController.amendTransaction);
router.get('/BalanceInquiry', imeController.balanceInquiry);
router.post('/CSPDocumentUpload', imeController.cspDocumentUpload);
router.get('/GetAccountType', imeController.getAccountType);
router.get('/Countries', imeController.countries);
router.get('/States/:CountryId', imeController.states);
router.get('/Districts/:StateId', imeController.districts);
router.get('/Genders', imeController.genders);
router.get('/MaritalStatus', imeController.maritalStatus);
router.get('/Occupation', imeController.occupation);
router.get('/PurposeOfRemittance', imeController.purposeOfRemittance);
router.get('/TransactionCancelReason', imeController.transactionCancelReason);
router.get('/GetIdTypes', imeController.getIdTypes);
router.get('/GetIdentityTypes', imeController.getIdentityTypes);
router.get('/BankList/:CountryId', imeController.bankList);
router.get('/BankBranchList/:BankId', imeController.bankBranchList);
router.get('/CSPRegistrationTypeList', imeController.cspRegistrationTypeList);
router.get('/CSPAddressProofTypeList', imeController.cspAddressProofTypeList);
router.get('/CSPOwnerAddressProofTypeList', imeController.cspOwnerAddressProofTypeList);
router.get('/CSPBusinessTypeList', imeController.cspBusinessTypeList);
router.get('/CSPDocumentTypeList', imeController.cspDocumentTypeList);
router.get('/OwnerCategoryTypes', imeController.ownerCategoryTypes);
router.get('/EducationalQualificationList', imeController.educationalQualificationList);
router.get('/Municipalities/:DistrictId', imeController.municipalities);
router.get('/RelationshipList', imeController.relationshipList);
router.get('/IDPlaceofIssue', imeController.idPlaceOfIssue);
router.get('/SourceOfFundList', imeController.sourceOfFundList);
router.post('/CSPRegistration', imeController.cspRegistration);
router.post('/CancelTransaction', imeController.cancelTransaction);
router.get('/CheckCSP', imeController.checkCSP);
router.get('/CheckCustomer/:mobileNo', imeController.checkCustomer);
router.post('/ConfirmCustomerRegistration', imeController.confirmCustomerRegistration);
router.post('/ConfirmSendTransaction', imeController.confirmSendTransaction);
router.post('/CustomerMobileAmendment', imeController.customerMobileAmendment);
router.post('/CustomerRegistration', imeController.customerRegistration);
router.post('/GetCalculation', imeController.getCalculation);
router.post('/SendOTP', imeController.sendOtp);
router.post('/SendTransaction', imeController.sendTransaction);
router.post('/TransactionInquiry', imeController.transactionInquiry);
router.post('/TransactionInquiryDefault', imeController.transactionInquiryDefault);
>>>>>>> main
=======
>>>>>>> origin/main

module.exports = router;
