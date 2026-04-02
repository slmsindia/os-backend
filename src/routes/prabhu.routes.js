const express = require("express");
const prabhuController = require("../controllers/prabhu.controller");

const router = express.Router();

router.post("/GetStateDistrict", prabhuController.getStateDistrict);
router.post("/GetStaticData", prabhuController.getStaticData);
router.post("/GetEcho", prabhuController.getEcho);
router.post("/GetCashPayLocationList", prabhuController.getCashPayLocationList);
router.post("/GetAcPayBankBranchList", prabhuController.getAcPayBankBranchList);
router.post("/GetBalance", prabhuController.getBalance);
router.post("/SendOTP", prabhuController.sendOTP);
router.post("/GetServiceCharge", prabhuController.getServiceCharge);
router.post("/GetServiceChargeByCollection", prabhuController.getServiceChargeByCollection);
router.post("/CancelTransaction", prabhuController.cancelTransaction);
router.post("/UnverifiedTransactions", prabhuController.unverifiedTransactions);
router.post("/ComplianceTransactions", prabhuController.complianceTransactions);
router.post("/UploadDocument", prabhuController.uploadDocument);
router.post("/SendTransaction", prabhuController.sendTransaction);
router.post("/ConfirmTransaction", prabhuController.confirmTransaction);
router.post("/SearchTransaction", prabhuController.searchTransaction);
router.post("/ValidateBankAccount", prabhuController.validateBankAccount);
router.post("/CreateReceiver", prabhuController.createReceiver);
router.post("/CreateCustomer", prabhuController.createCustomer);
router.post("/GetUnverifiedCustomers", prabhuController.getUnverifiedCustomers);
router.post("/RegisterComplaint", prabhuController.registerComplaint);
router.post("/TrackComplaint", prabhuController.trackComplaint);

router.get("/GetCustomerByIdNumber/:customerIdNo", prabhuController.getCustomerByIdNumber);
router.get("/GetCustomerByMobile/:mobile", prabhuController.getCustomerByMobile);
router.post("/VerifyTransaction/:pinNo", prabhuController.verifyTransaction);

module.exports = router;
