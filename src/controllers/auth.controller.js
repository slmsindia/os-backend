const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { sendOtp, verifyOtp, isMobileVerified } = require("../services/otp.service");
const { generateToken } = require("../utils/jwt");

const prisma = new PrismaClient();

const VALID_USER_TYPES = [
  "USER",
  "MEMBER",
  "SAATHI",
  "BUSINESS_PARTNER",
  "STATE_PARTNER",
  "DISTRICT_PARTNER",
  "COUNTRY_HEAD",
  "ADMIN"
];

const AUTO_APPROVED_USER_TYPES = ["USER"];

const USER_TYPE_TO_ROLE = {
  USER: "USER",
  MEMBER: "MEMBER",
  SAATHI: "SAATHI",
  BUSINESS_PARTNER: "BUSINESS_PARTNER",
  STATE_PARTNER: "STATE_PARTNER",
  DISTRICT_PARTNER: "DISTRICT_PARTNER",
  COUNTRY_HEAD: "COUNTRY_HEAD",
  ADMIN: "ADMIN"
};

const normalizeUserType = (value) => {
  if (!value || typeof value !== "string") return "USER";
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
};

const getDefaultTenant = async () => {
  let tenant = await prisma.tenant.findFirst({ where: { id: "default" } });
  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { id: "default", name: "Main" } });
  }
  return tenant;
};

const getOrCreateRole = async (roleName) => {
  let role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    role = await prisma.role.create({ data: { name: roleName } });
  }
  return role;
};

const isStrongPassword = (password) => {
  if (typeof password !== "string") return false;
  const hasLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasLength && hasUppercase && hasNumber && hasSpecial;
};

const authController = {
  sendOtp: async (req, res) => {
    const { mobile } = req.body;

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: "invalid mobile" });
    }

    try {
      const existing = await prisma.user.findUnique({ where: { mobile } });
      if (existing) {
        if (existing.approvalStatus === "PENDING") {
          return res.status(409).json({
            success: false,
            message: "already registered, pending admin approval"
          });
        }
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
        include: { role: true }
      });

      if (!existing) {
        return res.json({ success: true, exists: false });
      }

      return res.json({
        success: true,
        exists: true,
        approvalStatus: existing.approvalStatus,
        userType: existing.userType,
        role: existing.role?.name,
        canLogin: existing.approvalStatus === "APPROVED"
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

      if (existing.approvalStatus !== "APPROVED") {
        return res.status(403).json({ success: false, message: "account not approved yet" });
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
        where: { mobile },
        data: { password: hashedPassword }
      });

      return res.json({ success: true, message: "password reset successful" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "server error" });
    }
  },

  register: async (req, res) => {
    const { mobile, fullName, gender, dateOfBirth, password, userType } = req.body;
    if (!mobile || !fullName || !password) return res.status(400).json({ message: "fields missing" });

    try {
      const normalizedUserType = normalizeUserType(userType);
      if (!VALID_USER_TYPES.includes(normalizedUserType)) {
        return res.status(400).json({ message: "invalid userType" });
      }

      if (!(await isMobileVerified(mobile))) {
        return res.status(403).json({ message: "verify mobile first" });
      }

      const existing = await prisma.user.findUnique({ where: { mobile } });
      if (existing) {
        if (existing.approvalStatus === "PENDING") {
          return res.status(409).json({ message: "already registered, pending admin approval" });
        }
        return res.status(409).json({ message: "already registered" });
      }

      const tenant = await getDefaultTenant();
      const roleName = USER_TYPE_TO_ROLE[normalizedUserType] || "USER";
      const role = await getOrCreateRole(roleName);
      const approvalStatus = AUTO_APPROVED_USER_TYPES.includes(normalizedUserType) ? "APPROVED" : "PENDING";

      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          mobile,
          fullName,
          gender,
          dateOfBirth: new Date(dateOfBirth),
          password: hash,
          roleId: role.id,
          userType: normalizedUserType,
          approvalStatus,
          approvedAt: approvalStatus === "APPROVED" ? new Date() : null,
          tenantId: tenant.id,
          parentId: null
        },
        include: { role: true }
      });

      if (approvalStatus === "PENDING") {
        return res.status(202).json({
          success: true,
          approvalRequired: true,
          message: "registration request submitted, waiting for admin approval"
        });
      }

      const accessToken = generateToken(user);
      res.status(201).json({ success: true, user: { id: user.id, role: user.role.name, userType: user.userType }, accessToken });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "error" });
    }
  },

  login: async (req, res) => {
    const { mobile, password } = req.body;
    if (!mobile || !password) return res.status(400).json({ message: "credentials required" });

    try {
      const user = await prisma.user.findFirst({
        where: { mobile },
        include: { role: true }
      });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "invalid mobile or pass" });
      }

      if (user.approvalStatus === "PENDING") {
        return res.status(403).json({ message: "account pending admin approval" });
      }

      if (user.approvalStatus === "REJECTED") {
        return res.status(403).json({ message: "account request rejected, contact admin" });
      }

      const accessToken = generateToken(user);
      res.json({ success: true, accessToken, role: user.role?.name, userType: user.userType });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "error" });
    }
  },

  logout: async (req, res) => {
    // In JWT, logout is usually handled by the client (deleting the token).
    // This endpoint can be used to perform any server-side cleanup or logging.
    res.json({ success: true, message: "logged out" });
  },

  forgotPassword: async (req, res) => {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ message: "mobile required" });

    try {
      const user = await prisma.user.findUnique({ where: { mobile } });
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
    if (!mobile || !otp || !newPassword) return res.status(400).json({ message: "fields missing" });

    try {
      const result = await verifyOtp(mobile, otp);
      if (!result.success) return res.status(400).json({ message: result.message });

      const user = await prisma.user.findUnique({ where: { mobile } });
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
