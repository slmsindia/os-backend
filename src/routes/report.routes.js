const express = require("express");
const reportController = require("../controllers/report.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");

const router = express.Router();

router.use(authMiddleware);

/**
 * @route GET /api/admin/reports/transactions
 * @desc Get detailed transaction report with CSV export
 */
router.get(
  "/transactions", 
  checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "SUPPORT_TEAM"]), 
  reportController.getTransactionReport
);

module.exports = router;
