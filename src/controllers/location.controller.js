const prisma = require("../lib/prisma");

// Helper to get model from prisma client regardless of capitalization
const getModel = (name) => {
  const lowercase = name.toLowerCase();
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  return prisma[lowercase] || prisma[capitalized];
};

const cleanStateName = (name) => {
  if (!name) return "";
  return name
    .toString()
    .replace(/(?:\s+Province|\s+State|\s+Pradesh|\s+Region|\s+Division)$/i, "")
    .trim()
    .toLowerCase();
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
  },

  proxyStates: async (req, res) => {
    const { country } = req.body;
    try {
      const axios = require("axios");
      let apiKey = process.env.CSC_API_KEY || 'YOUR_API_KEY';
      // Strip outer double quotes if present in env configuration
      if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
        apiKey = apiKey.slice(1, -1);
      }
      
      if (!apiKey || apiKey === 'YOUR_API_KEY' || apiKey.includes('YOUR_')) {
        return res.status(400).json({
          success: false,
          message: "CountryStateCity API Key (CSC_API_KEY) is not configured.",
          tip: "Please sign up at https://app.countrystatecity.in/api-keys to obtain your free API key, then update the CSC_API_KEY value in your backend .env file."
        });
      }
      const countryCode = country === 'Nepal' ? 'NP' : 'IN';
      
      const response = await axios.get(`https://api.countrystatecity.in/v1/countries/${countryCode}/states`, {
        headers: { 'X-CSCAPI-KEY': apiKey }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error(response.data?.message || "Invalid response from CountryStateCity API. Please make sure to configure a valid CSC_API_KEY in your backend .env file.");
      }

      // Map to same format expected by frontend: { error: false, data: { states: [...] } }
      const statesList = response.data.map(s => ({
        name: s.name,
        state_code: s.iso2
      }));
      
      res.json({
        error: false,
        msg: "states retrieved successfully",
        data: {
          name: country,
          states: statesList
        }
      });
    } catch (err) {
      console.error("Error proxying states from CountryStateCity API:", err.message);
      res.status(500).json({ 
        success: false, 
        message: "Error fetching states from dynamic API via proxy", 
        error: err.message,
        tip: "Ensure your backend .env file contains a valid CSC_API_KEY environment variable."
      });
    }
  },

  proxyCities: async (req, res) => {
    const { country, state } = req.body;
    try {
      const axios = require("axios");
      let apiKey = process.env.CSC_API_KEY || 'YOUR_API_KEY';
      // Strip outer double quotes if present in env configuration
      if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
        apiKey = apiKey.slice(1, -1);
      }

      if (!apiKey || apiKey === 'YOUR_API_KEY' || apiKey.includes('YOUR_')) {
        return res.status(400).json({
          success: false,
          message: "CountryStateCity API Key (CSC_API_KEY) is not configured.",
          tip: "Please sign up at https://app.countrystatecity.in/api-keys to obtain your free API key, then update the CSC_API_KEY value in your backend .env file."
        });
      }
      const countryCode = country === 'Nepal' ? 'NP' : 'IN';
      
      const stateStr = (state || '').toString().trim();
      if (!stateStr) {
        return res.json({ error: false, msg: "No state specified", data: [] });
      }

      let stateCode = stateStr;

      // If stateStr is a full name (length > 3), fetch states and match it to get the ISO2 code.
      // If it is already a short ISO code (e.g. "GJ", "KO", "NP-P3"), we skip this heavy fetch entirely!
      if (stateStr.length > 3) {
        const statesRes = await axios.get(`https://api.countrystatecity.in/v1/countries/${countryCode}/states`, {
          headers: { 'X-CSCAPI-KEY': apiKey }
        });

        if (statesRes.data && Array.isArray(statesRes.data)) {
          const stateStrClean = cleanStateName(stateStr);
          const matchedState = statesRes.data.find(s => {
            const dbNameClean = cleanStateName(s.name);
            return (
              dbNameClean === stateStrClean ||
              (s.iso2 || '').toLowerCase() === stateStr.toLowerCase() ||
              dbNameClean.includes(stateStrClean) ||
              stateStrClean.includes(dbNameClean)
            );
          });
          if (matchedState) {
            stateCode = matchedState.iso2;
          }
        }
      }

      // Safe URL encoding prevents spaces or special characters in stateCode from breaking the request
      const response = await axios.get(`https://api.countrystatecity.in/v1/countries/${countryCode}/states/${encodeURIComponent(stateCode)}/cities`, {
        headers: { 'X-CSCAPI-KEY': apiKey }
      });
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error(response.data?.message || "Invalid response from CountryStateCity API while retrieving cities.");
      }

      // Map to format expected by frontend: { error: false, data: [...] }
      const citiesList = response.data.map(c => c.name);
      
      res.json({
        error: false,
        msg: `cities in ${stateStr} retrieved successfully`,
        data: citiesList
      });
    } catch (err) {
      console.error("Error proxying cities from CountryStateCity API:", err.message);
      res.status(500).json({ 
        success: false, 
        message: "Error fetching cities from dynamic API via proxy", 
        error: err.message,
        tip: "Ensure your backend .env file contains a valid CSC_API_KEY environment variable."
      });
    }
  }
};

module.exports = locationController;
