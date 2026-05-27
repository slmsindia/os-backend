const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");
const { logAction } = require("../utils/audit");

const TOP_COMMISSION_VIEW_ROLES = new Set([
  "SUPER_ADMIN",
  "WHITE_LABEL_ADMIN",
  "ADMIN",
  "SUB_ADMIN",
]);

const ROLE_VISIBLE_SHARE_KEY = {
  COUNTRY_HEAD: "statePartner",
  STATE_PARTNER: "districtPartner",
  DISTRICT_PARTNER: "saathi",
  SAATHI: "member",
};

const ALL_SHARE_KEYS = [
  "admin",
  "countryPartner",
  "statePartner",
  "districtPartner",
  "saathi",
  "member",
];

const getVisibleShareKeyForRole = (identity) => {
  const role = String(identity || "").toUpperCase();
  return ROLE_VISIBLE_SHARE_KEY[role] || null;
};

const isTopCommissionViewer = (identity) => TOP_COMMISSION_VIEW_ROLES.has(String(identity || "").toUpperCase());

const getEditableShareKeysForRole = (identity) => {
  if (isTopCommissionViewer(identity)) return ALL_SHARE_KEYS;
  const visibleKey = getVisibleShareKeyForRole(identity);
  return visibleKey ? [visibleKey] : [];
};

const sanitizeSchemeForViewer = (scheme, identity) => {
  if (!scheme || isTopCommissionViewer(identity)) return scheme;
  return {
    ...scheme,
    targetState: null,
    targetCity: null,
    targetPincode: null,
  };
};

const sanitizeShareForViewer = (share, identity) => {
  if (!share || isTopCommissionViewer(identity)) return share;

  const visibleKey = getVisibleShareKeyForRole(identity);
  const base = {
    id: share.id,
    schemeId: share.schemeId,
    subServiceId: share.subServiceId,
    commissionType: share.commissionType,
    baseType: share.baseType,
    servicePrice: share.servicePrice,
    referral: share.referral,
    referralMinAmount: share.referralMinAmount,
  };

  if (visibleKey) {
    base[visibleKey] = share[visibleKey];
  }

  return base;
};

const sanitizeServicesForViewer = (services, identity) => {
  if (!Array.isArray(services)) return services;

  const role = String(identity || "").toUpperCase();
  const serviceRankByRole = {
    COUNTRY_HEAD: 1,
    STATE_PARTNER: 2,
    DISTRICT_PARTNER: 3,
    SAATHI: 4,
  };
  const serviceRankByName = {
    COUNTRYPARTNER: 1,
    COUNTRYHEAD: 1,
    STATEPARTNER: 2,
    DISTRICTPARTNER: 3,
    SAATHI: 4,
  };
  const minVisibleRank = serviceRankByRole[role];

  const visibleServices = isTopCommissionViewer(identity) || !minVisibleRank
    ? services
    : services.filter((service) => {
        const normalizedName = String(service?.name || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const serviceRank = serviceRankByName[normalizedName];
        return !serviceRank || serviceRank >= minVisibleRank;
      });

  if (isTopCommissionViewer(identity)) return visibleServices;

  return visibleServices.map((service) => ({
    ...service,
    subServices: Array.isArray(service.subServices)
      ? service.subServices.map((subService) => ({
          ...subService,
          shares: Array.isArray(subService.shares)
            ? subService.shares.map((share) => sanitizeShareForViewer(share, identity))
            : [],
        }))
      : [],
  }));
};

const normalizeShareValue = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return Number(fallback ?? 0);
  return Number(value);
};

const buildRestrictedSharePayload = (incomingShare, existingShare, identity) => {
  const editableKeys = new Set(getEditableShareKeysForRole(identity));
  const payload = {
    commissionType: incomingShare.commissionType !== undefined || incomingShare.type !== undefined
      ? (parseInt(incomingShare.commissionType ?? incomingShare.type, 10) || 1)
      : (existingShare?.commissionType ?? 1),
    baseType: incomingShare.baseType !== undefined
      ? (parseInt(incomingShare.baseType, 10) || 1)
      : (existingShare?.baseType ?? 1),
    servicePrice: normalizeShareValue(incomingShare.servicePrice, existingShare?.servicePrice ?? 0),
    referral: normalizeShareValue(incomingShare.referral, existingShare?.referral ?? 0),
    referralMinAmount: normalizeShareValue(incomingShare.referralMinAmount, existingShare?.referralMinAmount ?? 0),
  };

  for (const key of ALL_SHARE_KEYS) {
    if (editableKeys.has(key)) {
      payload[key] = incomingShare[key] !== undefined
        ? normalizeShareValue(incomingShare[key], existingShare?.[key] ?? 0)
        : normalizeShareValue(existingShare?.[key] ?? 0);
    } else {
      payload[key] = normalizeShareValue(existingShare?.[key] ?? 0);
    }
  }

  return payload;
};

async function cloneCommissionSchemeForUser(sourceSchemeId, userId, tenantId) {
  const sourceScheme = await prisma.commissionScheme.findFirst({
    where: { id: sourceSchemeId, tenantId },
    include: {
      shares: true
    }
  });

  if (!sourceScheme) {
    throw new Error("Source commission scheme not found");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true }
  });

  const clonedScheme = await prisma.commissionScheme.create({
    data: {
      id: generateUuid(),
      name: `${sourceScheme.name} - ${targetUser?.fullName || userId}`,
      isActive: sourceScheme.isActive,
      isDefault: false,
      targetState: sourceScheme.targetState,
      targetCity: sourceScheme.targetCity,
      targetPincode: sourceScheme.targetPincode,
      tenantId
    }
  });

  if (sourceScheme.shares.length > 0) {
    await prisma.commissionShare.createMany({
      data: sourceScheme.shares.map((share) => ({
        id: generateUuid(),
        schemeId: clonedScheme.id,
        subServiceId: share.subServiceId,
        commissionType: share.commissionType,
        baseType: share.baseType,
        admin: share.admin,
        countryPartner: share.countryPartner,
        statePartner: share.statePartner,
        districtPartner: share.districtPartner,
        saathi: share.saathi,
        member: share.member,
        servicePrice: share.servicePrice,
        referral: share.referral,
        referralMinAmount: share.referralMinAmount
      }))
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { commissionSchemeId: clonedScheme.id }
  });

  return clonedScheme;
}

const commissionController = {
  /**
   * 1.1 Sabhi Schemes List Karo
   */
  getCommissionSchemes: async (req, res) => {
    const { tenant_id: tenantId } = req.user || {};
    const { identity } = req.user || {};
    const { isActive, userId } = req.query;

    try {
      const where = { tenantId };
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (userId) where.users = { some: { id: userId } };

      const schemes = await prisma.commissionScheme.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      res.json({ success: true, data: schemes.map((scheme) => sanitizeSchemeForViewer(scheme, identity)) });
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
    const { identity } = req.user || {};
    try {
      const scheme = await prisma.commissionScheme.findUnique({
        where: { id: Id },
        include: { shares: true }
      });
      if (!scheme) return res.status(404).json({ success: false, message: "Scheme not found" });
      res.json({ success: true, data: sanitizeSchemeForViewer(scheme, identity) });
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
    const { id, name, targetState, targetCity, targetPincode, isDefault } = req.body || {};

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
          targetState,
          targetCity,
          targetPincode,
          isDefault: isDefault === true || isDefault === 'true',
          isActive: false, // Always inactive on creation
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
    const { id, name, targetState, targetCity, targetPincode, isDefault, isActive } = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: "ID is required" });
    
    try {
      const activeStatus = isActive !== undefined ? (isActive === true || isActive === 'true') : undefined;

      if (activeStatus === true) {
        const existing = await prisma.commissionScheme.findUnique({ where: { id } });
        const finalIsGeneral = (targetState === undefined ? existing.targetState : targetState) === null &&
                              (targetCity === undefined ? existing.targetCity : targetCity) === null &&
                              (targetPincode === undefined ? existing.targetPincode : targetPincode) === null;

        if (finalIsGeneral) {
          const activeGeneral = await prisma.commissionScheme.findFirst({
            where: {
              tenantId: existing.tenantId,
              isActive: true,
              targetState: null,
              targetCity: null,
              targetPincode: null,
              id: { not: id }
            }
          });

          if (activeGeneral) {
            return res.status(400).json({
              success: false,
              message: "Only one General (global) scheme can be active at a time. Please deactivate '" + activeGeneral.name + "' first."
            });
          }
        }
      }

      const scheme = await prisma.commissionScheme.update({
        where: { id },
        data: { 
          name,
          targetState,
          targetCity,
          targetPincode,
          isDefault: isDefault !== undefined ? (isDefault === true || isDefault === 'true') : undefined,
          isActive: activeStatus
        }
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
    const { tenant_id: tenantId } = req.user || {};

    try {
      const activeStatus = isActive === 'true';

      if (activeStatus) {
        // Find the scheme we are trying to activate
        const schemeToActivate = await prisma.commissionScheme.findUnique({ where: { id: schemeId } });
        if (!schemeToActivate) return res.status(404).json({ success: false, message: "Scheme not found" });

        const isGeneral = !schemeToActivate.targetState && !schemeToActivate.targetCity && !schemeToActivate.targetPincode;

        if (isGeneral) {
          // Check if another General scheme is already active in this tenant
          const activeGeneral = await prisma.commissionScheme.findFirst({
            where: {
              tenantId: schemeToActivate.tenantId,
              isActive: true,
              targetState: null,
              targetCity: null,
              targetPincode: null,
              id: { not: schemeId }
            }
          });

          if (activeGeneral) {
            return res.status(400).json({
              success: false,
              message: "Only one General (global) scheme can be active at a time. Please deactivate '" + activeGeneral.name + "' first."
            });
          }
        }
      }

      await prisma.commissionScheme.update({
        where: { id: schemeId },
        data: { isActive: activeStatus }
      });

      res.json({ success: true, message: "Status updated successfully" });
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
      const ELIGIBLE_ROLES = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN', 'COUNTRY_HEAD', 'STATE_PARTNER', 'DISTRICT_PARTNER'];
      if (!ELIGIBLE_ROLES.includes(identity)) {
        return res.status(403).json({ success: false, message: "Permission denied" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, tenantId: true, commissionSchemeId: true }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const clonedScheme = await cloneCommissionSchemeForUser(schemeId, userId, user.tenantId);

      res.json({
        success: true,
        message: "Scheme assigned successfully",
        data: {
          userId,
          schemeId: clonedScheme.id,
          sourceSchemeId: schemeId
        }
      });
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
    const { name, schemeId } = req.body || {};
    const { tenant_id: tenantId } = req.user || {};

    if (!name) return res.status(400).json({ success: false, message: "Service name is required" });
    try {
      const service = await prisma.commissionService.create({
        data: {
          id: generateUuid(),
          name,
          schemeId,
          tenantId
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
    const { name, serviceId, schemeId, slug } = req.body || {};
    const { tenant_id: tenantId } = req.user || {};
    const normalizedSlug = String(slug || "").trim() || null;

    if (!name || !serviceId) return res.status(400).json({ success: false, message: "Name and serviceId are required" });
    try {
      if (schemeId && normalizedSlug) {
        const existingSubService = await prisma.commissionSubService.findFirst({
          where: {
            serviceId,
            schemeId,
            slug: normalizedSlug,
          },
          select: { id: true },
        });

        if (existingSubService) {
          await prisma.commissionShare.upsert({
            where: {
              schemeId_subServiceId: {
                schemeId,
                subServiceId: existingSubService.id,
              },
            },
            update: {},
            create: {
              id: generateUuid(),
              schemeId,
              subServiceId: existingSubService.id,
              commissionType: 2,
              admin: 0,
              countryPartner: 0,
              statePartner: 0,
              districtPartner: 0,
              saathi: 0,
              member: 0,
            },
          });

          return res.status(200).json({
            success: true,
            message: "Sub-service already existed, commission share linked",
            data: existingSubService,
          });
        }
      }

      const subService = await prisma.commissionSubService.create({
        data: {
          id: generateUuid(),
          name,
          serviceId,
          slug: normalizedSlug || undefined,
          schemeId,
          tenantId
        }
      });

      // If schemeId is provided, create an initial share for this sub-service in this scheme
      if (schemeId) {
        await prisma.commissionShare.create({
          data: {
            id: generateUuid(),
            schemeId,
            subServiceId: subService.id,
            commissionType: 2, // Default to Flat
            admin: 0,
            countryPartner: 0,
            statePartner: 0,
            districtPartner: 0,
            saathi: 0,
            member: 0
          }
        });
      }

      res.status(201).json({ success: true, message: "Sub-service added", data: subService });
    } catch (err) {
      console.error(err);
      if (err?.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "This sub-service already exists for the selected service and scheme.",
        });
      }
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
    const { identity } = req.user || {};
    if (!SchemeID) return res.status(400).json({ success: false, message: "SchemeID is required" });

    try {
      // Return services that belong to this scheme OR have shares in this scheme (for migration)
      const data = await prisma.commissionService.findMany({
        where: {
          OR: [
            { schemeId: SchemeID },
            {
              subServices: {
                some: {
                  shares: {
                    some: { schemeId: SchemeID }
                  }
                }
              }
            }
          ]
        },
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

      res.json({ success: true, data: sanitizeServicesForViewer(data, identity) });
    } catch (err) {
      console.error("GET SERVICE BY SCHEME ERROR:", err);
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
          const existing = await prisma.commissionShare.findUnique({
            where: { schemeId_subServiceId: { schemeId, subServiceId: sub.id } }
          });

          shares.push({
            id: generateUuid(),
            schemeId,
            subServiceId: sub.id,
            ...buildRestrictedSharePayload(sub, existing, identity),
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
    const { id, subServiceId, schemeId, commissionType, admin, countryPartner, statePartner, districtPartner, saathi, member, servicePrice } = req.body || {};
    if (!subServiceId || !schemeId) return res.status(400).json({ success: false, message: "subServiceId and schemeId are required" });
    try {
      const existing = await prisma.commissionShare.findUnique({
        where: { schemeId_subServiceId: { schemeId, subServiceId } }
      });
      const share = await prisma.commissionShare.upsert({
        where: { schemeId_subServiceId: { schemeId, subServiceId } },
        update: buildRestrictedSharePayload({
          commissionType,
          admin,
          countryPartner,
          statePartner,
          districtPartner,
          saathi,
          member,
          servicePrice
        }, existing, req.user?.identity),
        create: {
          id: id || generateUuid(),
          schemeId,
          subServiceId,
          ...buildRestrictedSharePayload({
            commissionType,
            admin,
            countryPartner,
            statePartner,
            districtPartner,
            saathi,
            member,
            servicePrice
          }, existing, req.user?.identity)
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
  },

  /**
   * 10. Debug Commission — Call with ?userId=MEMBER_USER_ID
   * Returns full diagnosis of why commission may not be working
   */
  debugCommission: async (req, res) => {
    const { userId } = req.query;
    const { tenant_id: tenantId } = req.user;

    if (!userId) return res.status(400).json({ success: false, message: "userId query param required" });

    try {
      const report = {};

      // 1. Check user and path
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, identity: true, path: true, tenantId: true, commissionSchemeId: true }
      });
      report.user = user || "NOT FOUND";
      if (!user) return res.json({ success: false, report });

      // 2. Build path
      const pathIds = user.path ? user.path.split('/').filter(id => id.length > 0) : [];
      report.pathFromDB = pathIds;

      // 3. Find root admin user (corporate wallet has userId=null, so find admin by identity)
      const adminUser = await prisma.user.findFirst({
        where: {
          tenantId: user.tenantId,
          identity: { in: ["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"] }
        },
        select: { id: true, fullName: true, identity: true, commissionSchemeId: true },
        orderBy: { createdAt: 'asc' }
      });
      report.rootAdmin = adminUser || "NOT FOUND — No ADMIN/SUPER_ADMIN in this tenant!";

      const adminWallet = await prisma.wallet.findFirst({
        where: { tenantId: user.tenantId, isCorporate: true }
      });
      report.adminCorporateWallet = adminWallet
        ? { id: adminWallet.id, balance: adminWallet.balance, note: "userId is null — that's normal for corporate wallets" }
        : "NOT FOUND — Commission cannot deduct without corporate wallet!";

      if (adminUser && !pathIds.includes(adminUser.id)) {
        pathIds.unshift(adminUser.id);
      }
      report.fullPathWithAdmin = pathIds;

      console.log("[DebugCommission] Final pathIds before query:", pathIds);

      // 4. Fetch hierarchy users
      const pathUsers = await prisma.user.findMany({
        where: {
          id: {
            in: pathIds.filter(id => typeof id === 'string' && id.length > 5)
          }
        },
        select: { id: true, fullName: true, identity: true, commissionSchemeId: true }
      });
      const hierarchy = pathIds.map(id => pathUsers.find(u => u.id === id)).filter(Boolean);
      report.hierarchy = hierarchy;

      // 5. Check SubServices
      const subServices = await prisma.commissionSubService.findMany({
        select: { id: true, name: true, slug: true }
      });
      report.availableSubServices = subServices;

      const membershipSubService = await prisma.commissionSubService.findFirst({
        where: {
          OR: [
            { slug: "membership_fee" },
            { name: { contains: "member", mode: "insensitive" } }
          ]
        }
      });
      report.membershipSubService = membershipSubService || "NOT FOUND — Create a SubService with name containing 'member' or slug 'membership_fee'";

      // 6. Check each upline's scheme and share
      report.commissionChecks = [];
      for (let i = 0; i < hierarchy.length - 1; i++) {
        const sender = hierarchy[i];
        const receiver = hierarchy[i + 1];

        let effectiveSchemeId = null;
        let isDefault = false;

        if (receiver.commissionSchemeId) {
          const assignedScheme = await prisma.commissionScheme.findFirst({
            where: { id: receiver.commissionSchemeId, isActive: true }
          });
          if (assignedScheme) effectiveSchemeId = assignedScheme.id;
        }

        if (!effectiveSchemeId) {
          const defaultScheme = await prisma.commissionScheme.findFirst({
            where: { tenantId: user.tenantId, isActive: true },
            orderBy: { createdAt: 'desc' }
          });
          if (defaultScheme) {
            effectiveSchemeId = defaultScheme.id;
            isDefault = true;
          }
        }

        const check = {
          step: `${sender.identity} -> ${receiver.identity}`,
          receiverId: receiver.id,
          receiverName: receiver.fullName,
          schemeId: effectiveSchemeId || null,
          isDefault,
          issue: null
        };

        if (!effectiveSchemeId) {
          check.issue = `NO ACTIVE SCHEME FOUND for this tenant. Create a scheme and mark it active.`;
        } else if (membershipSubService) {
          const share = await prisma.commissionShare.findUnique({
            where: { schemeId_subServiceId: { schemeId: effectiveSchemeId, subServiceId: membershipSubService.id } }
          });
          check.shareConfig = share || null;
          if (!share) {
            check.issue = `SHARE NOT CONFIGURED for scheme ${effectiveSchemeId}. Set commission for ${receiver.identity}.`;
          } else {
            const identity = receiver.identity.toUpperCase();
            let shareKey = "";
            if (identity.includes("COUNTRY")) shareKey = "countryPartner";
            else if (identity.includes("STATE")) shareKey = "statePartner";
            else if (identity.includes("DISTRICT")) shareKey = "districtPartner";
            else if (identity.includes("SAATHI")) shareKey = "saathi";
            else if (identity.includes("MEMBER")) shareKey = "member";

            check.shareKey = shareKey;
            check.shareValue = share[shareKey] || 0;
            if (!shareKey) check.issue = `Unknown identity type: ${receiver.identity}`;
            else if (!share[shareKey]) check.issue = `Commission is 0 for ${shareKey} in this scheme.`;
          }
        }
        report.commissionChecks.push(check);
      }

      return res.json({ success: true, report });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * 1.7 Scheme Delete Karo
   */
  deleteCommissionScheme: async (req, res) => {
    const { id } = req.query; // Following the pattern of getCommissionSchemeById
    const { tenant_id: tenantId, identity, user_id: adminId } = req.user || {};

    if (!id) return res.status(400).json({ success: false, message: "Scheme ID is required" });

    try {
      // Permission check - Only Admins/Super Admins
      const ELIGIBLE_ROLES = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'];
      if (!ELIGIBLE_ROLES.includes(identity)) {
        return res.status(403).json({ success: false, message: "Permission denied" });
      }

      const scheme = await prisma.commissionScheme.findUnique({
        where: { id },
        include: { _count: { select: { users: true } } }
      });

      if (!scheme) return res.status(404).json({ success: false, message: "Scheme not found" });

      // Ensure tenant isolation
      if (identity !== 'SUPER_ADMIN' && scheme.tenantId !== tenantId) {
        return res.status(403).json({ success: false, message: "You do not have permission to delete this scheme" });
      }
      
      // Prevent deleting assigned schemes
      if (scheme._count.users > 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot delete scheme because it is assigned to ${scheme._count.users} users. Please unassign it first.` 
        });
      }

      // Delete in transaction: shares then the scheme
      await prisma.$transaction([
        prisma.commissionShare.deleteMany({ where: { schemeId: id } }),
        prisma.commissionScheme.delete({ where: { id } })
      ]);

      await logAction({
        userId: adminId,
        action: "DELETE_COMMISSION_SCHEME",
        targetId: id,
        tenantId: scheme.tenantId,
        metadata: { name: scheme.name }
      });

      res.json({ success: true, message: "Commission scheme deleted successfully" });
    } catch (err) {
      console.error("DELETE SCHEME ERROR:", err);
      res.status(500).json({ success: false, message: "Internal server error", error: err.message });
    }
  }
};

module.exports = commissionController;
