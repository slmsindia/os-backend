const express = require("express");
const superAdminController = require("../controllers/superadmin.controller");

const router = express.Router();

// Logic for super admin auth could go here (e.g. a static secret or special identity)
router.post("/create-tenant", superAdminController.createTenant);

module.exports = router;
