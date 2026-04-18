const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { logAction } = require("../utils/audit");
const { generateUuid } = require("../utils/id");

const adminController = {
  listPricingSettings: async (req, res) => {
    const { tenant_id: myTenantId } = req.user;

    try {
      const pricingSettings = await prisma.pricingSetting.findMany({
        where: { tenantId: myTenantId },
        orderBy: { key: "asc" }
      });

      return res.json({
        success: true,
        pricingSettings
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  upsertPricingSetting: async (req, res) => {
    const { key } = req.params;
    const { amount, currency = "INR", isActive = true } = req.body;
    const { tenant_id: myTenantId, user_id: myId } = req.user;
    const normalizedKey = String(key || "").trim().toUpperCase();

    if (!normalizedKey) {
      return res.status(400).json({ success: false, message: "Pricing key is required" });
    }

    if (typeof amount !== "number" || Number.isNaN(amount) || amount < 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }

    try {
      const pricingSetting = await prisma.pricingSetting.upsert({
        where: {
          tenantId_key: {
            tenantId: myTenantId,
            key: normalizedKey
          }
        },
        update: {
          amount,
          currency,
          isActive: Boolean(isActive)
        },
        create: {
          id: generateUuid(),
          tenantId: myTenantId,
          key: normalizedKey,
          amount,
          currency,
          isActive: Boolean(isActive)
        }
      });

      await logAction({
        userId: myId,
        action: "PRICING_SETTING_UPDATED",
        tenantId: myTenantId,
        targetId: pricingSetting.id,
        metadata: {
          key: normalizedKey,
          amount,
          currency,
          isActive: Boolean(isActive)
        }
      });

      return res.json({
        success: true,
        message: "Pricing setting saved successfully",
        pricingSetting
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  createIdentity: async (req, res, targetIdentity) => {
    // create state/district/agent
    const { mobile, fullName, password, gender, dateOfBirth, parentId } = req.body;
    const { user_id: myId, tenant_id: myTenantId } = req.user;

    if (!mobile || !fullName || !password) {
      return res.status(400).json({ success: false, message: "Fields missing" });
    }

    try {
      let finalParentId = myId;

      // If explicit parentId provided, verify it belongs to same tenant
      if (parentId) {
        const parent = await prisma.user.findFirst({
          where: { id: parentId, tenantId: myTenantId }
        });
        if (!parent) {
          return res.status(400).json({ success: false, message: "Invalid parentId for this tenant" });
        }
        finalParentId = parentId;
      }

      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          id: generateUuid(),
          mobile,
          fullName,
          password: hash,
          gender,
          dateOfBirth: new Date(dateOfBirth),
          identity: targetIdentity,
          tenantId: myTenantId,
          parentId: finalParentId,
          createdBy: myId
        }
      });

      await logAction({
        userId: myId,
        action: `CREATE_${targetIdentity}`,
        targetId: user.id,
        tenantId: myTenantId,
        metadata: { mobile: user.mobile }
      });

      res.status(201).json({ success: true, user: { id: user.id, mobile: user.mobile, identity: user.identity } });
    } catch (err) {
      console.error(err);
      if (err.code === "P2002") {
        return res.status(400).json({ success: false, message: "Mobile already exists" });
      }
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  createState: (req, res) => adminController.createIdentity(req, res, "STATE_PARTNER"),
  createDistrict: (req, res) => adminController.createIdentity(req, res, "DISTRICT_PARTNER"),
  createAgent: (req, res) => adminController.createIdentity(req, res, "AGENT"),
  createUser: (req, res) => adminController.createIdentity(req, res, "USER")
};

module.exports = adminController;
