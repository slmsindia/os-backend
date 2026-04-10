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
router.post('/customers/send-otp', imeController.sendCustomerOtp);
router.post('/customers/confirm', imeController.confirmCustomer);
router.post('/customers', imeController.createCustomer);
router.get('/customers/search/mobile/:mobile', imeController.searchCustomerByMobile);
router.get('/customers/requery', imeController.customerRequery);
router.get('/customers/:customerId', imeController.getCustomer);
router.post('/customers/validate', imeController.validateCustomer);

/**
 * Remittance/Transaction Operations
 */
router.post('/transactions/send', imeController.sendMoney);
router.get('/transactions/:transactionId/status', imeController.getTransactionStatus);
router.post('/transactions/:transactionId/cancel', imeController.cancelTransaction);

/**
 * Receiver Management
 */
router.post('/receivers', imeController.createReceiver);
router.get('/receivers/:receiverId', imeController.getReceiver);
router.patch('/receivers/:receiverId', imeController.updateReceiver);

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
router.post('/AmendTransaction', imeController.amendTransactionLegacy);
router.get('/BalanceInquiry', imeController.balanceInquiryLegacy);
router.post('/CSPDocumentUpload', imeController.cspDocumentUploadLegacy);
router.get('/GetAccountType', imeController.getAccountTypeLegacy);
router.get('/Countries', imeController.countriesLegacy);
router.get('/States/:CountryId', imeController.statesLegacy);
router.get('/Districts/:StateId', imeController.districtsLegacy);
router.get('/Genders', imeController.gendersLegacy);
router.get('/MaritalStatus', imeController.maritalStatusLegacy);
router.get('/Occupation', imeController.occupationLegacy);
router.get('/PurposeOfRemittance', imeController.purposeOfRemittanceLegacy);
router.get('/TransactionCancelReason', imeController.transactionCancelReasonLegacy);
router.get('/GetIdTypes', imeController.getIdTypesLegacy);
router.get('/GetIdentityTypes', imeController.getIdentityTypesLegacy);
router.get('/BankList/:CountryId', imeController.bankListLegacy);
router.get('/BankBranchList/:BankId', imeController.bankBranchListLegacy);
router.get('/CSPRegistrationTypeList', imeController.cspRegistrationTypeListLegacy);
router.get('/CSPAddressProofTypeList', imeController.cspAddressProofTypeListLegacy);
router.get('/CSPOwnerAddressProofTypeList', imeController.cspOwnerAddressProofTypeListLegacy);
router.get('/CSPBusinessTypeList', imeController.cspBusinessTypeListLegacy);
router.get('/CSPDocumentTypeList', imeController.cspDocumentTypeListLegacy);
router.get('/OwnerCategoryTypes', imeController.ownerCategoryTypesLegacy);
router.get('/EducationalQualificationList', imeController.educationalQualificationListLegacy);
router.get('/Municipalities/:DistrictId', imeController.municipalitiesLegacy);
router.get('/RelationshipList', imeController.relationshipListLegacy);
router.get('/IDPlaceofIssue', imeController.idPlaceOfIssueLegacy);
router.get('/SourceOfFundList', imeController.sourceOfFundListLegacy);
router.post('/CSPRegistration', imeController.cspRegistrationLegacy);
router.post('/CancelTransaction', imeController.cancelTransactionLegacy);
router.get('/CheckCSP', imeController.checkCSPLegacy);
router.get('/CheckCustomer/:mobileNo', imeController.checkCustomerLegacy);
router.post('/ConfirmCustomerRegistration', imeController.confirmCustomerRegistrationLegacy);
router.post('/ConfirmSendTransaction', imeController.confirmSendTransactionLegacy);
router.post('/CustomerMobileAmendment', imeController.customerMobileAmendmentLegacy);
router.post('/CustomerRegistration', imeController.customerRegistrationLegacy);
router.post('/GetCalculation', imeController.getCalculationLegacy);
router.post('/SendOTP', imeController.sendOtpLegacy);
router.post('/SendTransaction', imeController.sendTransactionLegacy);
router.post('/TransactionInquiry', imeController.transactionInquiryLegacy);
router.post('/TransactionInquiryDefault', imeController.transactionInquiryDefaultLegacy);

module.exports = router;
