const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Helper to get model from prisma client regardless of capitalization
const getModel = (name) => {
  const lowercase = name.toLowerCase();
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  return prisma[lowercase] || prisma[capitalized];
};

const locationController = {
  getCountries: async (req, res) => {
    try {
      const model = getModel('country');
      if (!model) throw new Error("Country model not found in Prisma Client");

      const countries = await model.findMany({
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
        availableModels: Object.keys(prisma).filter(k => !k.startsWith('_'))
      });
    }
  },

  getStates: async (req, res) => {
    const { countryId } = req.query;
    try {
      const model = getModel('state');
      if (!model) throw new Error("State model not found in Prisma Client");

      const states = await model.findMany({
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
      const model = getModel('district');
      if (!model) throw new Error("District model not found in Prisma Client");

      const districts = await model.findMany({
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
      const model = getModel('municipality');
      if (!model) throw new Error("Municipality model not found in Prisma Client");

      const municipalities = await model.findMany({
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
