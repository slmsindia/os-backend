const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");

const adminConfigController = {
  /**
   * Set Service Fee Config (IME/PRABHU)
   * POST /api/admin/config/service-fees
   */
  setServiceFee: async (req, res) => {
    const { serviceType, amount, effectiveFrom } = req.body;
    const tenantId = req.user?.tenant_id || req.user?.tenantId;

    if (!serviceType || amount === undefined) {
      return res.status(400).json({ success: false, message: "serviceType and amount are required" });
    }

    if (!['IME', 'PRABHU'].includes(serviceType.toUpperCase())) {
      return res.status(400).json({ success: false, message: "Invalid serviceType. Must be IME or PRABHU" });
    }

    try {
      const config = await prisma.serviceFeeConfig.create({
        data: {
          id: generateUuid(),
          serviceType: serviceType.toUpperCase(),
          amount: parseFloat(amount),
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
          tenantId
        }
      });

      res.json({ success: true, message: "Service fee configuration saved", data: config });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get Service Fee Configs
   * GET /api/admin/config/service-fees
   */
  getServiceFees: async (req, res) => {
    const tenantId = req.user?.tenant_id || req.user?.tenantId;
    const { serviceType } = req.query;

    try {
      const configs = await prisma.serviceFeeConfig.findMany({
        where: { 
          tenantId,
          serviceType: serviceType ? serviceType.toUpperCase() : undefined
        },
        orderBy: { effectiveFrom: 'desc' }
      });

      res.json({ success: true, data: configs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = adminConfigController;
