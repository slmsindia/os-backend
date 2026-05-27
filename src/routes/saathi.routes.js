const express = require("express");
const saathiController = require("../controllers/saathi.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/fee", saathiController.getSaathiFee);
router.post("/apply", saathiController.applyForSaathi);

module.exports = router;
