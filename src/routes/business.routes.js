const express = require("express");
const router = express.Router();
const businessController = require("../controllers/business.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");

router.use(authMiddleware);

// Business Partner Application
router.post(
  "/apply",
  checkIdentity(["USER", "SAATHI", "MEMBER"]),
  businessController.apply,
);

// Business status (used by CreateJobPage to check if user has a profile)
router.get("/status", businessController.getBusinessStatus);

// Job stats for Admin Dashboard
router.get("/stats", businessController.getJobStats);

// Browse all active jobs (any logged-in user)
router.get("/list", businessController.getJobs);

// My jobs — admins see all, business partners see their own
router.get(
  "/my-jobs",
  checkIdentity([
    "BUSINESS_PARTNER",
    "SUPER_ADMIN",
    "WHITE_LABEL_ADMIN",
    "ADMIN",
    "SUB_ADMIN",
  ]),
  businessController.getMyJobs,
);

// Post a new job — admins + business partners
router.post(
  "/jobs",
  checkIdentity([
    "BUSINESS_PARTNER",
    "SUPER_ADMIN",
    "WHITE_LABEL_ADMIN",
    "ADMIN",
    "SUB_ADMIN",
  ]),
  businessController.postJob,
);

// Update a job
router.put(
  "/job/:id",
  checkIdentity([
    "BUSINESS_PARTNER",
    "SUPER_ADMIN",
    "WHITE_LABEL_ADMIN",
    "ADMIN",
    "SUB_ADMIN",
  ]),
  businessController.updateJob,
);

// Delete / close a job
router.delete(
  "/job/:id",
  checkIdentity([
    "BUSINESS_PARTNER",
    "SUPER_ADMIN",
    "WHITE_LABEL_ADMIN",
    "ADMIN",
    "SUB_ADMIN",
  ]),
  businessController.deleteJob,
);

module.exports = router;
