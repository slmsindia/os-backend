const express = require('express');
const imeController = require('./ime.controller');
const router = express.Router();

// --- Static Data Endpoints (GET) ---
router.all('/Countries', (req, res) => imeController.getStaticData({ query: { type: 'WSST-CONV1' }, body: req.body }, res));
router.all('/States/:CountryId', (req, res) => imeController.getStaticData({ query: { type: 'WSST-STTV1', reference: req.params.CountryId }, body: req.body }, res));
router.all('/Districts/:StateId', (req, res) => imeController.getStaticData({ query: { type: 'WSST-DISV1', reference: req.params.StateId }, body: req.body }, res));
router.all('/Municipalities/:DistrictId', (req, res) => imeController.getStaticData({ query: { type: 'WSST-MUNV1', reference: req.params.DistrictId }, body: req.body }, res));
router.all('/Genders', (req, res) => imeController.getStaticData({ query: { type: 'WSST-GDRV1' }, body: req.body }, res));
router.all('/MaritalStatus', (req, res) => imeController.getStaticData({ query: { type: 'WSST-MSSV1' }, body: req.body }, res));
router.all('/Occupation', (req, res) => imeController.getStaticData({ query: { type: 'WSST-OCPV1' }, body: req.body }, res));
router.all('/SourceOfFundList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-SOFV1' }, body: req.body }, res));
router.all('/GetIdTypes', (req, res) => imeController.getStaticData({ query: { type: 'WSST-IDTV1', reference: req.query.countrycode || (req.body && req.body.countrycode) }, body: req.body }, res));
router.all('/GetIdentityTypes', (req, res) => imeController.getStaticData({ query: { type: 'WSST-IDTV1', reference: req.query.countrycode || (req.body && req.body.countrycode) }, body: req.body }, res));
router.all('/IDPlaceofIssue', (req, res) => imeController.getStaticData({ query: { type: 'WSST-POIV1' }, body: req.body }, res));
router.all('/RelationshipList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-RELV1' }, body: req.body }, res));
router.all('/TransactionCancelReason', (req, res) => imeController.getStaticData({ query: { type: 'WSST-TCRV1' }, body: req.body }, res));
router.all('/BankBranchList/:BankId', (req, res) => imeController.getStaticData({ query: { type: 'WSST-BBLV1', reference: req.params.BankId }, body: req.body }, res));
router.all('/CSPAddressProofTypeList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-ADPV1' }, body: req.body }, res));
router.all('/CSPOwnerAddressProofTypeList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-OAPV1' }, body: req.body }, res));
router.all('/CSPDocumentTypeList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-ADOV1' }, body: req.body }, res));
router.all('/OwnerCategoryTypes', (req, res) => imeController.getStaticData({ query: { type: 'WSST-CATV1' }, body: req.body }, res));
router.all('/EducationalQualificationList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-EDQV1' }, body: req.body }, res));
router.all('/BankList/:CountryId', (req, res) => imeController.getStaticData({ query: { type: 'WSST-BKLV1', reference: req.params.CountryId }, body: req.body }, res));

// Also add POST mapping for the ones without path parameters that Swagger uses
router.all('/States', (req, res) => imeController.getStaticData({ query: { type: 'WSST-STTV1' }, body: req.body }, res));
router.all('/Districts', (req, res) => imeController.getStaticData({ query: { type: 'WSST-DISV1' }, body: req.body }, res));
router.all('/Municipalities', (req, res) => imeController.getStaticData({ query: { type: 'WSST-MUNV1' }, body: req.body }, res));
router.all('/BankList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-BKLV1' }, body: req.body }, res));
router.all('/BankBranchList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-BBLV1' }, body: req.body }, res));
router.all('/GetAccountType', (req, res) => imeController.getStaticData({ query: { type: 'WSST-ACCV1' }, body: req.body }, res));
router.all('/CSPRegistrationTypeList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-REGV1' }, body: req.body }, res));
router.all('/CSPBusinessTypeList', (req, res) => imeController.getStaticData({ query: { type: 'WSST-BUSV1' }, body: req.body }, res));
router.all('/PurposeOfRemittance', (req, res) => imeController.getStaticData({ query: { type: 'WSST-PORV1' }, body: req.body }, res));

// --- Main Business Endpoints (POST/GET) ---
router.post('/CSPRegistration', imeController.cspRegistration);
router.post('/CSPDocumentUpload', imeController.cspDocumentUpload);
router.get('/CheckCSP', imeController.checkCSP);
router.get('/BalanceInquiry', imeController.balanceInquiry);
router.get('/CheckCustomer/:mobileNo', imeController.checkCustomer);
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