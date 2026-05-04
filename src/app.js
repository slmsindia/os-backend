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
const adminMembershipRoutes = require("./routes/admin.membership.routes");
const superAdminRoutes = require("./routes/superadmin.routes");
const prabhuRoutes = require("./modules/prabhu/prabhu.routes");
const imeRoutes = require("./modules/ime/ime.routes");
const cspRoutes = require("./modules/csp/csp.routes");
const rdRoutes = require('./routes/rd.routes');
const membershipRoutes = require("./routes/membership.routes");
const walletRoutes = require("./routes/wallet.routes");
const remittanceRoutes = require('./routes/remittance.routes');
const businessRoutes = require("./routes/business.routes");
const adminBusinessRoutes = require("./routes/admin.business.routes");
const locationRoutes = require("./routes/location.routes");
const saathiRoutes = require("./routes/saathi.routes");
const adminSaathiRoutes = require("./routes/admin.saathi.routes");
const hierarchyRoutes = require("./routes/hierarchy.routes");
const commissionRoutes = require("./routes/commission.routes");
const adminContentRoutes = require("./routes/admin.content.routes");
const reportRoutes = require("./routes/report.routes");
const supportRoutes = require("./routes/support.routes");
const marketingRoutes = require("./routes/marketing.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [
    'http://localhost:3005',
    'http://localhost:5273',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3000',
    'https://web.onlinesaathi.org',
    'https://apiv2.onlinesaathi.org',
    'https://dash.onlinesaathi.org',
    'https://apiv3.onlinesaathi.org'
  ],
  credentials: true
}));
app.use(morgan("dev"));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const buildSwaggerSpec = (req) => {
  const forwardedProto = (req.headers["x-forwarded-proto"] || "").toString().split(",")[0].trim();
  const protocol = forwardedProto || req.protocol || "http";
  const host = req.get("host");
  const requestServerUrl = `${protocol}://${host}`;

  const allServerUrls = [
    { url: requestServerUrl },
    { url: "http://localhost:3005" },
    { url: "http://localhost:5273" },
    { url: "https://web.onlinesaathi.org" },
    { url: "https://apiv2.onlinesaathi.org" },
    { url: "https://dash.onlinesaathi.org" },
    { url: "https://apiv3.onlinesaathi.org" }
  ];

  // Filter out duplicate URLs
  const uniqueServers = allServerUrls.filter((server, index, self) =>
    index === self.findIndex((s) => s.url === server.url)
  );

  return {
    ...openApiSpec,
    servers: uniqueServers,
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

app.use(tenantMiddleware);

// Health check to verify deployment
app.get("/api/health-check", (req, res) => res.json({ 
  status: "ok", 
  version: "1.0.7", 
  timestamp: new Date().toISOString() 
}));

app.use("/api/membership", membershipRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminMembershipRoutes);
app.use("/api/superadmin", superAdminRoutes);
app.use("/api/prabhu", prabhuRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/ime", imeRoutes);
app.use("/api", cspRoutes);
app.use('/api/rd', rdRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/admin/business", adminBusinessRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/saathi", saathiRoutes);
app.use("/api/admin/saathi", adminSaathiRoutes);
app.use("/api/admin/hierarchy", hierarchyRoutes);
app.use("/api/Remittance", remittanceRoutes);
app.use("/api/Commission", commissionRoutes);
app.use("/api/Admin/Content", adminContentRoutes);
app.use("/api/admin/reports", reportRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/marketing", marketingRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/api/ping", (req, res) => res.json({ message: "pong" }));

app.use((req, res) => res.status(404).json({ message: "not found" }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

module.exports = app;
