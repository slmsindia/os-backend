const prisma = require("../lib/prisma");
const { v4: generateUuid } = require("uuid");
const { logAction } = require("../utils/audit");

const commissionController = {
  /**
   * 1.1 Sabhi Schemes List Karo
   */
  getCommissionSchemes: async (req, res) => {
    const { tenant_id: tenantId } = req.user || {};
    const { isActive, userId } = req.query;

    try {
      const where = { tenantId };
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (userId) where.users = { some: { id: userId } };

      const schemes = await prisma.commissionScheme.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: schemes });
    } catch (err) {
      console.error("GET SCHEMES ERROR:", err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message || err.toString() });
    }
  },

  /**
   * 1.2 Ek Scheme Ka Detail Lo
   */
  getCommissionSchemeById: async (req, res) => {
    const { Id } = req.query;
    try {
      const scheme = await prisma.commissionScheme.findUnique({
        where: { id: Id },
        include: { shares: true }
      });
      if (!scheme) return res.status(404).json({ success: false, message: "Scheme not found" });
      res.json({ success: true, data: scheme });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 1.3 Nayi Scheme Banao
   */
  addCommissionSchemes: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId, identity } = req.user || {};
    const { id, name } = req.body || {};

    if (!name) return res.status(400).json({ success: false, message: "Scheme name is required" });

    const ELIGIBLE_ROLES = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN', 'COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'];
    if (!ELIGIBLE_ROLES.includes(identity)) {
      return res.status(403).json({ success: false, message: "Permission denied" });
    }

    try {
      const scheme = await prisma.commissionScheme.create({
        data: {
          id: id || generateUuid(),
          name,
          tenantId
        }
      });

      await logAction({
        userId: adminId,
        action: "ADD_COMMISSION_SCHEME",
        targetId: scheme.id,
        tenantId,
        metadata: { name }
      });

      res.status(201).json({ success: true, data: scheme });
    } catch (err) {
      console.error("ADD SCHEMES ERROR:", err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message || err.toString() });
    }
  },

  /**
   * 1.4 Scheme Update Karo
   */
  updateCommissionSchemes: async (req, res) => {
    const { id, name } = req.body || {};
    if (!id || !name) return res.status(400).json({ success: false, message: "ID and name are required" });
    try {
      const scheme = await prisma.commissionScheme.update({
        where: { id },
        data: { name }
      });
      res.json({ success: true, data: scheme });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 1.5 Scheme Ko Active/Inactive Karo
   */
  updateCommissionSchemeStatus: async (req, res) => {
    const { schemeId, isActive } = req.query;
    try {
      await prisma.commissionScheme.update({
        where: { id: schemeId },
        data: { isActive: isActive === 'true' }
      });
      res.json({ success: true, message: "Status updated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 1.6 Assign Scheme to User
   */
  assignSchemeToUser: async (req, res) => {
    const { schemeId, userId } = req.body || {};
    const { user_id: requestorId, identity } = req.user || {};
    
    if (!schemeId || !userId) return res.status(400).json({ success: false, message: "userId and schemeId are required" });
    
    try {
      // Basic check: is requestor allowed? (Can add hierarchy check here)
      const ELIGIBLE_ROLES = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN', 'COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'];
      if (!ELIGIBLE_ROLES.includes(identity)) {
        return res.status(403).json({ success: false, message: "Permission denied" });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { commissionSchemeId: schemeId }
      });

      res.json({ success: true, message: "Scheme assigned successfully", data: { userId, schemeId } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 2.1 Get Services
   */
  getCommissionServices: async (req, res) => {
    const { isActive } = req.query;
    try {
      const where = {};
      if (isActive !== undefined) where.isActive = isActive === 'true';
      const services = await prisma.commissionService.findMany({ where });
      res.json({ success: true, data: services });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 2.2 Service Ka Status Change Karo
   */
  updateCommissionServiceStatus: async (req, res) => {
    const { serviceId, isActive } = req.query;
    try {
      await prisma.commissionService.update({
        where: { id: serviceId },
        data: { isActive: isActive === 'true' }
      });
      res.json({ success: true, message: "Service status updated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 2.3 Add New Commission Service
   */
  addCommissionService: async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: "Service name is required" });
    try {
      const service = await prisma.commissionService.create({
        data: {
          id: generateUuid(),
          name
        }
      });
      res.status(201).json({ success: true, message: "Service added", data: service });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 3.1 Get Sub-Services
   */
  getCommissionSubServices: async (req, res) => {
    const { serviceId, isActive } = req.query;
    try {
      const where = { serviceId };
      if (isActive !== undefined) where.isActive = isActive === 'true';
      const subServices = await prisma.commissionSubService.findMany({ where });
      res.json({ success: true, data: subServices });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 3.2 Sub-Service Ka Status Change Karo
   */
  updateCommissionSubServiceStatus: async (req, res) => {
    const { subServiceId, isActive } = req.query;
    try {
      await prisma.commissionSubService.update({
        where: { id: subServiceId },
        data: { isActive: isActive === 'true' }
      });
      res.json({ success: true, message: "Sub-service status updated" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 3.2b Add New Commission Sub-Service
   */
  addCommissionSubService: async (req, res) => {
    const { name, serviceId } = req.body || {};
    if (!name || !serviceId) return res.status(400).json({ success: false, message: "Name and serviceId are required" });
    try {
      const subService = await prisma.commissionSubService.create({
        data: {
          id: generateUuid(),
          name,
          serviceId
        }
      });
      res.status(201).json({ success: true, message: "Sub-service added", data: subService });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 3.3 Get Services + SubServices
   */
  getServicesSubServices: async (req, res) => {
    const { isActive } = req.query;
    try {
      const where = {};
      if (isActive !== undefined) where.isActive = isActive === 'true';
      const data = await prisma.commissionService.findMany({
        where,
        include: { subServices: { where } }
      });
      res.json({ success: true, data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 3.4 Kisi Scheme Ki Services aur Sub-Services Lo
   */
  getServiceSubServiceBySchemeId: async (req, res) => {
    const { SchemeID } = req.query;
    try {
      const data = await prisma.commissionService.findMany({
        include: {
          subServices: {
            include: {
              shares: {
                where: { schemeId: SchemeID }
              }
            }
          }
        }
      });
      res.json({ success: true, data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message || err.toString() });
    }
  },

  /**
   * 4.1 Add Commission Share (Bulk)
   */
  addCommissionShare: async (req, res) => {
    const { schemeId, services } = req.body || {};
    const { user_id: adminId, tenant_id: tenantId, identity } = req.user || {};

    if (!schemeId || !services) return res.status(400).json({ success: false, message: "schemeId and services are required" });

    const ELIGIBLE_ROLES = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN', 'COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'];
    if (!ELIGIBLE_ROLES.includes(identity)) {
      return res.status(403).json({ success: false, message: "Permission denied" });
    }

    try {
      const shares = [];
      for (const service of services) {
        for (const sub of service.subServices) {
          shares.push({
            id: generateUuid(),
            schemeId,
            subServiceId: sub.id,
            commissionType: sub.type || 1,
            baseType: sub.baseType || 1,
            admin: Number(sub.admin) || 0,
            countryPartner: Number(sub.countryPartner) || 0,
            statePartner: Number(sub.statePartner) || 0,
            districtPartner: sub.districtPartner || 0,
            saathi: sub.saathi || 0,
            member: sub.member || 0,
            referral: sub.referral || 0,
            referralMinAmount: sub.referralMinAmount || 0
          });
        }
      }

      await prisma.$transaction(
        shares.map(share => 
          prisma.commissionShare.upsert({
            where: { schemeId_subServiceId: { schemeId: share.schemeId, subServiceId: share.subServiceId } },
            update: share,
            create: share
          })
        )
      );

      res.json({ success: true, message: "Commission shares updated successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 4.3 Update Single Commission Share
   */
  updateSingleCommissionShare: async (req, res) => {
    const { id, subServiceId, schemeId, commissionType, admin, countryPartner, statePartner, districtPartner, saathi, member } = req.body || {};
    if (!subServiceId || !schemeId) return res.status(400).json({ success: false, message: "subServiceId and schemeId are required" });
    try {
      const share = await prisma.commissionShare.upsert({
        where: { schemeId_subServiceId: { schemeId, subServiceId } },
        update: { commissionType, admin, countryPartner, statePartner, districtPartner, saathi, member },
        create: {
          id: id || generateUuid(),
          schemeId,
          subServiceId,
          commissionType,
          admin,
          countryPartner,
          statePartner,
          districtPartner,
          saathi,
          member
        }
      });
      res.json({ success: true, data: share });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 5.1 Get All Transactions
   */
  getAllTransactions: async (req, res) => {
    const { pageNumber = 1, pageSize = 10, serviceId, subServiceID, startDate, endDate, transactionDoneById, transactionDoneForId } = req.body;
    try {
      const where = {};
      if (serviceId) where.subService = { serviceId };
      if (subServiceID) where.subServiceId = subServiceID;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }
      if (transactionDoneById) where.transactionDoneById = transactionDoneById;
      if (transactionDoneForId) where.transactionDoneForId = transactionDoneForId;

      const transactions = await prisma.transactionLog.findMany({
        where,
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        include: { subService: true },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: transactions });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 6.2 Get Commission History
   */
  getCommissionHistory: async (req, res) => {
    const { pageNumber = 1, pageSize = 10, startDate, endDate, userId } = req.body;
    try {
      const where = {};
      if (userId) where.userId = userId;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const history = await prisma.commissionHistory.findMany({
        where,
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        include: { transaction: { include: { subService: true } } },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: history });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 7.1 Wallet History
   */
  getWalletHistory: async (req, res) => {
    const { userId, pageNumber = 1, pageSize = 10, accountType } = req.body;
    try {
      const where = { userId };
      if (accountType) where.accountType = accountType;

      const history = await prisma.commissionHistory.findMany({
        where,
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: history });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 8.1 Super Admin Income
   */
  getSuperAdminIncome: async (req, res) => {
    const { pageNumber = 1, pageSize = 10, type } = req.body;
    try {
      const where = {};
      if (type) where.type = type;

      const income = await prisma.adminIncome.findMany({
        where,
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
        include: { transaction: true },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: income });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  },

  /**
   * 6.1 Commission History Add Karo (Manual)
   */
  addCommissionHistoryManual: async (req, res) => {
    const { userId, serviceId, transactionId, amount } = req.query;
    try {
      const history = await prisma.commissionHistory.create({
        data: {
          id: generateUuid(),
          userId,
          transactionId,
          amount: parseFloat(amount),
          accountType: "commission"
        }
      });
      res.json({ success: true, data: history });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 9.1 Transaction "Credited By" Dropdown
   */
  transactionLogCreditedByDropdown: async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: {
          id: {
            in: await prisma.transactionLog.findMany({ select: { transactionDoneById: true } }).then(logs => logs.map(l => l.transactionDoneById))
          }
        },
        select: { id: true, fullName: true, mobile: true }
      });
      res.json({ success: true, data: users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * 9.2 Transaction "Credited For" Dropdown
   */
  transactionLogCreditedForDropdown: async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: {
          id: {
            in: await prisma.transactionLog.findMany({ 
              where: { transactionDoneForId: { not: null } },
              select: { transactionDoneForId: true } 
            }).then(logs => logs.map(l => l.transactionDoneForId))
          }
        },
        select: { id: true, fullName: true, mobile: true }
      });
      res.json({ success: true, data: users });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = commissionController;
