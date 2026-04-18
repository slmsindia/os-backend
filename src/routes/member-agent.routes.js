const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth.middleware');
const { checkRole } = require('../middleware/role.middleware');
const memberRegistrationController = require('../controllers/member-registration.controller');
const agentRegistrationController = require('../controllers/agent-registration.controller');

/**
 * Member & Agent Registration Routes
 */

// ==================== MEMBER ROUTES ====================

// User: Register as member (with payment)
router.post(
  '/members/register',
  authenticate,
  checkRole(['USER']),
  memberRegistrationController.registerAsMember
);

// Middleware to check if user is a member
const checkMember = async (req, res, next) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = req.user.user_id || req.user.id;
    
    const member = await prisma.member.findUnique({
      where: { userId: userId }
    });
    
    if (!member) {
      return res.status(403).json({ message: 'forbidden' });
    }
    
    next();
  } catch (error) {
    console.error("checkMember error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Middleware to check if user is an agent
const checkAgent = async (req, res, next) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const userId = req.user.user_id || req.user.id;
    
    const agent = await prisma.agent.findUnique({
      where: { userId: userId }
    });
    
    if (!agent) {
      return res.status(403).json({ message: 'forbidden' });
    }
    
    next();
  } catch (error) {
    console.error("checkAgent error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// User: Get my member profile
router.get(
  '/members/me',
  authenticate,
  checkMember,
  memberRegistrationController.getMyMemberProfile
);

// User: Update my member profile
router.patch(
  '/members/me',
  authenticate,
  checkMember,
  memberRegistrationController.updateMyMemberProfile
);

// ==================== AGENT ROUTES ====================

// User: Register as agent (with payment)
router.post(
  '/agents/register',
  authenticate,
  checkRole(['USER']),
  agentRegistrationController.registerAsAgent
);

// Member: Upgrade to agent (with payment)
router.post(
  '/agents/upgrade',
  authenticate,
  checkMember,
  agentRegistrationController.memberUpgradeToAgent
);

// User: Get my agent profile
router.get(
  '/agents/me',
  authenticate,
  checkAgent,
  agentRegistrationController.getMyAgentProfile
);

// User: Update my agent profile
router.patch(
  '/agents/me',
  authenticate,
  checkAgent,
  agentRegistrationController.updateMyAgentProfile
);

// ==================== ADMIN MEMBER ROUTES ====================

// Admin: Create member (without payment)
router.post(
  '/admin/members',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  memberRegistrationController.adminCreateMember
);

// Admin: Get all members
router.get(
  '/admin/members',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  memberRegistrationController.adminGetAllMembers
);

// Admin: Get member by ID
router.get(
  '/admin/members/:id',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  memberRegistrationController.adminGetMemberById
);

// Admin: Update member
router.patch(
  '/admin/members/:id',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  memberRegistrationController.adminUpdateMember
);

// Admin: Set member registration fee
router.post(
  '/admin/members/fee',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN']),
  memberRegistrationController.adminSetMemberFee
);

// Admin: Get member registration fee
router.get(
  '/admin/members/fee',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  memberRegistrationController.adminGetMemberFee
);

// ==================== ADMIN AGENT ROUTES ====================

// Admin: Create agent (without payment)
router.post(
  '/admin/agents',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  agentRegistrationController.adminCreateAgent
);

// Admin: Get all agents
router.get(
  '/admin/agents',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  agentRegistrationController.adminGetAllAgents
);

// Admin: Get agent by ID
router.get(
  '/admin/agents/:id',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  agentRegistrationController.adminGetAgentById
);

// Admin: Update agent
router.patch(
  '/admin/agents/:id',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  agentRegistrationController.adminUpdateAgent
);

// Admin: Approve/Reject agent
router.patch(
  '/admin/agents/:id/approve',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  agentRegistrationController.adminApproveAgent
);

// Admin: Set agent fees
router.post(
  '/admin/agents/fee',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN']),
  agentRegistrationController.adminSetAgentFee
);

// Admin: Get agent fees
router.get(
  '/admin/agents/fee',
  authenticate,
  checkRole(['SUPER_ADMIN', 'ADMIN', 'SUB_ADMIN']),
  agentRegistrationController.adminGetAgentFees
);

module.exports = router;
