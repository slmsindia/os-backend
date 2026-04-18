const express = require("express");
const saathiController = require("../controllers/saathi.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { checkRole } = require("../middleware/role.middleware");

const router = express.Router();

// Public routes - Search saathis
router.get("/search", saathiController.searchSaathis);
router.get("/:id", saathiController.getSaathiDetails);

// Protected routes
router.use(authMiddleware);

// User routes - Book saathi
router.post("/book", saathiController.bookSaathi);
router.get("/bookings/my", saathiController.getMyBookings);
router.patch("/bookings/:id/cancel", saathiController.cancelBooking);

// Saathi routes - Agent dashboard
router.get("/agent/bookings", saathiController.getSaathiBookings);
router.patch("/agent/bookings/:id", saathiController.updateBookingStatus);
router.get("/agent/stats", saathiController.getSaathiStats);

// Admin routes
router.get("/admin/all", checkRole(["ADMIN", "SUPER_ADMIN"]), saathiController.getAllSaathis);
router.get("/admin/bookings", checkRole(["ADMIN", "SUPER_ADMIN"]), saathiController.getAllBookings);

module.exports = router;
