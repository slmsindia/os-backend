const fs = require("fs");
const path = require("path");

const allowedWithoutDatabase = new Set([
  "/api/health-check",
  "/api/ping",
  "/api-docs",
  "/api-docs.json"
]);

const isAllowedWithoutDatabase = (path) => {
  if (allowedWithoutDatabase.has(path)) return true;
  return path.startsWith("/api-docs/");
};

const getDatabaseUrlFromEnvFile = () => {
  const envPath = path.join(__dirname, "../../.env");

  try {
    const content = fs.readFileSync(envPath, "utf8");
    const line = content
      .split(/\r?\n/)
      .find((entry) => /^\s*DATABASE_URL\s*=/.test(entry));

    if (!line) return "";

    const rawValue = line.slice(line.indexOf("=") + 1).trim();
    return rawValue.replace(/^['"]|['"]$/g, "").trim();
  } catch (err) {
    return "";
  }
};

const databaseConfigMiddleware = (req, res, next) => {
  if (!req.path.startsWith("/api") || isAllowedWithoutDatabase(req.path)) {
    return next();
  }

<<<<<<< HEAD
  const databaseUrl = (process.env.DATABASE_URL || "").trim() || getDatabaseUrlFromEnvFile();

=======
  const databaseUrl = getDatabaseUrlFromEnvFile();
>>>>>>> origin/main
  if (databaseUrl) {
    process.env.DATABASE_URL = databaseUrl;
  } else {
    delete process.env.DATABASE_URL;
  }

  if (!databaseUrl) {
    return res.status(503).json({
      success: false,
<<<<<<< HEAD
      message: "server error"
=======
      message: "Database is not configured. Please set DATABASE_URL to use this service."
>>>>>>> origin/main
    });
  }

  return next();
};

module.exports = databaseConfigMiddleware;
