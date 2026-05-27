const express = require("express");
const router = express.Router();
const locationController = require("../controllers/location.controller");

router.get("/countries", locationController.getCountries);
router.get("/states", locationController.getStates);
router.get("/districts", locationController.getDistricts);
router.get("/municipalities", locationController.getMunicipalities);

module.exports = router;
