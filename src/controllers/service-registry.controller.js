const { PrismaClient } = require("@prisma/client");
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const prisma = new PrismaClient();

// Service types
const SERVICE_TYPES = {
  REMITTANCE: "REMITTANCE",
  SMS: "SMS",
  PAYMENT: "PAYMENT",
  KYC: "KYC",
};

// Default services configuration
const DEFAULT_SERVICES = [
  {
    serviceName: "IME",
    serviceType: "REMITTANCE",
    baseUrl: process.env.IME_BASE_URL || "",
    priority: 1,
    timeoutMs: 30000,
    retryAttempts: 3,
  },
  {
    serviceName: "PRABHU",
    serviceType: "REMITTANCE",
    baseUrl: process.env.PRABHU_BASE_URL || "",
    priority: 2,
    timeoutMs: 30000,
    retryAttempts: 3,
    fallbackService: "IME",
  },
  {
    serviceName: "SMS",
    serviceType: "SMS",
    baseUrl: process.env.SMS_API_URL || "",
    priority: 1,
    timeoutMs: 10000,
    retryAttempts: 2,
  },
  {
    serviceName: "RAZORPAY",
    serviceType: "PAYMENT",
    baseUrl: "https://api.razorpay.com/v1",
    priority: 1,
    timeoutMs: 30000,
    retryAttempts: 3,
  },
];

const serviceRegistryController = {
  // ==================== PUBLIC: Get Active Services ====================

  // Get all active services (for client apps)
  getActiveServices: async (req, res) => {
    const { tenant_id: tenantId } = req.user || {};

    try {
      const services = await prisma.serviceRegistry.findMany({
        where: {
          isActive: true,
          isHealthy: true,
          OR: [{ tenantId: null }, { tenantId }],
        },
        select: {
          serviceName: true,
          serviceType: true,
          baseUrl: true,
          priority: true,
          isHealthy: true,
        },
        orderBy: [{ serviceType: "asc" }, { priority: "asc" }],
      });

      return res.json({
        success: true,
        services,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get service by name (for internal use)
  getService: async (req, res) => {
    const { name } = req.params;
    const { tenant_id: tenantId } = req.user || {};

    try {
      const service = await prisma.serviceRegistry.findFirst({
        where: {
          serviceName: name,
          isActive: true,
          OR: [{ tenantId: null }, { tenantId }],
        },
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      return res.json({
        success: true,
        service,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ==================== ADMIN: Service Management ====================

  // Get all services
  getAllServices: async (req, res) => {
    const { tenant_id: tenantId } = req.user;
    const { type, status } = req.query;

    try {
      const where = {
        OR: [{ tenantId: null }, { tenantId }],
      };

      if (type) {
        where.serviceType = type;
      }

      if (status === "active") {
        where.isActive = true;
      } else if (status === "inactive") {
        where.isActive = false;
      }

      const services = await prisma.serviceRegistry.findMany({
        where,
        orderBy: [{ serviceType: "asc" }, { priority: "asc" }],
      });

      return res.json({
        success: true,
        count: services.length,
        services,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Create new service
  createService: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const {
      serviceName,
      serviceType,
      baseUrl,
      apiKey,
      apiSecret,
      timeoutMs,
      retryAttempts,
      fallbackService,
    } = req.body;

    if (!serviceName || !serviceType || !baseUrl) {
      return res.status(400).json({
        success: false,
        message: "Service name, type, and base URL are required",
      });
    }

    try {
      // Check if service already exists
      const existing = await prisma.serviceRegistry.findUnique({
        where: { serviceName },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Service with this name already exists",
        });
      }

      const service = await prisma.serviceRegistry.create({
        data: {
          id: generateUuid(),
          serviceName,
          serviceType,
          baseUrl,
          apiKey: apiKey || null,
          apiSecret: apiSecret || null,
          timeoutMs: timeoutMs || 30000,
          retryAttempts: retryAttempts || 3,
          fallbackService: fallbackService || null,
          tenantId,
          updatedBy: userId,
        },
      });

      await logAction({
        userId,
        action: "SERVICE_CREATED",
        tenantId,
        metadata: { serviceName, serviceType },
      });

      return res.status(201).json({
        success: true,
        message: "Service created successfully",
        service,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Update service
  updateService: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { id } = req.params;
    const updateData = req.body;

    try {
      const service = await prisma.serviceRegistry.findFirst({
        where: {
          id,
          OR: [{ tenantId: null }, { tenantId }],
        },
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      const updatedService = await prisma.serviceRegistry.update({
        where: { id },
        data: {
          ...updateData,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      });

      await logAction({
        userId,
        action: "SERVICE_UPDATED",
        tenantId,
        metadata: { serviceName: service.serviceName },
      });

      return res.json({
        success: true,
        message: "Service updated successfully",
        service: updatedService,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Toggle service active status
  toggleServiceStatus: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { id } = req.params;
    const { isActive } = req.body;

    try {
      const service = await prisma.serviceRegistry.findFirst({
        where: {
          id,
          OR: [{ tenantId: null }, { tenantId }],
        },
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      const updatedService = await prisma.serviceRegistry.update({
        where: { id },
        data: {
          isActive,
          updatedBy: userId,
          updatedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        message: `Service ${isActive ? "activated" : "deactivated"} successfully`,
        service: updatedService,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Update service health
  updateHealth: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { id } = req.params;
    const { isHealthy } = req.body;

    try {
      const service = await prisma.serviceRegistry.findFirst({
        where: {
          id,
          OR: [{ tenantId: null }, { tenantId }],
        },
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      const updatedService = await prisma.serviceRegistry.update({
        where: { id },
        data: {
          isHealthy,
          lastHealthCheck: new Date(),
          updatedBy: userId,
          updatedAt: new Date(),
        },
      });

      return res.json({
        success: true,
        message: `Service health updated to ${isHealthy ? "healthy" : "unhealthy"}`,
        service: updatedService,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Delete service
  deleteService: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { id } = req.params;

    try {
      const service = await prisma.serviceRegistry.findFirst({
        where: {
          id,
          OR: [{ tenantId: null }, { tenantId }],
        },
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      await prisma.serviceRegistry.delete({
        where: { id },
      });

      await logAction({
        userId,
        action: "SERVICE_DELETED",
        tenantId,
        metadata: { serviceName: service.serviceName },
      });

      return res.json({
        success: true,
        message: "Service deleted successfully",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Initialize default services
  initializeDefaults: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;

    try {
      const created = [];
      const skipped = [];

      for (const defaultService of DEFAULT_SERVICES) {
        const existing = await prisma.serviceRegistry.findUnique({
          where: { serviceName: defaultService.serviceName },
        });

        if (!existing) {
          const service = await prisma.serviceRegistry.create({
            data: {
              id: generateUuid(),
              ...defaultService,
              tenantId,
              updatedBy: userId,
            },
          });
          created.push(service.serviceName);
        } else {
          skipped.push(defaultService.serviceName);
        }
      }

      return res.json({
        success: true,
        message: "Default services initialized",
        created,
        skipped,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get service statistics
  getServiceStats: async (req, res) => {
    const { tenant_id: tenantId } = req.user;

    try {
      const [
        totalServices,
        activeServices,
        healthyServices,
        byType,
      ] = await Promise.all([
        prisma.serviceRegistry.count({
          where: { OR: [{ tenantId: null }, { tenantId }] },
        }),
        prisma.serviceRegistry.count({
          where: {
            OR: [{ tenantId: null }, { tenantId }],
            isActive: true,
          },
        }),
        prisma.serviceRegistry.count({
          where: {
            OR: [{ tenantId: null }, { tenantId }],
            isHealthy: true,
          },
        }),
        prisma.serviceRegistry.groupBy({
          by: ["serviceType"],
          where: { OR: [{ tenantId: null }, { tenantId }] },
          _count: { serviceType: true },
        }),
      ]);

      return res.json({
        success: true,
        stats: {
          totalServices,
          activeServices,
          inactiveServices: totalServices - activeServices,
          healthyServices,
          unhealthyServices: totalServices - healthyServices,
          byType: byType.map((t) => ({
            type: t.serviceType,
            count: t._count.serviceType,
          })),
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // ==================== FAILOVER LOGIC ====================

  // Get failover chain for a service
  getFailoverChain: async (req, res) => {
    const { name } = req.params;
    const { tenant_id: tenantId } = req.user || {};

    try {
      const chain = [];
      let currentServiceName = name;
      let depth = 0;
      const maxDepth = 5; // Prevent infinite loops

      while (currentServiceName && depth < maxDepth) {
        const service = await prisma.serviceRegistry.findFirst({
          where: {
            serviceName: currentServiceName,
            isActive: true,
            OR: [{ tenantId: null }, { tenantId }],
          },
        });

        if (!service) break;

        chain.push({
          priority: depth + 1,
          serviceName: service.serviceName,
          serviceType: service.serviceType,
          baseUrl: service.baseUrl,
          isHealthy: service.isHealthy,
          timeoutMs: service.timeoutMs,
        });

        currentServiceName = service.fallbackService;
        depth++;
      }

      return res.json({
        success: true,
        primaryService: name,
        chainLength: chain.length,
        chain,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  // Get best available service for a type (failover logic)
  getBestService: async (req, res) => {
    const { type } = req.params;
    const { tenant_id: tenantId } = req.user || {};

    try {
      const services = await prisma.serviceRegistry.findMany({
        where: {
          serviceType: type,
          isActive: true,
          OR: [{ tenantId: null }, { tenantId }],
        },
        orderBy: [{ priority: "asc" }],
      });

      // Find first healthy service
      const healthyService = services.find((s) => s.isHealthy);

      if (healthyService) {
        return res.json({
          success: true,
          service: healthyService,
          isFailover: false,
        });
      }

      // If no healthy service, return first active one (will trigger failover)
      if (services.length > 0) {
        return res.json({
          success: true,
          service: services[0],
          isFailover: true,
          warning: "Primary service unhealthy, failover will be attempted",
        });
      }

      return res.status(404).json({
        success: false,
        message: `No active services found for type: ${type}`,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
};

module.exports = serviceRegistryController;
