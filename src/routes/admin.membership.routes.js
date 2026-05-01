const express = require("express");
const adminMembershipController = require("../controllers/admin.membership.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkPermission } = require("../middleware/permission.middleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Delegation (Only for top admins)
router.post("/membership/delegate-approval", checkPermission("MEMBERSHIP_APPROVE"), adminMembershipController.delegateApproval);

// Membership price management (Only for top admins)
router.put("/membership/price", checkPermission("ADMIN_MANAGE"), adminMembershipController.updateMembershipPrice);
router.post("/membership/price", checkPermission("ADMIN_MANAGE"), adminMembershipController.updateMembershipPrice);

// Membership applications (Accessible by admins and delegated users)
router.post("/membership/create-user", checkPermission("HIERARCHY_VIEW"), adminMembershipController.createUser);
router.post("/agent/create", checkPermission("HIERARCHY_VIEW"), adminMembershipController.createUser); // Alias for agent creation
router.get("/membership/applications", checkPermission("MEMBERSHIP_APPROVE"), adminMembershipController.getMembershipApplications);
router.get("/membership/applications/:applicationId", checkPermission("MEMBERSHIP_APPROVE"), adminMembershipController.getApplicationDetails);
router.post("/membership/applications/:applicationId/approve", checkPermission("MEMBERSHIP_APPROVE"), adminMembershipController.approveApplication);
router.post("/membership/applications/:applicationId/reject", checkPermission("MEMBERSHIP_APPROVE"), adminMembershipController.rejectApplication);

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
