const express = require("express");
const adminController = require("../controllers/admin.controller");
const adminMembershipController = require("../controllers/admin.membership.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");
// Assuming we'll use identity check instead of role check for these
const { checkIdentity } = require("../middleware/identity.middleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/create-state", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), adminController.createState);
router.post("/create-district", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "STATE_PARTNER"]), adminController.createDistrict);
router.post("/create-agent", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "STATE_PARTNER", "DISTRICT_PARTNER"]), adminController.createAgent);
router.post("/create-user", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "STATE_PARTNER", "DISTRICT_PARTNER", "AGENT"]), adminController.createUser);

// Get all users (with filtering and pagination)
router.get("/users", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "SUPPORT_TEAM"]), adminController.getAllUsers);

// Get specific user details by ID
router.get("/users/:id", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "SUPPORT_TEAM"]), adminController.getUserById);

// Get membership applications for approve/reject flow
router.get("/members", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "SUPPORT_TEAM"]), adminMembershipController.getMembershipApplications);

// Get dashboard statistics
router.get("/stats", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN", "SUB_ADMIN", "SUPPORT_TEAM"]), adminController.getStats);

module.exports = router;
