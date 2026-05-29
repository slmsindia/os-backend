const express = require("express");
const superAdminController = require("../controllers/superadmin.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/create-tenant", checkIdentity(["SUPER_ADMIN"]), superAdminController.createTenant);
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main
router.get("/tenants", checkIdentity(["SUPER_ADMIN"]), superAdminController.getAllTenants);
router.get("/tenants/:tenantId/roots", checkIdentity(["SUPER_ADMIN"]), superAdminController.getTenantRoots);
router.post("/transfer-hierarchy", checkIdentity(["SUPER_ADMIN"]), superAdminController.transferHierarchy);
router.post("/tenants/razorpay", checkIdentity(["SUPER_ADMIN"]), superAdminController.updateTenantRazorpay);
<<<<<<< HEAD
=======
>>>>>>> main
=======
>>>>>>> origin/main

module.exports = router;
