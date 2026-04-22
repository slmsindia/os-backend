const express = require('express');
const remittanceController = require('../modules/remittance/remittance.controller');
const authMiddleware = require('../middleware/auth.middleware');
const router = express.Router();

// Prabhu Transaction endpoints
router.post('/SendPrabhuTransaction', authMiddleware, remittanceController.sendPrabhuTransaction);
router.get('/prabhu/:userId', authMiddleware, remittanceController.getPrabhuTransactions);
router.get('/GetTransactions', authMiddleware, remittanceController.getTransactions);
router.get('/GetTransactionByPinNo', authMiddleware, remittanceController.getTransactionByPinNo);

module.exports = router;
