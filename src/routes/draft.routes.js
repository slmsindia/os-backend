const express = require('express');
const router = express.Router();
const draftController = require('../controllers/draft.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/save', authMiddleware, draftController.saveDraft);
router.get('/:type/:mobile', authMiddleware, draftController.getDraft);
router.post('/clear', authMiddleware, draftController.deleteDraft);

module.exports = router;
