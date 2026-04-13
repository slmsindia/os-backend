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
const profileRoutes = require("./routes/profile.routes");
const jobProfileRoutes = require("./routes/job-profile.routes");
const businessRoutes = require("./routes/business.routes");
const jobsRoutes = require("./routes/jobs.routes");
const memberRoutes = require("./routes/member.routes");
const saathiRoutes = require("./routes/saathi.routes");
const schemeRoutes = require("./routes/scheme.routes");
const walletRoutes = require("./routes/wallet.routes");
const paymentRoutes = require("./routes/payment.routes");
const serviceRegistryRoutes = require("./routes/service-registry.routes");
const hierarchyRoutes = require("./routes/hierarchy.routes");
const roleUpgradeRoutes = require("./routes/role-upgrade.routes");
const jobPostingRoutes = require("./routes/job-posting.routes");
const memberAgentRoutes = require("./routes/member-agent.routes");
const adminRoutes = require("./routes/admin.routes");
const superAdminRoutes = require("./routes/superadmin.routes");
const prabhuRoutes = require("./modules/prabhu/prabhu.routes");
const imeRoutes = require("./modules/ime/ime.routes");
const setupRoutes = require("./routes/setup.routes");
const locationRoutes = require("./routes/location.routes");
const setupLocationRoutes = require("./routes/setup-location.routes");

const app = express();

app.get("/ping", (req, res) => {
  console.log("PING REQUEST RECEIVED");
  res.json({ message: "pong" });
});

app.use(helmet());
// CORS Configuration - Allow all origins
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
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


app.get("/api/ping", (req, res) => res.json({ message: "pong" }));

app.use(tenantMiddleware);


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/job-profile", jobProfileRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/saathi", saathiRoutes);
app.use("/api/schemes", schemeRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/services", serviceRegistryRoutes);
app.use("/api/hierarchy", hierarchyRoutes);
app.use("/api/role-upgrade", roleUpgradeRoutes);
app.use("/api/job-posting", jobPostingRoutes);
app.use("/api/member-agent", memberAgentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/prabhu", prabhuRoutes);
app.use("/api/Prabhu", prabhuRoutes);
app.use("/api/ime", imeRoutes);
app.use("/api/setup", setupRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/setup-location", setupLocationRoutes);


app.use((req, res) => res.status(404).json({ message: "not found" }));


app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR HANDLER:");
  console.error(err);
  res.status(500).json({
    message: "error",
    error: err.message,
    stack: err.stack
  });
});

module.exports = app;
