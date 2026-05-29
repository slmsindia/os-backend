const express = require("express");
const router = express.Router();
const marketingController = require("../controllers/marketing.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.use(authMiddleware);

// --- Public (For all users to get their banners/notifications) ---
router.get("/my-content", marketingController.getContentForMe);

// --- Admin Endpoints (Manage own marketing) ---
router.post("/content", marketingController.createContent);
router.get("/my-created", marketingController.getMyContent);
router.patch("/content/:id", marketingController.updateContent);
router.delete("/content/:id", marketingController.deleteContent);

// --- Super Admin Endpoints (Oversight) ---
router.get("/superadmin/all", marketingController.superAdminListAll);
router.patch("/superadmin/toggle/:id", marketingController.superAdminToggle);

module.exports = router;
