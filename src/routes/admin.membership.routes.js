const express = require("express");
const adminMembershipController = require("../controllers/admin.membership.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");

const router = express.Router();

// All routes require authentication and admin identity
router.use(authMiddleware);
router.use(checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]));

// Membership price management
router.put("/membership/price", adminMembershipController.updateMembershipPrice);

// Membership applications
router.get("/membership/applications", adminMembershipController.getMembershipApplications);
router.get("/membership/applications/:applicationId", adminMembershipController.getApplicationDetails);
router.post("/membership/applications/:applicationId/approve", adminMembershipController.approveApplication);
router.post("/membership/applications/:applicationId/reject", adminMembershipController.rejectApplication);

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
