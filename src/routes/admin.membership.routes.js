const express = require("express");
const adminMembershipController = require("../controllers/admin.membership.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");
const { checkMembershipAccess } = require("../middleware/membership.middleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Delegation (Only for top admins)
router.post("/membership/delegate-approval", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), adminMembershipController.delegateApproval);

// Membership price management (Only for top admins)
router.put("/membership/price", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), adminMembershipController.updateMembershipPrice);

// Membership applications (Accessible by admins and delegated users)
router.get("/membership/applications", checkMembershipAccess, adminMembershipController.getMembershipApplications);
router.get("/membership/applications/:applicationId", checkMembershipAccess, adminMembershipController.getApplicationDetails);
router.post("/membership/applications/:applicationId/approve", checkMembershipAccess, adminMembershipController.approveApplication);
router.post("/membership/applications/:applicationId/reject", checkMembershipAccess, adminMembershipController.rejectApplication);

// Education management
router.post("/education", adminMembershipController.createEducation);
router.get("/education", adminMembershipController.getEducations);

// Sector management
router.post("/sector", adminMembershipController.createSector);
router.get("/sector", adminMembershipController.getSectors);

// Job role management
router.post("/job-role", adminMembershipController.createJobRole);
router.get("/job-role", adminMembershipController.getJobRoles);

// Document type management
router.post("/document-type", adminMembershipController.createDocumentType);
router.get("/document-type", adminMembershipController.getDocumentTypes);

module.exports = router;
