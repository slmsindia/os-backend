const prisma = require("../lib/prisma");

const draftController = {
  /**
   * Save or update a form draft
   */
  saveDraft: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { formType, targetMobile, data, step } = req.body;

    if (!formType || !targetMobile || !data) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
      const draft = await prisma.formDraft.upsert({
        where: {
          userId_formType_targetMobile_tenantId: {
            userId,
            formType,
            targetMobile,
            tenantId
          }
        },
        update: {
          data,
          step: step || 1,
          updatedAt: new Date()
        },
        create: {
          userId,
          formType,
          targetMobile,
          data,
          step: step || 1,
          tenantId
        }
      });

      res.json({ success: true, data: draft });
    } catch (err) {
      console.error("Save Draft Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Get a form draft
   */
  getDraft: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { type: formType, mobile: targetMobile } = req.params;

    if (!formType || !targetMobile) {
      return res.status(400).json({ success: false, message: "Missing type or mobile" });
    }

    try {
      const draft = await prisma.formDraft.findUnique({
        where: {
          userId_formType_targetMobile_tenantId: {
            userId,
            formType,
            targetMobile,
            tenantId
          }
        }
      });

      if (!draft) {
        return res.json({ success: true, data: null });
      }

      res.json({ success: true, data: draft });
    } catch (err) {
      console.error("Get Draft Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Delete a form draft
   */
  deleteDraft: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { formType, targetMobile } = req.body;

    try {
      await prisma.formDraft.deleteMany({
        where: {
          userId,
          formType,
          targetMobile,
          tenantId
        }
      });
      res.json({ success: true, message: "Draft cleared" });
    } catch (err) {
      console.error("Delete Draft Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = draftController;
