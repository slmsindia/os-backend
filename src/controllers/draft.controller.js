const prisma = require("../lib/prisma");

const draftController = {
  /**
   * Save or update a form draft
   */
  saveDraft: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    let { formType, targetMobile, data, step } = req.body;

    require('fs').appendFileSync('draft_request.log', new Date().toISOString() + ' [POST /save] Body: ' + JSON.stringify(req.body) + '\n');

    if (!formType || !targetMobile || !data) {
      require('fs').appendFileSync('draft_request.log', new Date().toISOString() + ' [POST /save] Error: Missing fields\n');
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Explicitly cast to strings to avoid any Prisma strict type errors
    // if the frontend sends a number (e.g. 9876543210).
    targetMobile = String(targetMobile);
    formType = String(formType);

    try {
      // Delete any existing drafts for this mobile and formType (even if created by an Admin)
      // This ensures we don't have duplicate drafts and prevents unique constraint errors
      await prisma.formDraft.deleteMany({
        where: {
          formType,
          targetMobile,
          tenantId
        }
      });

      // Create a fresh draft with the current user's ID
      const draft = await prisma.formDraft.create({
        data: {
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
      require('fs').appendFileSync('draft_error.log', new Date().toISOString() + ' ' + err.stack + '\n');
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
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
      const query = {
        formType,
        targetMobile,
        tenantId
      };
      
      console.log("[getDraft] Request Params:", { formType, targetMobile });
      console.log("[getDraft] Database Query:", query);

      // Using findFirst instead of findUnique to bypass potential compound index 
      // typing/caching issues with Prisma, ensuring it directly matches the fields.
      // We do NOT filter by userId so that a member can resume a draft started by an admin
      const draft = await prisma.formDraft.findFirst({
        where: query,
        orderBy: { updatedAt: 'desc' }
      });

      console.log("[getDraft] Query Result exists:", !!draft);

      if (!draft) {
        return res.json({ success: true, data: null });
      }

      res.json({ success: true, data: draft });
    } catch (err) {
      console.error("Get Draft Error:", err);
      require('fs').appendFileSync('draft_error.log', new Date().toISOString() + ' ' + err.stack + '\n');
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
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
