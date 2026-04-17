const express = require("express");
const superAdminController = require("../controllers/superadmin.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/create-tenant", checkIdentity(["SUPER_ADMIN"]), superAdminController.createTenant);

module.exports = router;
