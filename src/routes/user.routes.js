const express = require("express");
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

const router = express.Router();

router.get("/profile", authMiddleware, userController.getProfile);
router.patch("/:id/role", authMiddleware, checkRole(["ADMIN"]), userController.changeRole);

module.exports = router;
