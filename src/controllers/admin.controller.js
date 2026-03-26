const { logAction } = require("../utils/audit");

const adminController = {
  createIdentity: async (req, res, targetIdentity) => {
    // create state/district/agent
    const { mobile, fullName, password, gender, dateOfBirth } = req.body;
    const { user_id: myId, tenant_id: myTenantId } = req.user;

    if (!mobile || !fullName || !password) {
      return res.status(400).json({ success: false, message: "Fields missing" });
    }

    try {
      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          mobile,
          fullName,
          password: hash,
          gender,
          dateOfBirth: new Date(dateOfBirth),
          identity: targetIdentity,
          tenantId: myTenantId,
          parentId: myId,
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
