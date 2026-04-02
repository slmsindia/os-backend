const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const tenantMiddleware = require("./middleware/tenant.middleware");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");
const superAdminRoutes = require("./routes/superadmin.routes");
const prabhuRoutes = require("./routes/prabhu.routes");

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
  credentials: true
}));
app.use(morgan("dev"));
app.use(express.json());


app.use(tenantMiddleware);


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/Prabhu", prabhuRoutes);
app.use("/Prabhu", prabhuRoutes);

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
