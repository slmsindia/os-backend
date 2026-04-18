const { PrismaClient } = require("@prisma/client");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const prisma = new PrismaClient();

// Commission rates for different services
const COMMISSION_RATES = {
  SCHEME_BOOKING: 0.20, // 20% commission on scheme agent fee
  REMITTANCE_IME: 0.10, // 10% on IME transactions
  REMITTANCE_PRABHU: 0.10, // 10% on Prabhu transactions
};

const saathiController = {
  // ==================== USER: Find and Book Saathi ====================

  // Search available Saathis (agents)
  searchSaathis: async (req, res) => {
    const { city, state, service } = req.query;

    try {
      // Find users with AGENT identity who are approved
      const where = {
        identity: "AGENT",
        approvalStatus: "APPROVED",
      };

      if (city) {
        where.profile = {
          city: { contains: city, mode: "insensitive" },
        };
      }

      const saathis = await prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          mobile: true,
          profile: {
            select: {
              title: true,
              bio: true,
              city: true,
              state: true,
              experience: true,
            },
          },
          // Count completed bookings as rating indicator
          _count: {
            select: {
              saathiBookings: {
                where: { status: "COMPLETED" },
              },
            },
          },
        },
        take: 20,
      });

      return res.json({
        success: true,
        count: saathis.length,
        saathis: saathis.map((s) => ({
          ...s,
          completedBookings: s._count.saathiBookings,
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get Saathi details
  getSaathiDetails: async (req, res) => {
    const { id } = req.params;

    try {
      const saathi = await prisma.user.findFirst({
        where: {
          id,
          identity: "AGENT",
          approvalStatus: "APPROVED",
        },
        select: {
          id: true,
          fullName: true,
          profile: {
            select: {
              title: true,
              bio: true,
              city: true,
              state: true,
              experience: true,
              skills: true,
            },
          },
          _count: {
            select: {
              saathiBookings: {
                where: { status: "COMPLETED" },
              },
            },
          },
        },
      });

      if (!saathi) {
        return res.status(404).json({
          success: false,
          message: "Saathi not found",
        });
      }

      return res.json({
        success: true,
        saathi: {
          ...saathi,
          completedBookings: saathi._count.saathiBookings,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Book a Saathi for scheme assistance
  bookSaathi: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { saathiId, schemeId, notes } = req.body;

    if (!saathiId || !schemeId) {
      return res.status(400).json({
        success: false,
        message: "Saathi ID and Scheme ID are required",
      });
    }

    try {
      // Verify saathi exists and is approved
      const saathi = await prisma.user.findFirst({
        where: {
          id: saathiId,
          identity: "AGENT",
          approvalStatus: "APPROVED",
        },
      });

      if (!saathi) {
        return res.status(404).json({
          success: false,
          message: "Saathi not found or not available",
        });
      }

      // Verify scheme exists
      const scheme = await prisma.scheme.findUnique({
        where: { id: schemeId },
      });

      if (!scheme) {
        return res.status(404).json({
          success: false,
          message: "Scheme not found",
        });
      }

      // Check if user already has a pending booking for this scheme
      const existingBooking = await prisma.schemeBooking.findFirst({
        where: {
          userId,
          schemeId,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      });

      if (existingBooking) {
        return res.status(400).json({
          success: false,
          message: "You already have an active booking for this scheme",
          booking: existingBooking,
        });
      }

      // Calculate commission
      const agentFee = scheme.agentFee || 0;
      const commissionAmount = agentFee * COMMISSION_RATES.SCHEME_BOOKING;

      // Create booking
      const booking = await prisma.schemeBooking.create({
        data: {
          id: generateUuid(),
          schemeId,
          userId,
          saathiId,
          status: "PENDING",
          agentFee,
          paymentStatus: agentFee > 0 ? "PENDING" : "PAID",
          commissionAmount,
          notes: notes || null,
        },
        include: {
          scheme: {
            select: {
              title: true,
              category: true,
            },
          },
          saathi: {
            select: {
              fullName: true,
              mobile: true,
            },
          },
        },
      });

      await logAction({
        userId,
        action: "SAATHI_BOOKED",
        targetId: booking.id,
        tenantId,
        metadata: { saathiId, schemeId, agentFee },
      });

      return res.status(201).json({
        success: true,
        message: "Saathi booked successfully",
        booking,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get my bookings (as user)
  getMyBookings: async (req, res) => {
    const { user_id: userId } = req.user;
    const { status } = req.query;

    try {
      const bookings = await prisma.schemeBooking.findMany({
        where: {
          userId,
          status: status || undefined,
        },
        include: {
          scheme: {
            select: {
              title: true,
              category: true,
            },
          },
          saathi: {
            select: {
              fullName: true,
              mobile: true,
              profile: {
                select: {
                  city: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        success: true,
        count: bookings.length,
        bookings,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Cancel booking
  cancelBooking: async (req, res) => {
    const { user_id: userId } = req.user;
    const { id } = req.params;

    try {
      const booking = await prisma.schemeBooking.findFirst({
        where: { id, userId },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      if (booking.status === "COMPLETED") {
        return res.status(400).json({
          success: false,
          message: "Cannot cancel completed booking",
        });
      }

      await prisma.schemeBooking.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      return res.json({
        success: true,
        message: "Booking cancelled successfully",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ==================== SAATHI: Agent Dashboard ====================

  // Get my bookings (as saathi/agent)
  getSaathiBookings: async (req, res) => {
    const { user_id: saathiId } = req.user;
    const { status } = req.query;

    try {
      const bookings = await prisma.schemeBooking.findMany({
        where: {
          saathiId,
          status: status || undefined,
        },
        include: {
          scheme: {
            select: {
              title: true,
              category: true,
              benefits: true,
            },
          },
          user: {
            select: {
              fullName: true,
              mobile: true,
              profile: {
                select: {
                  city: true,
                  state: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        success: true,
        count: bookings.length,
        bookings,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Update booking status (confirm/complete)
  updateBookingStatus: async (req, res) => {
    const { user_id: saathiId } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["CONFIRMED", "COMPLETED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    try {
      const booking = await prisma.schemeBooking.findFirst({
        where: { id, saathiId },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      const updateData = { status };

      // If completing, credit commission to saathi's wallet
      if (status === "COMPLETED" && booking.status !== "COMPLETED") {
        updateData.paymentStatus = "PAID";

        // Credit commission to saathi's wallet
        const wallet = await prisma.wallet.upsert({
          where: { userId: saathiId },
          update: {
            balance: { increment: booking.commissionAmount },
          },
          create: {
            id: generateUuid(),
            userId: saathiId,
            balance: booking.commissionAmount,
          },
        });

        // Create wallet transaction
        await prisma.walletTransaction.create({
          data: {
            id: generateUuid(),
            userId: saathiId,
            amount: booking.commissionAmount,
            type: "CREDIT",
            meta: {
              reason: "SAATHI_COMMISSION",
              bookingId: booking.id,
              schemeId: booking.schemeId,
            },
          },
        });
      }

      const updatedBooking = await prisma.schemeBooking.update({
        where: { id },
        data: updateData,
      });

      return res.json({
        success: true,
        message: `Booking ${status.toLowerCase()} successfully`,
        booking: updatedBooking,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get saathi earnings/stats
  getSaathiStats: async (req, res) => {
    const { user_id: saathiId } = req.user;

    try {
      const [totalBookings, completedBookings, totalEarnings] = await Promise.all([
        prisma.schemeBooking.count({
          where: { saathiId },
        }),
        prisma.schemeBooking.count({
          where: { saathiId, status: "COMPLETED" },
        }),
        prisma.schemeBooking.aggregate({
          where: {
            saathiId,
            status: "COMPLETED",
          },
          _sum: {
            commissionAmount: true,
          },
        }),
      ]);

      const wallet = await prisma.wallet.findUnique({
        where: { userId: saathiId },
      });

      return res.json({
        success: true,
        stats: {
          totalBookings,
          completedBookings,
          pendingBookings: totalBookings - completedBookings,
          totalEarnings: totalEarnings._sum.commissionAmount || 0,
          currentBalance: wallet?.balance || 0,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ==================== ADMIN: Manage Saathis ====================

  // Get all saathis (admin)
  getAllSaathis: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { status, page = 1, limit = 20 } = req.query;

    try {
      const where = {
        tenantId,
        identity: "AGENT",
      };

      if (status) {
        where.approvalStatus = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [saathis, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            fullName: true,
            mobile: true,
            approvalStatus: true,
            createdAt: true,
            profile: {
              select: {
                city: true,
                state: true,
              },
            },
            _count: {
              select: {
                saathiBookings: {
                  where: { status: "COMPLETED" },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit),
        }),
        prisma.user.count({ where }),
      ]);

      return res.json({
        success: true,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        saathis: saathis.map((s) => ({
          ...s,
          completedBookings: s._count.saathiBookings,
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get all bookings (admin)
  getAllBookings: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { status, page = 1, limit = 20 } = req.query;

    try {
      const where = {
        user: { tenantId },
        status: status || undefined,
      };

      if (!status) delete where.status;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [bookings, total] = await Promise.all([
        prisma.schemeBooking.findMany({
          where,
          include: {
            scheme: {
              select: {
                title: true,
                category: true,
              },
            },
            user: {
              select: {
                fullName: true,
                mobile: true,
              },
            },
            saathi: {
              select: {
                fullName: true,
                mobile: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit),
        }),
        prisma.schemeBooking.count({ where }),
      ]);

      return res.json({
        success: true,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        bookings,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};

module.exports = saathiController;
