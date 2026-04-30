const express = require("express");
const permissionController = require("../controllers/admin.permission.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkIdentity } = require("../middleware/identity.middleware");

const router = express.Router();

router.use(authMiddleware);

/**
 * @route POST /api/admin/permissions/sync
 * @desc Initialize standard permissions (One-time)
 */
router.post("/sync", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN"]), permissionController.syncPermissions);

/**
 * @route GET /api/admin/permissions/list
 * @desc Get all available permissions in the system
 */
router.get("/list", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), permissionController.getAvailablePermissions);

/**
 * @route POST /api/admin/permissions/assign
 * @desc Assign permissions to a Sub-Admin
 */
router.post("/assign", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), permissionController.assignPermissionsToSubAdmin);

/**
 * @route GET /api/admin/permissions/subadmin/:subAdminId
 * @desc Get current permissions of a Sub-Admin
 */
router.get("/subadmin/:subAdminId", checkIdentity(["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"]), permissionController.getSubAdminPermissions);

module.exports = router;
