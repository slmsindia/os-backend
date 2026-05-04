const prisma = require('../lib/prisma');

/**
 * Access Control Controller
 * Handles Identity master toggles and Feature/Service restrictions
 */
const accessControlController = {
  /**
   * Get all access control settings for the tenant
   */
  getSettings: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    try {
      const [identities, restrictions] = await Promise.all([
        prisma.identityControl.findMany({ where: { tenantId } }),
        prisma.featureRestriction.findMany({ where: { tenantId } })
      ]);
      
      res.json({ success: true, data: { identities, restrictions } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Toggle Identity Activation (Master Switch)
   */
  toggleIdentity: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { identity, isActive } = req.body;

    if (!identity) return res.status(400).json({ success: false, message: "Identity is required" });

    try {
      const control = await prisma.identityControl.upsert({
        where: { tenantId_identity: { tenantId, identity } },
        update: { isActive },
        create: { tenantId, identity, isActive }
      });

      res.json({ success: true, message: `${identity} login ${isActive ? 'enabled' : 'disabled'} successfully`, data: control });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Toggle Feature/Service Restriction
   */
  toggleFeature: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { identity, serviceId, state, district, isRestricted } = req.body;

    if (!identity || !serviceId) {
      return res.status(400).json({ success: false, message: "Identity and Service ID are required" });
    }

    try {
      const restriction = await prisma.featureRestriction.upsert({
        where: { 
          tenantId_identity_serviceId_state_district: { 
            tenantId, identity, serviceId, 
            state: state || null, 
            district: district || null 
          } 
        },
        update: { isRestricted },
        create: { 
          tenantId, identity, serviceId, 
          state: state || null, 
          district: district || null, 
          isRestricted 
        }
      });

      res.json({ success: true, message: "Feature restriction updated successfully", data: restriction });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = accessControlController;
