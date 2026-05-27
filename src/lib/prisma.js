const { PrismaClient } = require("@prisma/client");

/**
 * Single PrismaClient per Node process. Never `new PrismaClient()` elsewhere in `src/`
 * or Postgres will hit "too many clients already" (P2037).
 */
const globalForPrisma = globalThis;

const buildDatasourceUrl = () => {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  const limit = process.env.PRISMA_CONNECTION_LIMIT || "3";
  if (/connection_limit=/i.test(raw)) return raw;
  const join = raw.includes("?") ? "&" : "?";
  return `${raw}${join}connection_limit=${encodeURIComponent(limit)}`;
};

const prismaClientSingleton = () => {
  const url = buildDatasourceUrl();
  const options =
    url && url !== process.env.DATABASE_URL
      ? { datasources: { db: { url } } }
      : {};
  return new PrismaClient({
    ...options,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();
globalForPrisma.prisma = prisma;

module.exports = prisma;
