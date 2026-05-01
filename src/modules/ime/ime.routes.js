
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
router.post('/customers/confirm-registration', imeController.confirmCustomerRegistration);

// IME Modern Transactions Endpoints
router.post('/transactions/send', imeController.sendMoney);
router.get('/transactions/:transactionId/status', imeController.getTransactionStatus);
router.post('/transactions/:transactionId/cancel', imeController.cancelTransaction);
router.post('/transactions/confirm', imeController.confirmSendTransaction);

// IME Receivers Endpoints
router.post('/receivers', imeController.createReceiver);
router.get('/receivers/:receiverId', imeController.getReceiver);
router.patch('/receivers/:receiverId', imeController.updateReceiver);

// IME Data Endpoints
router.get('/data', imeController.listImeData);
router.post('/data', imeController.createImeData);
router.patch('/data/:id', imeController.updateImeData);
router.delete('/data/:id', imeController.deleteImeData);

// IME Static & Utility Endpoints
router.get('/payment-modes', imeController.getPaymentModes);
router.post('/bank-accounts/validate', imeController.validateBankAccount);
router.get('/banks', imeController.getBankList);
router.get('/bank-branches', imeController.getBankBranches);
router.get('/static-data', imeController.getStaticData);
router.get('/id-issue-places', imeController.getIssuePlaces);
router.post('/kyc/verify', imeController.verifyKYC);
router.get('/compliance/:customerId/status', imeController.getComplianceStatus);
router.get('/customers/:customerId/transactions', imeController.getTransactionHistory);
router.get('/exchange-rate', imeController.getExchangeRate);


module.exports = router;
