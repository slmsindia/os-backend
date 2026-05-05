const express = require("express");
const adminMembershipController = require("../controllers/admin.membership.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkPermission } = require("../middleware/permission.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Delegation (Only for top admins)
router.post("/membership/delegate-approval", checkPermission("PERM_MANAGE_APPLICATIONS"), adminMembershipController.delegateApproval);

// Membership price management (Only for top admins)
router.put("/membership/price", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN"]), adminMembershipController.updateMembershipPrice);
router.post("/membership/price", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN"]), adminMembershipController.updateMembershipPrice);

// Membership applications (Accessible by admins and delegated users)
router.post("/membership/create-user", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER", "DISTRICT_PARTNER", "BUSINESS_PARTNER", "SAATHI", "MEMBER", "AGENT", "USER"]), adminMembershipController.createUser);
router.post("/agent/create", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER", "DISTRICT_PARTNER", "BUSINESS_PARTNER", "SAATHI", "MEMBER", "AGENT", "USER"]), adminMembershipController.createUser); // Alias for agent creation
router.get("/membership/applications", checkPermission("PERM_MANAGE_APPLICATIONS"), adminMembershipController.getMembershipApplications);
router.get("/membership/applications/:applicationId", checkPermission("PERM_MANAGE_APPLICATIONS"), adminMembershipController.getApplicationDetails);
router.post("/membership/applications/:applicationId/approve", checkPermission("PERM_MANAGE_APPLICATIONS"), adminMembershipController.approveApplication);
router.post("/membership/applications/:applicationId/reject", checkPermission("PERM_MANAGE_APPLICATIONS"), adminMembershipController.rejectApplication);

// Education management
router.post("/education", adminMembershipController.createEducation);
router.get("/education", adminMembershipController.getEducations);

// Sector management
router.post("/sector", adminMembershipController.createSector);
router.get("/sector", adminMembershipController.getSectors);

// Job role management
router.post("/job-role", adminMembershipController.createJobRole);
router.get("/job-role", adminMembershipController.getJobRoles);

// Skill management
router.post("/skill", adminMembershipController.createSkill);
router.get("/skill", adminMembershipController.getSkills);

// Document type management
router.post("/document-type", adminMembershipController.createDocumentType);
router.get("/document-type", adminMembershipController.getDocumentTypes);

module.exports = router;
