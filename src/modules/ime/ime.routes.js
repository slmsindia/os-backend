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

module.exports = router;
