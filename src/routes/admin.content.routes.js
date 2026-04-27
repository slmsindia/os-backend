const express = require("express");
const router = express.Router();
const adminContentController = require("../controllers/admin.content.controller");
const authenticate = require("../middleware/auth.middleware");

router.use(authenticate);

// Posters
router.post("/Posters", adminContentController.addPoster);
router.get("/Posters", adminContentController.getPosters);

// Announcements
router.post("/Announcements", adminContentController.addAnnouncement);
router.get("/Announcements", adminContentController.getAnnouncements);

// Notices
router.post("/Notices", adminContentController.addNotice);
router.get("/Notices", adminContentController.getNotices);

// App Layout (Dynamic UI)
router.post("/AppSections", adminContentController.addAppSection);
router.post("/AppServices", adminContentController.addAppService);
router.get("/AppLayout", adminContentController.getAppLayout);

// Survey & Questions
router.post("/SurveyQuestions", adminContentController.addSurveyQuestion);
router.get("/SurveyQuestions", adminContentController.getSurveyQuestions);

module.exports = router;
