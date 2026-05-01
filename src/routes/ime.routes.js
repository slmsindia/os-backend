const express = require('express');
const imeController = require('../controllers/ime.controller');
const authMiddleware = require('../middleware/auth.middleware');
const router = express.Router();

// IME Endpoints (Phase 1)
router.post('/login', imeController.login); // Example login endpoint
router.post('/authenticate', imeController.authenticate); // Example authenticate endpoint
router.get('/GetStaticData', authMiddleware, imeController.getStaticData);
router.post('/CSPRegistration', authMiddleware, imeController.cspRegistration);
router.post('/CSPDocumentUpload', authMiddleware, imeController.cspDocumentUpload);
router.get('/CSPCheck', authMiddleware, imeController.cspCheck);
router.get('/BalanceInquiry', authMiddleware, imeController.balanceInquiry);
router.get('/CheckCustomer', authMiddleware, imeController.checkCustomer);
router.post('/SendOTP', authMiddleware, imeController.sendOtp);
router.post('/CustomerRegistration', authMiddleware, imeController.customerRegistration);
router.post('/ConfirmCustomerRegistration', authMiddleware, imeController.confirmCustomerRegistration);
router.get('/GetCalculation', authMiddleware, imeController.getCalculation);
router.post('/SendTransaction', authMiddleware, imeController.sendTransaction);

module.exports = router;
