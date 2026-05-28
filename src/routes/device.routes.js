const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

// In-memory list of removed devices per user for current server runtime.
const removedDeviceIdsByUser = new Map();

const getUserId = (req) => {
  return String(req.user?.user_id || req.user?.id || req.user?.sub || "anonymous");
};

const buildCurrentDevice = (req) => {
  const userAgent = String(req.headers["user-agent"] || "Unknown Device");
  const isMobile = /android|iphone|ipad|mobile/i.test(userAgent);
  const isTablet = /ipad|tablet/i.test(userAgent);

  let deviceType = "desktop";
  if (isTablet) deviceType = "tablet";
  else if (isMobile) deviceType = "mobile";

  let os = "Unknown OS";
  if (/windows/i.test(userAgent)) os = "Windows";
  else if (/mac os/i.test(userAgent)) os = "macOS";
  else if (/android/i.test(userAgent)) os = "Android";
  else if (/iphone|ios|ipad/i.test(userAgent)) os = "iOS";
  else if (/linux/i.test(userAgent)) os = "Linux";

  return {
    _id: "current",
    deviceType,
    deviceName: "Current Device",
    os,
    location: "Unknown",
    lastActive: new Date().toISOString()
  };
};

router.get("/", authMiddleware, (req, res) => {
  const userId = getUserId(req);
  const removed = removedDeviceIdsByUser.get(userId) || new Set();
  const currentDevice = buildCurrentDevice(req);

  const devices = removed.has(currentDevice._id) ? [] : [currentDevice];
  return res.json(devices);
});

router.delete("/:id", authMiddleware, (req, res) => {
  const userId = getUserId(req);
  const deviceId = String(req.params.id || "").trim();

  if (!deviceId) {
    return res.status(400).json({ success: false, message: "device id is required" });
  }

  const removed = removedDeviceIdsByUser.get(userId) || new Set();
  removed.add(deviceId);
  removedDeviceIdsByUser.set(userId, removed);

  return res.json({ success: true, message: "Device removed" });
});

module.exports = router;
