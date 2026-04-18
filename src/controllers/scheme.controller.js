const { PrismaClient } = require("@prisma/client");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const prisma = new PrismaClient();

const schemeController = {
  // ==================== PUBLIC: Browse Schemes ====================

  // List all active schemes
  listSchemes: async (req, res) => {
    const { category, city, search } = req.query;

    try {
      const where = {
        status: "ACTIVE",
        validUntil: {
          gte: new Date(),
        },
      };

      if (category) {
        where.category = category;
      }

      if (city) {
        where.business = {
          city: { contains: city, mode: "insensitive" },
        };
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      const schemes = await prisma.scheme.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              companyName: true,
              city: true,
              isVerified: true,
            },
          },
          _count: {
            select: { bookings: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        success: true,
        count: schemes.length,
        schemes: schemes.map((s) => ({
          ...s,
          totalBookings: s._count.bookings,
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get scheme details
  getSchemeDetails: async (req, res) => {
    const { id } = req.params;
    const { user_id: userId } = req.user || {};

    try {
      const scheme = await prisma.scheme.findUnique({
        where: { id },
        include: {
          business: {
            select: {
              id: true,
              companyName: true,
              city: true,
              state: true,
              isVerified: true,
            },
          },
          _count: {
            select: { bookings: true },
          },
        },
      });

      if (!scheme) {
        return res.status(404).json({
          success: false,
          message: "Scheme not found",
        });
      }

      // Check if user has an active booking
      let userBooking = null;
      if (userId) {
        userBooking = await prisma.schemeBooking.findFirst({
          where: {
            schemeId: id,
            userId,
            status: { in: ["PENDING", "CONFIRMED"] },
          },
          include: {
            saathi: {
              select: {
                fullName: true,
                mobile: true,
              },
            },
          },
        });
      }

      // Check eligibility if user is logged in
      let eligibility = null;
      if (userId) {
        eligibility = await schemeController.checkEligibilityInternal(userId, scheme);
      }

      return res.json({
        success: true,
        scheme: {
          ...scheme,
          totalBookings: scheme._count.bookings,
          userBooking,
          eligibility,
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Check eligibility (internal function)
  checkEligibilityInternal: async (userId, scheme) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
        },
      });

      if (!user || !scheme.eligibilityCriteria) {
        return { eligible: false, reason: "Unable to check eligibility" };
      }

      const criteria = scheme.eligibilityCriteria;
      const failures = [];

      // Check age
      if (criteria.minAge || criteria.maxAge) {
        const age = user.dateOfBirth
          ? Math.floor((new Date() - new Date(user.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
          : null;

        if (age !== null) {
          if (criteria.minAge && age < criteria.minAge) {
            failures.push(`Minimum age required: ${criteria.minAge} years`);
          }
          if (criteria.maxAge && age > criteria.maxAge) {
            failures.push(`Maximum age allowed: ${criteria.maxAge} years`);
          }
        }
      }

      // Check income
      if (criteria.incomeLimit && user.profile?.preferredSalary) {
        if (user.profile.preferredSalary > criteria.incomeLimit) {
          failures.push(`Income should be below ₹${criteria.incomeLimit}`);
        }
      }

      // Check location
      if (criteria.requiredStates && user.profile?.state) {
        if (!criteria.requiredStates.includes(user.profile.state)) {
          failures.push(`Only available in: ${criteria.requiredStates.join(", ")}`);
        }
      }

      return {
        eligible: failures.length === 0,
        failures: failures.length > 0 ? failures : undefined,
        criteria: criteria,
      };
    } catch (err) {
      console.error("Eligibility check error:", err);
      return { eligible: false, reason: "Error checking eligibility" };
    }
  },

  // Check eligibility endpoint
  checkEligibility: async (req, res) => {
    const { user_id: userId } = req.user;
    const { id } = req.params;

    try {
      const scheme = await prisma.scheme.findUnique({
        where: { id },
      });

      if (!scheme) {
        return res.status(404).json({
          success: false,
          message: "Scheme not found",
        });
      }

      const eligibility = await schemeController.checkEligibilityInternal(userId, scheme);

      return res.json({
        success: true,
        schemeId: id,
        schemeTitle: scheme.title,
        ...eligibility,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ==================== BUSINESS: Manage Schemes ====================

  // Create scheme
  createScheme: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const {
      title,
      description,
      category,
      eligibilityCriteria,
      benefits,
      schemeValue,
      agentFee,
      validFrom,
      validUntil,
    } = req.body;

    // Validation
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and category are required",
      });
    }

    try {
      // Check if user has a verified business
      const business = await prisma.business.findUnique({
        where: { userId },
      });

      if (!business) {
        return res.status(400).json({
          success: false,
          message: "Please create a business profile first",
        });
      }

      if (!business.isVerified) {
        return res.status(403).json({
          success: false,
          message: "Your business must be verified to upload schemes",
        });
      }

      const scheme = await prisma.scheme.create({
        data: {
          id: generateUuid(),
          businessId: business.id,
          title,
          description,
          category,
          eligibilityCriteria: eligibilityCriteria || null,
          benefits: benefits || [],
          schemeValue: schemeValue || null,
          agentFee: agentFee || 0,
          validFrom: validFrom ? new Date(validFrom) : new Date(),
          validUntil: validUntil ? new Date(validUntil) : null,
          status: "ACTIVE",
        },
      });

      await logAction({
        userId,
        action: "SCHEME_CREATED",
        targetId: scheme.id,
        tenantId,
        metadata: { title, category },
      });

      return res.status(201).json({
        success: true,
        message: "Scheme created successfully",
        scheme,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get my schemes (as business)
  getMySchemes: async (req, res) => {
    const { user_id: userId } = req.user;
    const { status } = req.query;

    try {
      const business = await prisma.business.findUnique({
        where: { userId },
      });

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Business profile not found",
        });
      }

      const schemes = await prisma.scheme.findMany({
        where: {
          businessId: business.id,
          status: status || undefined,
        },
        include: {
          _count: {
            select: {
              bookings: {
                where: { status: { in: ["PENDING", "CONFIRMED"] } },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json({
        success: true,
        count: schemes.length,
        schemes: schemes.map((s) => ({
          ...s,
          activeBookings: s._count.bookings,
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Update scheme
  updateScheme: async (req, res) => {
    const { user_id: userId } = req.user;
    const { id } = req.params;
    const updateData = req.body;

    try {
      const business = await prisma.business.findUnique({
        where: { userId },
      });

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Business profile not found",
        });
      }

      // Check scheme belongs to this business
      const scheme = await prisma.scheme.findFirst({
        where: { id, businessId: business.id },
      });

      if (!scheme) {
        return res.status(404).json({
          success: false,
          message: "Scheme not found or you don't have permission",
        });
      }

      // Convert date strings to Date objects
      if (updateData.validFrom) updateData.validFrom = new Date(updateData.validFrom);
      if (updateData.validUntil) updateData.validUntil = new Date(updateData.validUntil);

      const updatedScheme = await prisma.scheme.update({
        where: { id },
        data: updateData,
      });

      return res.json({
        success: true,
        message: "Scheme updated successfully",
        scheme: updatedScheme,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Deactivate scheme
  deactivateScheme: async (req, res) => {
    const { user_id: userId } = req.user;
    const { id } = req.params;

    try {
      const business = await prisma.business.findUnique({
        where: { userId },
      });

      if (!business) {
        return res.status(404).json({
          success: false,
          message: "Business profile not found",
        });
      }

      const scheme = await prisma.scheme.updateMany({
        where: { id, businessId: business.id },
        data: { status: "INACTIVE" },
      });

      if (scheme.count === 0) {
        return res.status(404).json({
          success: false,
          message: "Scheme not found or you don't have permission",
        });
      }

      return res.json({
        success: true,
        message: "Scheme deactivated successfully",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ==================== ADMIN: Manage All Schemes ====================

  // Get all schemes (admin)
  getAllSchemes: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { status, category, page = 1, limit = 20 } = req.query;

    try {
      const where = {
        business: { tenantId },
        status: status || undefined,
        category: category || undefined,
      };

      Object.keys(where).forEach((key) => {
        if (where[key] === undefined) delete where[key];
      });

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [schemes, total] = await Promise.all([
        prisma.scheme.findMany({
          where,
          include: {
            business: {
              select: {
                companyName: true,
                city: true,
              },
            },
            _count: {
              select: { bookings: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit),
        }),
        prisma.scheme.count({ where }),
      ]);

      return res.json({
        success: true,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        schemes,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get scheme categories
  getCategories: async (req, res) => {
    try {
      const categories = await prisma.scheme.groupBy({
        by: ["category"],
        where: {
          status: "ACTIVE",
        },
        _count: {
          category: true,
        },
      });

      return res.json({
        success: true,
        categories: categories.map((c) => ({
          name: c.category,
          count: c._count.category,
        })),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};

module.exports = schemeController;
