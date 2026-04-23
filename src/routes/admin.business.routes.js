const express = require("express");
const router = express.Router();
const adminBusinessController = require("../controllers/admin.business.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");

router.use(authMiddleware);
router.use(checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]));

// Application Management
router.get("/applications", adminBusinessController.getApplications);
router.post("/applications/:id/process", adminBusinessController.processApplication);

// Master Data Creation
router.post("/skills", (req, res) => adminBusinessController.createMasterData(req, res, "skill"));
router.post("/facilities", (req, res) => adminBusinessController.createMasterData(req, res, "jobFacility"));
router.post("/countries", (req, res) => adminBusinessController.createMasterData(req, res, "country"));
router.post("/states", (req, res) => adminBusinessController.createMasterData(req, res, "state"));
router.post("/districts", (req, res) => adminBusinessController.createMasterData(req, res, "district"));
router.post("/municipalities", (req, res) => adminBusinessController.createMasterData(req, res, "municipality"));

module.exports = router;
