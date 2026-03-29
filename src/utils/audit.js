const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const logAction = async ({ userId, action, targetId, metadata, tenantId }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        targetId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        tenantId
      }
    });
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
};

module.exports = { logAction };
