const express = require("express");
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

const router = express.Router();

router.get("/profile", authMiddleware, userController.getProfile);
router.get("/approvals/pending", authMiddleware, checkRole(["ADMIN", "SUPER_ADMIN"]), userController.listPendingApprovals);
router.patch("/:id/role", authMiddleware, checkRole(["ADMIN", "SUPER_ADMIN"]), userController.changeRole);
router.patch("/:id/user-type", authMiddleware, checkRole(["ADMIN", "SUPER_ADMIN"]), userController.setUserType);
router.patch("/:id/approval", authMiddleware, checkRole(["ADMIN", "SUPER_ADMIN"]), userController.approveUser);

module.exports = router;
