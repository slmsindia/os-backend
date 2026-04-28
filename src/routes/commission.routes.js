const express = require("express");
const router = express.Router();
const commissionController = require("../controllers/commission.controller");
const authenticate = require("../middleware/auth.middleware"); // Adjust if name differs

// All routes require authentication
router.use(authenticate);

// 1. Commission Schemes
router.get("/GetCommissionSchemes", commissionController.getCommissionSchemes);
router.get("/GetCommissionSchemeById", commissionController.getCommissionSchemeById);
router.post("/AddCommissionSchemes", commissionController.addCommissionSchemes);
router.put("/UpdateCommissionSchemes", commissionController.updateCommissionSchemes);
router.get("/UpdateCommissionSchemeStatus", commissionController.updateCommissionSchemeStatus);
router.post("/AssignSchemeToUser", commissionController.assignSchemeToUser);

// 2. Commission Services
router.get("/GetCommissionServices", commissionController.getCommissionServices);
router.get("/UpdateCommissionServiceStatus", commissionController.updateCommissionServiceStatus);
router.post("/AddCommissionService", commissionController.addCommissionService);

// 3. Commission Sub-Services
router.get("/GetCommissionSubServices", commissionController.getCommissionSubServices);
router.get("/UpdateCommissionSubServiceStatus", commissionController.updateCommissionSubServiceStatus);
router.post("/AddCommissionSubService", commissionController.addCommissionSubService);
router.get("/GetServicesSubServices", commissionController.getServicesSubServices);
router.get("/GetServiceSubServiceBySchemeId", commissionController.getServiceSubServiceBySchemeId);

// 4. Commission Share
router.post("/AddCommissionShare", commissionController.addCommissionShare);
router.put("/UpdateCommissionShare", commissionController.addCommissionShare); // Reuse logic for update
router.post("/UpdateSingleCommissionShare", commissionController.updateSingleCommissionShare);

// 5. Transactions
router.post("/GetAllTransactions", commissionController.getAllTransactions);

// 6. Commission History
router.get("/AddCommissionHistory", commissionController.addCommissionHistoryManual);
router.post("/GetCommissionHistory", commissionController.getCommissionHistory);

// 7. Wallet History
router.post("/GetWalletHistory", commissionController.getWalletHistory);

// 8. Super Admin Income
router.post("/GetSuperAdminIncome", commissionController.getSuperAdminIncome);

// 9. Helper Dropdowns
router.get("/TransactionLogCredtedByDropdown", commissionController.transactionLogCreditedByDropdown);
router.get("/TransactionLogCredtedForDropdown", commissionController.transactionLogCreditedForDropdown);

module.exports = router;
