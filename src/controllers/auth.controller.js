const bcrypt = require("bcrypt");
const prisma = require("../lib/prisma");
const { sendOtp, verifyOtp, isMobileVerified } = require("../services/otp.service");
const { generateToken } = require("../utils/jwt");
const { logAction } = require("../utils/audit");
const { generateUuid, generateReferralCode } = require("../utils/id");


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
    role = await prisma.role.create({ data: { id: generateUuid(), name: roleName } });
  }
  return role;
};

const authController = {
  checkMobile: async (req, res) => {
    const { mobile } = req.body;
    const tenantId = req.tenant_id;
    if (!mobile) return res.status(400).json({ success: false, message: "Mobile required" });
    try {
      const user = await prisma.user.findFirst({ 
        where: { mobile, tenantId } 
      });
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
      const existing = await prisma.user.findFirst({ 
        where: { mobile, tenantId: req.tenant_id } 
      });
      if (existing) {
        return res.status(409).json({ success: false, message: "already registered in this white label" });
      }

      const systemDomains = ['localhost', '127.0.0.1', 'os.dpinfoserver.co.in'];
      const targetTenant = await prisma.tenant.findUnique({ where: { id: req.tenant_id } });

      if (targetTenant && systemDomains.includes(targetTenant.domain)) {
         return res.status(403).json({ 
           success: false, 
           message: "Registration is not allowed on this system domain. Please use a specific partner domain." 
         });
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
      const existing = await prisma.user.findFirst({
        where: { mobile, tenantId: req.tenant_id },
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
      const existing = await prisma.user.findFirst({ where: { mobile, tenantId: req.tenant_id } });
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
      const existing = await prisma.user.findFirst({ where: { mobile, tenantId: req.tenant_id } });
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
    const { mobile, email, fullName, profilePhoto, gender, dateOfBirth, password, referredBy, tenantId: bodyTenantId } = req.body;
    let tenantId = bodyTenantId || req.tenant_id;

    if (!mobile || !fullName || !gender || !dateOfBirth || !password) {
      return res.status(400).json({ message: "fields missing" });
    }

    // Validate email if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "invalid email format" });
    }

    try {
      // System check: Find the oldest (first) tenant in the system
      const firstTenant = await prisma.tenant.findFirst({
        orderBy: { createdAt: 'asc' }
      });

      // Condition 1: If no tenant exists in the DB at all, block registration
      if (!firstTenant) {
        return res.status(403).json({ success: false, message: "System is not configured yet. No tenant available." });
      }

      let resolvedTenantId = tenantId;
      let parentId = null;
      let path = "";

      // Condition 2.5: If referred by someone, inherit their tenant and hierarchy path!
      if (referredBy) {
        const referrer = await prisma.user.findFirst({
          where: { 
            OR: [
              { referralCode: referredBy },
              { id: referredBy }
            ]
          },
          select: { id: true, tenantId: true, path: true }
        });

        if (referrer) {
          resolvedTenantId = referrer.tenantId;
          parentId = referrer.id;
          path = referrer.path ? `${referrer.path}/${referrer.id}` : `/${referrer.id}`;
        }
      }

      // Final check: If no tenant resolved via referral OR domain middleware, OR if it's a system domain
      // We block registration to prevent users from leaking into 'localhost' or root system tenant.
      if (!resolvedTenantId) {
        return res.status(403).json({ 
          success: false, 
          message: "Unable to identify a valid tenant for registration. Please use a tenant-specific link or domain." 
        });
      }

      const targetTenant = await prisma.tenant.findUnique({
        where: { id: resolvedTenantId }
      });

      const systemDomains = ['localhost', '127.0.0.1', 'os.dpinfoserver.co.in'];
      
      // Block registration if it's a system domain AND no referral is used
      // This forces users to either use a White Label domain (abc.com) or a Referral Code.
      if (targetTenant && systemDomains.includes(targetTenant.domain) && !parentId) {
        return res.status(403).json({ 
          success: false, 
          message: "Registration is not allowed on this system domain. Please use your partner's specific domain." 
        });
      }

      if (!(await isMobileVerified(mobile))) {
        return res.status(403).json({ message: "verify mobile first" });
      }

      const existing = await prisma.user.findFirst({ 
        where: { mobile, tenantId: resolvedTenantId } 
      });
      if (existing) return res.status(409).json({ message: "already registered in this white label" });

      const defaultRole = await getOrCreateRole("USER");
      const hash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          id: generateUuid(),
          mobile,
          email: email || null,
          fullName,
          profilePhoto: profilePhoto || null,
          gender,
          dateOfBirth: new Date(dateOfBirth),
          password: hash,
          tenantId: resolvedTenantId,
          parentId: parentId,
          path: path || null,
          identity: "USER",
          referralCode: generateReferralCode(),
          referredBy: referredBy || null,
          roles: {
            create: {
              id: generateUuid(),
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
        tenantId: resolvedTenantId,
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
      // 1. Try to find user in the current tenant
      let user = await prisma.user.findFirst({
        where: { mobile, tenantId },
        include: { roles: { include: { role: true } } }
      });

      // 2. If not found, check if it's a SUPER_ADMIN (they can login from anywhere)
      if (!user) {
        user = await prisma.user.findFirst({
          where: { mobile, identity: 'SUPER_ADMIN' },
          include: { roles: { include: { role: true } } }
        });
      }

      // 3. Fallback: Search globally if not found in tenant or as Super Admin
      if (!user) {
        user = await prisma.user.findFirst({
          where: { mobile },
          include: { roles: { include: { role: true } } }
        });
        
        if (user) {
          console.log(`[Auth] Global fallback found user ${mobile} for tenant ${user.tenantId}`);
        }
      }

      if (!user) {
        console.warn(`Login failed: User with mobile ${mobile} not found globally.`);
        return res.status(401).json({ message: "invalid mobile or pass" });
      }

      if (!(await bcrypt.compare(password, user.password))) {
        console.warn(`Login failed: Password mismatch for mobile ${mobile}`);
        return res.status(401).json({ message: "invalid mobile or pass" });
      }

      // Track Login Location
      try {
        const { getLocationData } = require("../utils/location");
        const loc = getLocationData(req);
        await prisma.userLoginLog.create({
          data: {
            userId: user.id,
            ip: loc.ip,
            state: loc.state,
            city: loc.city,
            pincode: loc.pincode,
            lat: loc.lat,
            long: loc.long,
            deviceInfo: loc.deviceInfo
          }
        });
      } catch (logErr) {
        console.error("Login location tracking failed:", logErr);
      }
      if (user.approvalStatus === "DEACTIVATED") {
        return res.status(403).json({ 
          success: false, 
          message: "Your account has been deactivated by Admin. Please contact support." 
        });
      }

      // Master Identity Switch check
      const identityControl = await prisma.identityControl.findUnique({
        where: { tenantId_identity: { tenantId: user.tenantId, identity: user.identity } }
      });

      if (identityControl && !identityControl.isActive) {
        return res.status(403).json({
          success: false,
          message: `${user.identity.replace(/_/g, ' ')} login is currently disabled for this organization.`
        });
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
      console.error("Login Error:", err);
      res.status(500).json({ 
        success: false,
        message: "Internal server error during login",
        error: process.env.NODE_ENV !== 'production' ? err.message : undefined
      });
    }
  },

  logout: async (req, res) => {
    res.json({ success: true, message: "logged out" });
  }
};

module.exports = authController;
