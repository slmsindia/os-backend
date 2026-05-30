const { prisma } = require("../lib/prisma");
const { generateUuid } = require("../utils/id");
const { logAction } = require("../utils/audit");

const adminContentController = {
  // ==================== POSTERS (BANNERS) =============
  addPoster: async (req, res) => {
    const { tenant_id: tenantId, user_id: adminId } = req.user;
    const { title, imageUrl, linkUrl, screen, order } = req.body;

    try {
      const poster = await prisma.poster.create({
        data: { title, imageUrl, linkUrl, screen, order, tenantId }
      });
      res.status(201).json({ success: true, data: poster });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getPosters: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    try {
      const posters = await prisma.poster.findMany({
        where: { tenantId, isActive: true },
        orderBy: { order: "asc" }
      });
      res.json({ success: true, data: posters });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ==================== ANNOUNCEMENTS (TICKER) =============
  addAnnouncement: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { text, type } = req.body;

    try {
      const announcement = await prisma.announcement.create({
        data: { text, type, tenantId }
      });
      res.status(201).json({ success: true, data: announcement });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getAnnouncements: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    try {
      const announcements = await prisma.announcement.findMany({
        where: { tenantId, isActive: true }
      });
      res.json({ success: true, data: announcements });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ==================== NOTICES (POPUPS) =============
  addNotice: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { title, message, imageUrl, isPopup } = req.body;

    try {
      const notice = await prisma.notice.create({
        data: { title, message, imageUrl, isPopup, tenantId }
      });
      res.status(201).json({ success: true, data: notice });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getNotices: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    try {
      const notices = await prisma.notice.findMany({
        where: { tenantId, isActive: true }
      });
      res.json({ success: true, data: notices });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ==================== APP SERVICES (UI) =============
  addAppSection: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { name, iconUrl, order } = req.body;

    try {
      const section = await prisma.appSection.create({
        data: { name, iconUrl, order, tenantId }
      });
      res.status(201).json({ success: true, data: section });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  addAppService: async (req, res) => {
    const { sectionId, name, iconUrl, componentName, serviceArguments, order, permissions } = req.body;

    try {
      const service = await prisma.appService.create({
        data: {
          name,
          iconUrl,
          sectionId,
          componentName,
          arguments: serviceArguments,
          order,
          permissions: {
            create: permissions.map(identity => ({ identity }))
          }
        }
      });
      res.status(201).json({ success: true, data: service });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getAppLayout: async (req, res) => {
    const { tenant_id: tenantId, identity } = req.user;

    try {
      const sections = await prisma.appSection.findMany({
        where: { tenantId, isActive: true },
        orderBy: { order: "asc" },
        include: {
          services: {
            where: {
              isActive: true,
              permissions: { some: { identity } }
            },
            orderBy: { order: "asc" }
          }
        }
      });

      // Filter out empty sections
      const layout = sections.filter(s => s.services.length > 0);

      res.json({ success: true, data: layout });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ==================== SURVEY & QUESTIONS =============
  addSurveyQuestion: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { question, type, options, order, isRequired } = req.body;

    try {
      const q = await prisma.surveyQuestion.create({
        data: { question, type, options, order, isRequired, tenantId }
      });
      res.status(201).json({ success: true, data: q });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  getSurveyQuestions: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    try {
      const qs = await prisma.surveyQuestion.findMany({
        where: { tenantId, isActive: true },
        orderBy: { order: "asc" }
      });
      res.json({ success: true, data: qs });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = adminContentController;
