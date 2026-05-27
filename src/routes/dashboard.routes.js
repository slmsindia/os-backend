const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const authenticate = require("../middleware/auth.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");

// SUPER_ADMIN Dashboard
router.get("/super-admin", 
  authenticate, 
  checkIdentity(['SUPER_ADMIN']), 
  dashboardController.getSuperAdminStats
);

// WHITE_LABEL_ADMIN / ADMIN Dashboard
router.get("/admin", 
  authenticate, 
  checkIdentity(['WHITE_LABEL_ADMIN', 'ADMIN']), 
  dashboardController.getAdminStats
);

// SUB_ADMIN Dashboard
router.get("/sub-admin", 
  authenticate, 
  checkIdentity(['SUB_ADMIN']), 
  dashboardController.getSubAdminStats
);

// COUNTRY_HEAD Dashboard
router.get("/country-head", 
  authenticate, 
  checkIdentity(['COUNTRY_HEAD']), 
  dashboardController.getPartnerStats
);

// STATE_PARTNER Dashboard
router.get("/state-partner", 
  authenticate, 
  checkIdentity(['STATE_PARTNER']), 
  dashboardController.getPartnerStats
);

// DISTRICT_PARTNER Dashboard
router.get("/district-partner", 
  authenticate, 
  checkIdentity(['DISTRICT_PARTNER']), 
  dashboardController.getPartnerStats
);

module.exports = router;
