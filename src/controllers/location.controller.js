const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const locationController = {
  getCountries: async (req, res) => {
    try {
      const countries = await prisma.country.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" }
      });
      res.json({ success: true, data: countries });
    } catch (err) {
      console.error("Error fetching countries:", err);
      res.status(500).json({ 
        success: false, 
        message: "Error fetching countries", 
        error: err.message,
        available: Object.keys(prisma).filter(k => !k.startsWith('_'))
      });
    }
  },

  getStates: async (req, res) => {
    const { countryId } = req.query;
    try {
      const states = await prisma.state.findMany({
        where: { 
          isActive: true,
          ...(countryId ? { countryId } : {})
        },
        orderBy: { name: "asc" }
      });
      res.json({ success: true, data: states });
    } catch (err) {
      console.error("Error fetching states:", err);
      res.status(500).json({ success: false, message: "Error fetching states", error: err.message });
    }
  },

  getDistricts: async (req, res) => {
    const { stateId } = req.query;
    try {
      const districts = await prisma.district.findMany({
        where: { 
          isActive: true,
          ...(stateId ? { stateId } : {})
        },
        orderBy: { name: "asc" }
      });
      res.json({ success: true, data: districts });
    } catch (err) {
      console.error("Error fetching districts:", err);
      res.status(500).json({ success: false, message: "Error fetching districts", error: err.message });
    }
  },

  getMunicipalities: async (req, res) => {
    const { districtId } = req.query;
    try {
      const municipalities = await prisma.municipality.findMany({
        where: { 
          isActive: true,
          ...(districtId ? { districtId } : {})
        },
        orderBy: { name: "asc" }
      });
      res.json({ success: true, data: municipalities });
    } catch (err) {
      console.error("Error fetching municipalities:", err);
      res.status(500).json({ success: false, message: "Error fetching municipalities", error: err.message });
    }
  }
};

module.exports = locationController;
