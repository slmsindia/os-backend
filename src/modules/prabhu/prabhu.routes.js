const express = require('express');
const prabhuController = require('./prabhu.controller');

const router = express.Router();

router.post('/GetStateDistrict', prabhuController.getStateDistrict);
router.post('/GetStaticData', prabhuController.getStaticData);
router.post('/GetEcho', prabhuController.getEcho);
router.post('/GetCashPayLocationList', prabhuController.getCashPayLocationList);
router.post('/GetAcPayBankBranchList', prabhuController.getAcPayBankBranchList);
router.post('/GetBalance', prabhuController.getBalance);
router.post('/SendOTP', prabhuController.sendOTP);
router.post('/GetServiceCharge', prabhuController.getServiceCharge);
router.post('/GetServiceChargeByCollection', prabhuController.getServiceChargeByCollection);
router.post('/CancelTransaction', prabhuController.cancelTransaction);
router.post('/UnverifiedTransactions', prabhuController.unverifiedTransactions);
router.post('/ComplianceTransactions', prabhuController.complianceTransactions);
router.post('/UploadDocument', prabhuController.uploadDocument);
router.post('/SendTransaction', prabhuController.sendTransaction);
router.post('/ConfirmTransaction', prabhuController.confirmTransaction);
router.post('/SearchTransaction', prabhuController.searchTransaction);
router.post('/ValidateBankAccount', prabhuController.validateBankAccount);
router.post('/CreateReceiver', prabhuController.createReceiver);
router.post('/CreateCustomer', prabhuController.createCustomer);
router.post('/GetUnverifiedCustomers', prabhuController.getUnverifiedCustomers);
router.post('/GetCustomerById', prabhuController.getCustomerByIdNumber);
router.post('/GetCustomerByMobile', prabhuController.getCustomerByMobile);
router.post('/workflow/step1-customer', prabhuController.workflowStep1Customer);
router.post('/workflow/step2-receiver', prabhuController.workflowStep2Receiver);
router.get('/customers/search/mobile/:mobile', prabhuController.searchCustomerByMobile);
router.post('/customers/search/mobile', prabhuController.searchCustomerByMobile);
router.post('/RegisterComplaint', prabhuController.registerComplaint);
router.post('/TrackComplaint', prabhuController.trackComplaint);

router.get('/GetCustomerByIdNumber/:customerIdNo', prabhuController.getCustomerByIdNumber);
router.get('/GetCustomerByMobile/:mobile', prabhuController.getCustomerByMobile);
router.post('/VerifyTransaction/:pinNo', prabhuController.verifyTransaction);

router.post('/ekyc/generate-token', prabhuController.ekycGenerateToken);
router.get('/ekyc/health-auth', prabhuController.ekycAuthHealth);
router.post('/ekyc/health-auth', prabhuController.ekycAuthHealth);
router.post('/ekyc/initiate', prabhuController.ekycInitiate);
router.post('/ekyc/unique-ref-status', prabhuController.ekycUniqueRefStatus);
router.post('/ekyc/enrollment', prabhuController.ekycEnrollment);
router.post('/ekyc/customer-onboarding', prabhuController.ekycCustomerOnboarding);

router.post('/csp/initiate', prabhuController.cspInitiate);
router.post('/csp/unique-ref-status', prabhuController.cspUniqueRefStatus);
router.post('/csp/enrollment', prabhuController.cspEnrollment);
router.post('/csp/onboarding', prabhuController.cspOnboarding);
router.post('/csp/search', prabhuController.cspSearch);
router.post('/csp/create', prabhuController.cspCreate);
router.post('/csp/agent-consent', prabhuController.cspAgentConsent);
router.post('/csp/mapping', prabhuController.cspMapping);
router.post('/csp/bio-kyc-requery', prabhuController.cspBioKycRequery);

router.get('/data', prabhuController.listPrabhuData);
router.post('/data', prabhuController.createPrabhuData);
router.patch('/data/:id', prabhuController.updatePrabhuData);
router.delete('/data/:id', prabhuController.deletePrabhuData);
router.get('/receivers', prabhuController.listPrabhuReceivers);
router.post('/receivers/upsert', prabhuController.upsertPrabhuReceiver);
router.get('/senders', prabhuController.listPrabhuSenders);
router.post('/senders/upsert', prabhuController.upsertPrabhuSender);

module.exports = router;