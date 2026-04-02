const express = require("express");
const superAdminController = require("../controllers/superadmin.controller");

const router = express.Router();

router.post("/create-tenant", superAdminController.createTenant);

module.exports = router;
