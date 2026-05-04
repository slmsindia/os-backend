const express = require("express");
const adminController = require("../controllers/admin.controller");
const adminMembershipController = require("../controllers/admin.membership.controller");
const adminConfigController = require("../controllers/admin.config.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");
// Assuming we'll use identity check instead of role check for these
const { checkIdentity } = require("../middleware/identity.middleware");
const { checkPermission } = require("../middleware/permission.middleware");

const router = express.Router();

router.use(authMiddleware);

// Get dashboard statistics (Moved to top for priority)
router.get("/stats", checkPermission("REPORT_VIEW"), adminController.getStats);

router.post("/create-white-label-admin", checkIdentity(["SUPER_ADMIN"]), adminController.createWhiteLabelAdmin);
router.post("/create-admin", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN"]), adminController.createAdmin);
router.post("/create-sub-admin", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), adminController.createSubAdmin);
router.post("/create-country-head", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN"]), adminController.createCountryHead);
router.post("/create-state", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD"]), adminController.createState);
router.post("/create-district", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER"]), adminController.createDistrict);
router.post("/create-agent", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER", "DISTRICT_PARTNER"]), adminController.createAgent);
router.post("/create-user", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER", "DISTRICT_PARTNER", "AGENT"]), adminController.createUser);

// Get all users (with filtering and pagination)
router.get("/users", checkPermission("HIERARCHY_VIEW"), adminController.getAllUsers);

// Get specific user details by ID
router.get("/users/:id", checkPermission("HIERARCHY_VIEW"), adminController.getUserById);

// Get membership applications for approve/reject flow
router.get("/members", checkPermission("MEMBERSHIP_APPROVE"), adminMembershipController.getMembershipApplications);

// Toggle user status (Activate/Deactivate)
router.post("/users/:userId/toggle-status", checkPermission("USER_TOGGLE_STATUS"), adminController.toggleUserStatus);

// Razorpay Multi-tenant Settings (White Label Admin only)
router.get("/razorpay-settings", checkIdentity(["WHITE_LABEL_ADMIN"]), adminController.getRazorpaySettings);
router.post("/razorpay-settings", checkIdentity(["WHITE_LABEL_ADMIN"]), adminController.updateRazorpaySettings);

// Internal Hierarchy Transfer (White Label Admin only)
router.post("/transfer-hierarchy", checkIdentity(["WHITE_LABEL_ADMIN"]), adminController.transferHierarchyInternal);

// Service Fee Config (White Label Admin only)
router.get("/config/service-fees", checkIdentity(["WHITE_LABEL_ADMIN"]), adminConfigController.getServiceFees);
router.post("/config/service-fees", checkIdentity(["WHITE_LABEL_ADMIN"]), adminConfigController.setServiceFee);

module.exports = router;
