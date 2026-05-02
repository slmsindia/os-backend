const express = require("express");
const router = express.Router();
const supportController = require("../controllers/support.controller");
const authMiddleware = require("../middleware/auth.middleware");

// All support routes require authentication
router.use(authMiddleware);

/**
 * @route POST /api/support/tickets
 * @desc Create a new support ticket (targetType: 'PARENT' or 'ADMIN')
 */
router.post("/tickets", supportController.createTicket);

/**
 * @route GET /api/support/tickets/my-created
 * @desc Get tickets created by me
 */
router.get("/tickets/my-created", supportController.getMyCreatedTickets);

/**
 * @route GET /api/support/tickets/assigned
 * @desc Get tickets assigned to me (Parent/Admin view)
 */
router.get("/tickets/assigned", supportController.getAssignedTickets);

/**
 * @route POST /api/support/messages
 * @desc Send a message in an existing ticket
 */
router.post("/messages", supportController.sendMessage);

/**
 * @route GET /api/support/tickets/:ticketId/messages
 * @desc Get chat history for a ticket
 */
router.get("/tickets/:ticketId/messages", supportController.getTicketMessages);

/**
 * @route PATCH /api/support/tickets/:ticketId/close
 * @desc Close a ticket (Assignee only)
 */
router.patch("/tickets/:ticketId/close", supportController.closeTicket);

module.exports = router;
