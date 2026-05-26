const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const app = require("./app");
const prisma = require("./lib/prisma");

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

let keepAliveTimer = null;

server.on("listening", () => {
  // Keep the process pinned even in terminals/runners that do not keep the
  // HTTP handle referenced consistently on Windows.
  keepAliveTimer = setInterval(() => {}, 60 * 60 * 1000);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the old backend process or set another PORT.`);
  } else {
    console.error("Server listen error:", err);
  }
  process.exit(1);
});

const shutdown = async (signal) => {
  console.log(`${signal}: closing server and database connections...`);
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
  }
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch (err) {
      console.error("Prisma disconnect error:", err.message);
    }
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("beforeExit", (code) => {
  console.log(`Node event loop is empty before exit. code=${code}`);
});
