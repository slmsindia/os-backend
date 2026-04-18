const express = require("express");
const serviceRegistryController = require("../controllers/service-registry.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Public routes - Get active services (for clients)
router.get("/active", serviceRegistryController.getActiveServices);
router.get("/service/:name", serviceRegistryController.getService);

// Failover routes
router.get("/failover/:name", serviceRegistryController.getFailoverChain);
router.get("/best/:type", serviceRegistryController.getBestService);

// Admin routes
router.get("/admin/all", checkRole(["ADMIN", "SUPER_ADMIN"]), serviceRegistryController.getAllServices);
router.post("/admin", checkRole(["ADMIN", "SUPER_ADMIN"]), serviceRegistryController.createService);
router.patch("/admin/:id", checkRole(["ADMIN", "SUPER_ADMIN"]), serviceRegistryController.updateService);
router.patch("/admin/:id/status", checkRole(["ADMIN", "SUPER_ADMIN"]), serviceRegistryController.toggleServiceStatus);
router.patch("/admin/:id/health", checkRole(["ADMIN", "SUPER_ADMIN"]), serviceRegistryController.updateHealth);
router.delete("/admin/:id", checkRole(["ADMIN", "SUPER_ADMIN"]), serviceRegistryController.deleteService);
router.post("/admin/initialize", checkRole(["ADMIN", "SUPER_ADMIN"]), serviceRegistryController.initializeDefaults);
router.get("/admin/stats", checkRole(["ADMIN", "SUPER_ADMIN"]), serviceRegistryController.getServiceStats);

module.exports = router;
