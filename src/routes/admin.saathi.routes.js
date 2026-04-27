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

// Only Admins/Partners can create Saathi directly
router.post("/create-direct", 
  checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER", "DISTRICT_PARTNER"]), 
  adminSaathiController.createSaathiDirectly
);

// Alias for convenience
router.post("/create-directly", 
  checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER", "DISTRICT_PARTNER"]), 
  adminSaathiController.createSaathiDirectly
);

// Management routes
router.get("/applications", adminSaathiController.getSaathiApplications);
router.get("/applications/:applicationId", adminSaathiController.getSaathiApplicationById);
router.post("/verify-payment", adminSaathiController.verifyPayment);
router.post("/applications/:applicationId/approve", adminSaathiController.approveApplication);
router.post("/applications/:applicationId/reject", adminSaathiController.rejectApplication);

// Delegation (Top Admins only)
router.post("/delegate-approval", 
  checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), 
  adminSaathiController.delegateSaathiApproval
);

module.exports = router;
