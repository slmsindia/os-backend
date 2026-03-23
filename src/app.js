const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(morgan("dev"));
app.use(express.json());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.get("/api/ping", (req, res) => res.json({ message: "pong" }));

// 404
app.use((req, res) => res.status(404).json({ message: "not found" }));

// error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "error",
    err: process.env.NODE_ENV === "dev" ? err.message : undefined
  });
});

module.exports = app;
