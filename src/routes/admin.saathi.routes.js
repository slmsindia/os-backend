const express = require("express");
const adminSaathiController = require("../controllers/admin.saathi.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");

const router = express.Router();

router.use(authMiddleware);

// Fee Management (Top Admins only)
router.put("/fee",
  checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]),
  adminSaathiController.updateSaathiFee
);
router.post("/fee",
  checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]),
  adminSaathiController.updateSaathiFee
);
router.get("/fee", adminSaathiController.getSaathiFee);

// Only Admins/Partners/Members can create Saathi
router.post("/create-direct",
  checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER", "DISTRICT_PARTNER", "BUSINESS_PARTNER", "SAATHI", "MEMBER", "AGENT", "USER"]),
  adminSaathiController.createSaathiDirectly
);

// Alias for convenience
router.post("/create-directly",
  checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER", "DISTRICT_PARTNER", "BUSINESS_PARTNER", "SAATHI", "MEMBER", "AGENT", "USER"]),
  adminSaathiController.createSaathiDirectly
);

const { checkPermission } = require("../middleware/permission.middleware");

// Management routes
router.get("/applications", checkPermission("PERM_MANAGE_APPLICATIONS"), adminSaathiController.getSaathiApplications);
router.get("/applications/:applicationId", checkPermission("PERM_MANAGE_APPLICATIONS"), adminSaathiController.getSaathiApplicationById);
router.post("/verify-payment", adminSaathiController.verifyPayment);
router.post("/applications/:applicationId/approve", checkPermission("PERM_MANAGE_APPLICATIONS"), adminSaathiController.approveApplication);
router.post("/applications/:applicationId/reject", checkPermission("PERM_MANAGE_APPLICATIONS"), adminSaathiController.rejectApplication);

// Delegation (Top Admins only)
router.post("/delegate-approval",
  checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]),
  adminSaathiController.delegateSaathiApproval
);

module.exports = router;
