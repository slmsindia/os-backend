const express = require('express');
const router = express.Router();
const accessControlController = require('../controllers/admin.access.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { isWhiteLabelAdmin } = require('../middleware/identity.middleware');

/**
 * Access Control Routes (WLA Only)
 */

router.get('/', authMiddleware, isWhiteLabelAdmin, accessControlController.getSettings);
router.post('/identity-toggle', authMiddleware, isWhiteLabelAdmin, accessControlController.toggleIdentity);
router.post('/feature-toggle', authMiddleware, isWhiteLabelAdmin, accessControlController.toggleFeature);

module.exports = router;
