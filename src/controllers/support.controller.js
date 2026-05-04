const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");

const supportController = {
  /**
   * Create a new support ticket
   */
  createTicket: async (req, res) => {
    const { user_id: userId, identity: myIdentity, tenant_id: tenantId } = req.user;
    const { subject, description, priority, targetType } = req.body; // targetType: 'PARENT' or 'ADMIN'

    try {
      const me = await prisma.user.findUnique({
        where: { id: userId },
        select: { parentId: true, tenantId: true, identity: true }
      });

      let assignedToId = null;

      // RULE 1: Admin can only talk to Super Admin
      if (myIdentity === 'ADMIN' || myIdentity === 'WHITE_LABEL_ADMIN') {
        const superAdmin = await prisma.user.findFirst({
          where: { identity: 'SUPER_ADMIN' }
        });
        if (!superAdmin) return res.status(404).json({ success: false, message: "Super Admin not found" });
        assignedToId = superAdmin.id;
      } 
      // RULE 2: Others can talk to Parent or Tenant Admin
      else {
        if (targetType === 'ADMIN') {
          const tenantAdmin = await prisma.user.findFirst({
            where: { tenantId, identity: 'ADMIN' }
          });
          if (!tenantAdmin) return res.status(404).json({ success: false, message: "Tenant Admin not found" });
          assignedToId = tenantAdmin.id;
        } else {
          // Talk to Parent
          if (!me.parentId) return res.status(400).json({ success: false, message: "No parent found to contact" });
          assignedToId = me.parentId;
        }
      }

      // Generate Ticket Number (TKT + Timestamp snippet)
      const ticketNumber = `TKT-${Date.now().toString().slice(-6)}`;

      const ticket = await prisma.supportTicket.create({
        data: {
          ticketNumber,
          subject,
          description,
          priority: priority || 'MEDIUM',
          creatorId: userId,
          assignedToId,
          tenantId
        }
      });

      res.status(201).json({ success: true, message: "Ticket created successfully", data: ticket });
    } catch (err) {
      console.error("[SupportController] createTicket Error:", err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  /**
   * Send a message in a ticket
   */
  sendMessage: async (req, res) => {
    const { user_id: userId } = req.user;
    const { ticketId, message, fileUrl } = req.body;

    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });
      if (ticket.status === 'CLOSED') return res.status(400).json({ success: false, message: "Cannot message on a closed ticket" });

      // Check if user is part of this ticket (Creator or Assignee)
      if (ticket.creatorId !== userId && ticket.assignedToId !== userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      const chatMessage = await prisma.supportMessage.create({
        data: {
          ticketId,
          senderId: userId,
          message,
          fileUrl
        }
      });

      res.status(201).json({ success: true, data: chatMessage });
    } catch (err) {
      console.error("[SupportController] sendMessage Error:", err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  /**
   * Close a ticket (Only Assignee/Parent can close)
   */
  closeTicket: async (req, res) => {
    const { user_id: userId } = req.user;
    const { ticketId } = req.params;

    try {
      const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });

      if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

      // ONLY the person to whom the ticket is assigned (Parent/Admin) can close it
      if (ticket.assignedToId !== userId) {
        return res.status(403).json({ success: false, message: "Only the recipient can close the ticket" });
      }

      const updated = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'CLOSED', closedAt: new Date() }
      });

      res.json({ success: true, message: "Ticket closed successfully", data: updated });
    } catch (err) {
      console.error("[SupportController] closeTicket Error:", err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  /**
   * Get My Tickets (Tickets I created)
   */
  getMyCreatedTickets: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "User identity not found in token" });
      }

      const tickets = await prisma.supportTicket.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: 'desc' },
        include: { assignedTo: { select: { fullName: true, identity: true } } }
      });
      res.json({ success: true, data: tickets });
    } catch (err) {
      console.error("[SupportController] getMyCreatedTickets Error:", err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  /**
   * Get Assigned Tickets (Tickets sent to me)
   */
  getAssignedTickets: async (req, res) => {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "User identity not found in token" });
      }

      const tickets = await prisma.supportTicket.findMany({
        where: { assignedToId: userId },
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { fullName: true, identity: true } } }
      });
      res.json({ success: true, data: tickets });
    } catch (err) {
      console.error("[SupportController] getAssignedTickets Error:", err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  /**
   * Get Ticket Messages (Chat History)
   */
  getTicketMessages: async (req, res) => {
    try {
      const { user_id: userId, identity } = req.user;
      const { ticketId } = req.params;

      if (!ticketId || ticketId === 'undefined') {
        return res.status(400).json({ success: false, message: "Valid Ticket ID is required" });
      }

      const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });

      if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

      const isPart = ticket.creatorId === userId || ticket.assignedToId === userId;
      const isAdminBypass = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(identity);

      if (!isPart && !isAdminBypass) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      const messages = await prisma.supportMessage.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { fullName: true, identity: true } } }
      });

      res.json({ success: true, data: messages });
    } catch (err) {
      console.error("[SupportController] getTicketMessages Error:", err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  }
};

module.exports = supportController;
