const express = require("express");
const businessPartnerController = require("../controllers/admin.business.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");

const router = express.Router();

router.use(authMiddleware);

// Fee Management (Top Admins only)
router.put("/fee", 
  checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), 
  businessPartnerController.updateBusinessPartnerFee
);
router.post("/fee", 
  checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), 
  businessPartnerController.updateBusinessPartnerFee
);
router.get("/fee", businessPartnerController.getBusinessPartnerFee);
router.get("/facilities", businessPartnerController.getFacilities);
router.post("/facilities", businessPartnerController.addFacility);

// Apply for Business Partner
router.post("/apply", businessPartnerController.createApplication);

const { checkPermission } = require("../middleware/permission.middleware");

// Admin controls
router.get("/applications", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN"]), checkPermission(["PERM_VIEW_APPLICATIONS", "PERM_APPROVE_APPLICATIONS", "PERM_MANAGE_APPLICATIONS"]), businessPartnerController.getApplications);
router.get("/applications/:applicationId", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN"]), checkPermission(["PERM_VIEW_APPLICATIONS", "PERM_APPROVE_APPLICATIONS", "PERM_MANAGE_APPLICATIONS"]), businessPartnerController.getApplicationById);
router.post("/verify-payment", businessPartnerController.verifyPayment);
router.post("/applications/:applicationId/approve", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN"]), checkPermission(["PERM_APPROVE_APPLICATIONS", "PERM_MANAGE_APPLICATIONS"]), businessPartnerController.approveApplication);
router.post("/applications/:applicationId/reject", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN"]), checkPermission(["PERM_APPROVE_APPLICATIONS", "PERM_MANAGE_APPLICATIONS"]), businessPartnerController.rejectApplication);

module.exports = router;
