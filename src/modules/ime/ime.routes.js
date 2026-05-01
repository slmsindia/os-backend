
const express = require('express');
const imeController = require('./ime.controller');
const router = express.Router();

// IME Base & Auth Endpoints
router.post('/calculation', imeController.getCalculation);
router.post('/send-otp', imeController.sendOtp);
router.post('/authenticate', imeController.authenticate);
router.post('/login', imeController.login);

// IME Modern Customers Endpoints
router.post('/customers/send-otp', imeController.sendCustomerOtp);
router.post('/customers/confirm', imeController.confirmCustomer);
router.post('/customers', imeController.createCustomer);
router.get('/customers/search/mobile/:mobile', imeController.searchCustomerByMobile);
router.get('/customers/requery', imeController.customerRequery);
router.get('/customers/:customerId', imeController.getCustomer);
router.post('/customers/validate', imeController.validateCustomer);

// IME Transactions Endpoints
router.post('/SendTransaction', imeController.sendTransaction);
router.get('/transactions/:transactionId/status', imeController.getTransactionStatus);
router.post('/transactions/:transactionId/cancel', imeController.cancelTransaction);
router.post('/transactions/confirm', imeController.confirmSendTransaction);

// IME Receivers Endpoints
router.post('/receivers', imeController.createReceiver);
router.get('/receivers/:receiverId', imeController.getReceiver);
router.patch('/receivers/:receiverId', imeController.updateReceiver);


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


module.exports = router;
