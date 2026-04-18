const express = require("express");
const adminController = require("../controllers/admin.controller");
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

module.exports = router;
