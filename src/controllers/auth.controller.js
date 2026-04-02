const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { sendOtp, verifyOtp, isMobileVerified } = require("../services/otp.service");
const { generateToken } = require("../utils/jwt");
const { logAction } = require("../utils/audit");

const prisma = new PrismaClient();

const authController = {
  sendOtp: async (req, res) => {
    const { mobile } = req.body;

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: "invalid mobile" });
    }

    try {
      const success = await sendOtp(mobile);
      if (!success) return res.status(500).json({ success: false, message: "failed to send" });

      res.json({ success: true, message: "otp sent" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "server error" });
    }
  },

  verifyOtp: async (req, res) => {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) return res.status(400).json({ success: false, message: "missing inputs" });

    try {
      const result = await verifyOtp(mobile, otp);
      if (result.success) return res.json({ success: true, message: "verified" });

      res.status(400).json({ success: false, message: result.message });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "server error" });
    }
  },

  register: async (req, res) => {
    const { mobile, fullName, gender, dateOfBirth, password, referredBy } = req.body;
    const tenantId = req.tenant_id;

    if (!mobile || !fullName || !password) return res.status(400).json({ message: "fields missing" });

    try {
      if (!(await isMobileVerified(mobile))) {
        return res.status(403).json({ message: "verify mobile first" });
      }

      const existing = await prisma.user.findUnique({ where: { mobile } });
      if (existing) return res.status(400).json({ message: "already registered" });

      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          mobile,
          fullName,
          gender,
          dateOfBirth: new Date(dateOfBirth),
          password: hash,
          tenantId,
          identity: "USER",
          referredBy: referredBy || null
        },
        include: { roles: { include: { role: true } } }
      });

      const accessToken = generateToken(user);

      await logAction({
        userId: user.id,
        action: "USER_REGISTER",
        tenantId,
        metadata: { mobile: user.mobile }
      });

      res.status(201).json({ success: true, user: { id: user.id, identity: user.identity }, accessToken });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "error" });
    }
  },

  login: async (req, res) => {
    const { mobile, password } = req.body;
    const tenantId = req.tenant_id;

    if (!mobile || !password) return res.status(400).json({ message: "credentials required" });

    try {
      const user = await prisma.user.findFirst({
        where: { mobile, tenantId },
        include: { roles: { include: { role: true } } }
      });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "invalid mobile or pass" });
      }

      const accessToken = generateToken(user);

      await logAction({
        userId: user.id,
        action: "USER_LOGIN",
        tenantId,
        metadata: { ip: req.ip }
      });

      res.json({ success: true, accessToken });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "error" });
    }
  },

  logout: async (req, res) => {
    // handled by frontend mainly
    res.json({ success: true, message: "logged out" });
  },

  forgotPassword: async (req, res) => {
    const { mobile } = req.body;
    const tenantId = req.tenant_id;
    if (!mobile) return res.status(400).json({ message: "mobile required" });

    try {
      const user = await prisma.user.findFirst({
        where: { mobile, tenantId }
      });
      if (!user) return res.status(404).json({ message: "user not found" });

      const success = await sendOtp(mobile);
      if (!success) return res.status(500).json({ message: "failed to send otp" });

      res.json({ success: true, message: "otp sent" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "error" });
    }
  },

  resetPassword: async (req, res) => {
    const { mobile, otp, newPassword } = req.body;
    const tenantId = req.tenant_id;
    if (!mobile || !otp || !newPassword) return res.status(400).json({ message: "fields missing" });

    try {
      const result = await verifyOtp(mobile, otp);
      if (!result.success) return res.status(400).json({ message: result.message });

      const user = await prisma.user.findFirst({
        where: { mobile, tenantId }
      });
      if (!user) return res.status(404).json({ message: "user not found" });

      const hash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hash }
      });

      res.json({ success: true, message: "password updated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "error" });
    }
  }
};

module.exports = authController;
