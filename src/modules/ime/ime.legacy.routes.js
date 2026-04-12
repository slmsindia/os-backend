const express = require('express');
const imeController = require('./ime.controller');
const router = express.Router();

// --- Static Data Endpoints (GET) ---
router.get('/Countries', (req, res) => imeController.getStaticData({ query: { type: 'WSST-CONV1' } }, res));
router.get('/States/:CountryId', (req, res) => imeController.getStaticData({ query: { type: 'WSST-STTV1', reference: req.params.CountryId } }, res));
router.get('/Districts/:StateId', (req, res) => imeController.getStaticData({ query: { type: 'WSST-DISV1', reference: req.params.StateId } }, res));
router.get('/Municipalities/:DistrictId', (req, res) => imeController.getStaticData({ query: { type: 'WSST-MUNV1', reference: req.params.DistrictId } }, res));
router.get('/Genders', (req, res) => imeController.getStaticData({ query: { type: 'WSST-GDRV1' } }, res));
router.get('/MaritalStatus', (req, res) => imeController.getStaticData({ query: { type: 'WSST-MSSV1' } }, res));
router.get('/Occupation', (req, res) => imeController.getStaticData({ query: { type: 'WSST-OCPV1' } }, res));
router.get('/SourceOfFundList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-SOFV1' } }, res));
router.get('/GetIdTypes', (req, res) => imeController.getStaticData({ query: { type: 'WSST-IDTV1', reference: req.query.countrycode } }, res));
router.get('/GetIdentityTypes', (req, res) => imeController.getStaticData({ query: { type: 'WSST-IDTV1', reference: req.query.countrycode } }, res));
router.get('/IDPlaceofIssue', (req, res) => imeController.getStaticData({ query: { type: 'WSST-POIV1' } }, res));
router.get('/RelationshipList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-RELV1' } }, res));
router.get('/PurposeOfRemittance', (req, res) => imeController.getStaticData({ query: { type: 'WSST-PORV1' } }, res));
router.get('/TransactionCancelReason', (req, res) => imeController.getStaticData({ query: { type: 'WSST-TCRV1' } }, res));
router.get('/BankList/:CountryId', (req, res) => imeController.getStaticData({ query: { type: 'WSST-BKLV1', reference: req.params.CountryId } }, res));
router.get('/BankBranchList/:BankId', (req, res) => imeController.getStaticData({ query: { type: 'WSST-BBLV1', reference: req.params.BankId } }, res));
router.get('/CSPRegistrationTypeList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-REGV1' } }, res));
router.get('/CSPAddressProofTypeList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-ADPV1' } }, res));
router.get('/CSPOwnerAddressProofTypeList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-OAPV1' } }, res));
router.get('/CSPBusinessTypeList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-BUSV1' } }, res));
router.get('/CSPDocumentTypeList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-ADOV1' } }, res));
router.get('/OwnerCategoryTypes', (req, res) => imeController.getStaticData({ query: { type: 'WSST-CATV1' } }, res));
router.get('/EducationalQualificationList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-EDQV1' } }, res));

// --- Main Business Endpoints (POST/GET) ---
router.post('/CSPRegistration', imeController.cspRegistration);
router.post('/CSPDocumentUpload', imeController.cspDocumentUpload);
router.get('/CheckCSP', imeController.checkCSP);
router.get('/BalanceInquiry', imeController.balanceInquiry);
router.get('/CheckCustomer/:mobileNo', imeController.checkCustomer);
router.post('/SendOTP', imeController.sendCustomerOtp);
router.post('/CustomerRegistration', imeController.createCustomer);
router.post('/ConfirmCustomerRegistration', imeController.confirmCustomer);
router.post('/GetCalculation', imeController.getCalculation);
router.post('/SendTransaction', imeController.sendTransaction);
router.post('/ConfirmSendTransaction', imeController.confirmSendTransaction);
router.post('/TransactionInquiry', imeController.transactionInquiry);
router.post('/TransactionInquiryDefault', imeController.transactionInquiryDefault);
router.post('/AmendTransaction', imeController.amendTransaction);
router.post('/CancelTransaction', imeController.cancelTransaction);
router.post('/CustomerMobileAmendment', imeController.customerMobileAmendment);

module.exports = router;