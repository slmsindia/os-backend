const express = require("express");
const adminController = require("../controllers/admin.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/pricing", checkIdentity(["ADMIN"]), adminController.listPricingSettings);
router.put("/pricing/:key", checkIdentity(["ADMIN"]), adminController.upsertPricingSetting);
router.post("/create-state", checkIdentity(["ADMIN"]), adminController.createState);
router.post("/create-district", checkIdentity(["ADMIN", "STATE_PARTNER"]), adminController.createDistrict);
router.post("/create-agent", checkIdentity(["ADMIN", "STATE_PARTNER", "DISTRICT_PARTNER"]), adminController.createAgent);
router.post("/create-user", checkIdentity(["ADMIN", "STATE_PARTNER", "DISTRICT_PARTNER", "AGENT"]), adminController.createUser);

module.exports = router;
