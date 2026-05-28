const express = require("express");
const notificationController = require("../controllers/notification.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", notificationController.getNotifications);
router.patch("/mark-all-read", notificationController.markAllRead);
router.patch("/:id/read", notificationController.markAsRead);

module.exports = router;
