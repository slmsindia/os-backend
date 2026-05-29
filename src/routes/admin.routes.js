const express = require("express");
const adminController = require("../controllers/admin.controller");
<<<<<<< HEAD
<<<<<<< HEAD
const adminMembershipController = require("../controllers/admin.membership.controller");
const adminConfigController = require("../controllers/admin.config.controller");
=======
>>>>>>> main
=======
const adminMembershipController = require("../controllers/admin.membership.controller");
const adminConfigController = require("../controllers/admin.config.controller");
>>>>>>> origin/main
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");
// Assuming we'll use identity check instead of role check for these
const { checkIdentity } = require("../middleware/identity.middleware");
<<<<<<< HEAD
<<<<<<< HEAD
const { checkPermission } = require("../middleware/permission.middleware");
=======
>>>>>>> main
=======
const { checkPermission } = require("../middleware/permission.middleware");
>>>>>>> origin/main

const router = express.Router();

router.use(authMiddleware);

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main
// Get dashboard statistics (Moved to top for priority)
router.get("/stats", checkPermission("PERM_VIEW_REPORTS"), adminController.getStats);

// Get top 10 active users
router.get("/top-users", checkPermission("PERM_VIEW_REPORTS"), adminController.getTopUsers);

router.post("/create-white-label-admin", checkIdentity(["SUPER_ADMIN"]), adminController.createWhiteLabelAdmin);
router.post("/create-admin", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN"]), adminController.createAdmin);
router.post("/create-sub-admin", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), adminController.createSubAdmin);
router.post("/create-country-head", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN"]), checkPermission("PERM_MANAGE_HIERARCHY"), adminController.createCountryHead);
router.post("/create-state", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD"]), checkPermission("PERM_MANAGE_HIERARCHY"), adminController.createState);
router.post("/create-district", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER"]), checkPermission("PERM_MANAGE_HIERARCHY"), adminController.createDistrict);
router.post("/create-agent", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER", "DISTRICT_PARTNER"]), checkPermission("PERM_MANAGE_HIERARCHY"), adminController.createAgent);
router.post("/create-user", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "COUNTRY_HEAD", "STATE_PARTNER", "DISTRICT_PARTNER", "AGENT"]), checkPermission("PERM_MANAGE_HIERARCHY"), adminController.createUser);

// Get all users (with filtering and pagination)
router.get("/users", checkPermission("PERM_MANAGE_HIERARCHY"), adminController.getAllUsers);

// Get specific user details by ID
router.get("/users/:id", checkPermission("PERM_MANAGE_HIERARCHY"), adminController.getUserById);

// Get membership applications for approve/reject flow
router.get("/members", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN"]), checkPermission(["PERM_VIEW_APPLICATIONS", "PERM_APPROVE_APPLICATIONS", "PERM_MANAGE_APPLICATIONS"]), adminMembershipController.getMembershipApplications);

// Toggle user status (Activate/Deactivate)
router.post("/users/:userId/toggle-status", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN"]), checkPermission("PERM_MANAGE_HIERARCHY"), adminController.toggleUserStatus);

// Razorpay Multi-tenant Settings (White Label Admin only)
router.get("/razorpay-settings", checkIdentity(["WHITE_LABEL_ADMIN"]), adminController.getRazorpaySettings);
router.post("/razorpay-settings", checkIdentity(["WHITE_LABEL_ADMIN"]), adminController.updateRazorpaySettings);

// Internal Hierarchy Transfer (White Label Admin only)
router.get("/potential-parents", checkIdentity(["WHITE_LABEL_ADMIN", "SUPER_ADMIN"]), adminController.getPotentialParents);
router.post("/transfer-hierarchy", checkIdentity(["WHITE_LABEL_ADMIN", "SUPER_ADMIN"]), adminController.transferHierarchyInternal);

// Service Fee Config (White Label Admin only)
router.get("/config/service-fees", checkIdentity(["WHITE_LABEL_ADMIN"]), adminConfigController.getServiceFees);
router.post("/config/service-fees", checkIdentity(["WHITE_LABEL_ADMIN"]), adminConfigController.setServiceFee);
<<<<<<< HEAD
=======
router.post("/create-state", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), adminController.createState);
router.post("/create-district", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "STATE_PARTNER"]), adminController.createDistrict);
router.post("/create-agent", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "STATE_PARTNER", "DISTRICT_PARTNER"]), adminController.createAgent);
router.post("/create-user", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "STATE_PARTNER", "DISTRICT_PARTNER", "AGENT"]), adminController.createUser);
>>>>>>> main
=======
>>>>>>> origin/main

module.exports = router;
