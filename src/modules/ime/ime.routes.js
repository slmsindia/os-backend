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

module.exports = router;
