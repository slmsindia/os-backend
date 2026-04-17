const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const healthCheck = async (req, res) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      database: "connected"
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      message: "Database connection failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

module.exports = {
  healthCheck
};
