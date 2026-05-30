const express = require("express");
const router = express.Router();
const jobsController = require("../controllers/jobs.controller");
const { checkIdentity } = require("../middleware/identity.middleware");
const authMiddleware = require("../middleware/auth.middleware");

// નવી જોબ ઉમેરવા માટે
router.post(
  "/", 
  authMiddleware, 
  checkIdentity(['WHITE_LABEL_ADMIN', 'ADMIN']), 
  jobsController.createJob
);
router.get('/stats', authMiddleware, jobsController.getJobStats);
router.get("/job/:id", authMiddleware, jobsController.getJobById);
// જોબ્સનું લિસ્ટ જોવા માટે
router.get("/", jobsController.getJobs);

module.exports = router;