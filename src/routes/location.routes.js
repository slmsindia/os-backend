const express = require("express");
const router = express.Router();
const locationController = require("../controllers/location.controller");

router.get("/countries", locationController.getCountries);
router.get("/states", locationController.getStates);
router.get("/districts", locationController.getDistricts);
router.get("/municipalities", locationController.getMunicipalities);

router.post("/proxy/states", locationController.proxyStates);
router.post("/proxy/cities", locationController.proxyCities);

module.exports = router;
