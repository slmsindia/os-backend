const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { sendOtp, verifyOtp, isMobileVerified } = require("../services/otp.service");
const { generateToken } = require("../utils/jwt");
const { logAction } = require("../utils/audit");

const prisma = new PrismaClient();

const isStrongPassword = (password) => {
  if (typeof password !== "string") return false;
  const hasLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasLength && hasUppercase && hasNumber && hasSpecial;
};

const getOrCreateRole = async (roleName) => {
  let role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    role = await prisma.role.create({ data: { name: roleName } });
  }
  return role;
};

const authController = {
  checkMobile: async (req, res) => {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ success: false, message: "Mobile required" });
    try {
      const user = await prisma.user.findUnique({ where: { mobile } });
      if (user) {
        return res.json({ success: true, exists: true });
      } else {
        return res.json({ success: true, exists: false });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
  sendOtp: async (req, res) => {
    const { mobile } = req.body;

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: "invalid mobile" });
    }

    try {
      const existing = await prisma.user.findUnique({ where: { mobile } });
      if (existing) {
        return res.status(409).json({ success: false, message: "already registered" });
      }

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

  checkMobile: async (req, res) => {
    const { mobile } = req.body;

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: "invalid mobile" });
    }

    try {
      const existing = await prisma.user.findUnique({
        where: { mobile },
        include: { roles: { include: { role: true } } }
      });

      if (!existing) {
        return res.json({ success: true, exists: false });
      }

      return res.json({
        success: true,
        exists: true,
        identity: existing.identity,
        roles: existing.roles.map((ur) => ur.role.name),
        canLogin: true
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "server error" });
    }
  },

  forgotPassword: async (req, res) => {
    const { mobile } = req.body;

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: "invalid mobile" });
    }

    try {
      const existing = await prisma.user.findUnique({ where: { mobile } });
      if (!existing) {
        return res.status(404).json({ success: false, message: "user not found" });
      }

      const success = await sendOtp(mobile);
      if (!success) return res.status(500).json({ success: false, message: "failed to send" });

      return res.json({ success: true, message: "otp sent" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "server error" });
    }
  },

  resetPassword: async (req, res) => {
    const { mobile, otp, newPassword } = req.body;

    if (!mobile || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "missing inputs" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "password must be 8+ chars with uppercase, number and special character"
      });
    }

    try {
      const existing = await prisma.user.findUnique({ where: { mobile } });
      if (!existing) {
        return res.status(404).json({ success: false, message: "user not found" });
      }

      const otpResult = await verifyOtp(mobile, otp);
      if (!otpResult.success) {
        return res.status(400).json({ success: false, message: otpResult.message || "invalid otp" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: hashedPassword }
      });

      return res.json({ success: true, message: "password reset successful" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "server error" });
    }
  },

  register: async (req, res) => {
    const { mobile, fullName, gender, dateOfBirth, password, referredBy } = req.body;
    const tenantId = req.tenant_id;

    if (!mobile || !fullName || !gender || !dateOfBirth || !password) {
      return res.status(400).json({ message: "fields missing" });
    }

    try {
      if (!(await isMobileVerified(mobile))) {
        return res.status(403).json({ message: "verify mobile first" });
      }

      const existing = await prisma.user.findUnique({ where: { mobile } });
      if (existing) return res.status(409).json({ message: "already registered" });

      const defaultRole = await getOrCreateRole("USER");
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
          referredBy: referredBy || null,
          roles: {
            create: {
              roleId: defaultRole.id
            }
          }
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

      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          identity: user.identity,
          roles: user.roles.map((ur) => ur.role.name)
        },
        accessToken
      });
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

      res.json({
        success: true,
        accessToken,
        identity: user.identity,
        roles: user.roles.map((ur) => ur.role.name)
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "error" });
    }
  },

  logout: async (req, res) => {
    res.json({ success: true, message: "logged out" });
  }
};

module.exports = authController;
