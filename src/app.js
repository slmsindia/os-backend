const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
require("dotenv").config();
const openApiSpec = require("./docs/openapi");

const tenantMiddleware = require("./middleware/tenant.middleware");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const deviceRoutes = require("./routes/device.routes");
const adminRoutes = require("./routes/admin.routes");
const superAdminRoutes = require("./routes/superadmin.routes");
const prabhuRoutes = require("./modules/prabhu/prabhu.routes");
const imeRoutes = require("./modules/ime/ime.routes");
const imeLegacyRoutes = require("./modules/ime/ime.legacy.routes");
const cspRoutes = require("./modules/csp/csp.routes");
const rdRoutes = require('./routes/rd.routes');
const healthRoutes = require("./routes/health.routes");

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
  credentials: true
}));
app.use(morgan("dev"));
app.use(express.json());

const buildSwaggerSpec = (req) => {
  const forwardedProto = (req.headers["x-forwarded-proto"] || "").toString().split(",")[0].trim();
  const protocol = forwardedProto || req.protocol || "http";
  const host = req.get("host");
  const requestServerUrl = `${protocol}://${host}`;

  return {
    ...openApiSpec,
    servers: [{ url: requestServerUrl }, ...(openApiSpec.servers || []).filter((s) => s.url !== requestServerUrl)],
  };
};

app.get("/api-docs.json", (req, res) => {
  res.json(buildSwaggerSpec(req));
});
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(null, {
    swaggerOptions: {
      url: "/api-docs.json",
    },
  })
);

// Health check endpoint (no tenant required)
app.use("/health", healthRoutes);

app.use(tenantMiddleware);


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/prabhu", prabhuRoutes);

app.use("/api/ime", imeRoutes);
app.use("/api/IME", imeLegacyRoutes);
app.use("/api", cspRoutes);
app.use('/api/rd', rdRoutes);

app.get("/api/ping", (req, res) => res.json({ message: "pong" }));


app.use((req, res) => res.status(404).json({ message: "not found" }));


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "error",
    err: process.env.NODE_ENV === "dev" ? err.message : undefined
  });
});

module.exports = app;
