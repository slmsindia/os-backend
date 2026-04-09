const express = require('express');
const cspController = require('./csp.controller');

const router = express.Router();

router.post('/csp/token', cspController.token);
router.post('/csp/search', cspController.search);
router.post('/csp/send-otp', cspController.sendOtp);
router.post('/csp/create', cspController.create);
router.post('/csp/mapping', cspController.mapping);
router.post('/csp/initiate', cspController.initiate);
router.post('/csp/uniquerefstatus', cspController.uniqueRefStatus);
router.post('/csp/enrollment', cspController.enrollment);
router.post('/csp/biokyc-requery', cspController.bioKycRequery);
router.post('/csp/onboarding', cspController.onboarding);
router.post('/csp/agent-consent', cspController.agentConsent);

router.get('/states', cspController.states);

module.exports = router;
