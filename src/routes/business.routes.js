const express = require("express");
const router = express.Router();
const businessController = require("../controllers/business.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");

router.use(authMiddleware);

// Business Partner Application
router.post("/apply", checkIdentity(["USER", "SAATHI", "MEMBER"]), businessController.apply);
router.get("/status", businessController.getBusinessStatus);

// Job Postings
router.post("/jobs", checkIdentity(["BUSINESS_PARTNER", "SUPER_ADMIN"]), businessController.postJob);

module.exports = router;
