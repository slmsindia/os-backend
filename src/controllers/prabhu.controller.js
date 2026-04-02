const prabhuService = require("../services/prabhu.service");

const ok = (res, message, payload) => {
  return res.json({
    success: true,
    message,
    ...payload
  });
};

const fail = (res, error) => {
  const status = error.response?.status || 500;
  const details = error.response?.data || { message: error.message };
  return res.status(status).json({
    success: false,
    message: error.message,
    error: details
  });
};

const proxyOperation = (operation, message) => async (req, res) => {
  try {
    const result = await prabhuService.callEndpoint(operation, req.body || {});
    return ok(res, message || `${operation} success`, { data: result.data });
  } catch (error) {
    return fail(res, error);
  }
};

const getCustomerByIdNumber = async (req, res) => {
  try {
    const customer_IdNo = req.params.customerIdNo;
    if (!customer_IdNo) {
      return res.status(400).json({ success: false, message: "customerIdNo is required" });
    }

    const result = await prabhuService.callEndpoint("GetCustomerById", {
      customer_IdNo
    });

    return ok(res, "Get customer by ID number success", { data: result.data });
  } catch (error) {
    return fail(res, error);
  }
};

const getCustomerByMobile = async (req, res) => {
  try {
    const customer_Mobile = req.params.mobile;
    if (!customer_Mobile) {
      return res.status(400).json({ success: false, message: "mobile is required" });
    }

    const result = await prabhuService.callEndpoint("GetCustomerByMobile", {
      customer_Mobile
    });

    return ok(res, "Get customer by mobile success", { data: result.data });
  } catch (error) {
    return fail(res, error);
  }
};

const verifyTransaction = async (req, res) => {
  try {
    const pinNo = req.params.pinNo;
    if (!pinNo) {
      return res.status(400).json({ success: false, message: "pinNo is required" });
    }

    const result = await prabhuService.callEndpoint("SearchTransaction", {
      pinNo,
      ...(req.body || {})
    });

    return ok(res, "Verify transaction success", { data: result.data });
  } catch (error) {
    return fail(res, error);
  }
};

module.exports = {
  getStateDistrict: proxyOperation("GetStateDistrict", "Get state/district success"),
  getStaticData: proxyOperation("GetStaticData", "Get static data success"),
  getEcho: proxyOperation("GetEcho", "Get echo success"),
  getCashPayLocationList: proxyOperation("GetCashPayLocationList", "Get cash pay location list success"),
  getAcPayBankBranchList: proxyOperation("GetAcPayBankBranchList", "Get bank branch list success"),
  getBalance: proxyOperation("GetBalance", "Get balance success"),
  sendOTP: proxyOperation("SendOTP", "Send OTP success"),
  getServiceCharge: proxyOperation("GetServiceCharge", "Get service charge success"),
  getServiceChargeByCollection: proxyOperation("GetServiceChargeByCollection", "Get service charge by collection success"),
  cancelTransaction: proxyOperation("CancelTransaction", "Cancel transaction success"),
  unverifiedTransactions: proxyOperation("UnverifiedTransactions", "Get unverified transactions success"),
  complianceTransactions: proxyOperation("ComplianceTransactions", "Compliance transactions success"),
  uploadDocument: proxyOperation("UploadDocument", "Upload document success"),
  sendTransaction: proxyOperation("SendTransaction", "Send transaction success"),
  confirmTransaction: proxyOperation("ConfirmTransaction", "Confirm transaction success"),
  getCustomerByIdNumber,
  searchTransaction: proxyOperation("SearchTransaction", "Search transaction success"),
  validateBankAccount: proxyOperation("ValidateBankAccount", "Validate bank account success"),
  createReceiver: proxyOperation("CreateReceiver", "Create receiver success"),
  createCustomer: proxyOperation("CreateCustomer", "Create customer success"),
  getUnverifiedCustomers: proxyOperation("GetUnverifiedCustomers", "Get unverified customers success"),
  getCustomerByMobile,
  registerComplaint: proxyOperation("RegisterComplaint", "Register complaint success"),
  trackComplaint: proxyOperation("TrackComplaint", "Track complaint success"),
  verifyTransaction
};
