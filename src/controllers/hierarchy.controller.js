const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");

const hierarchyController = {
  /**
   * GET /api/admin/hierarchy/children
   */
  getDirectChildren: async (req, res) => {
    const { user_id: currentUserId, tenant_id: tenantId, identity: creatorIdentity } = req.user;
    const { parentId, identity, startDate, endDate, page = 1, limit = 20 } = req.query;

    try {
      let targetParentId = parentId || currentUserId;
      const isSuperAdmin = creatorIdentity === 'SUPER_ADMIN';
      const skip = (parseInt(page) - 1) * parseInt(limit);

      if (!isSuperAdmin && targetParentId !== currentUserId) {
        const targetUser = await prisma.user.findUnique({ where: { id: targetParentId }, select: { path: true } });
        if (!targetUser || !targetUser.path || !targetUser.path.includes(currentUserId)) {
          return res.status(403).json({ success: false, message: "Permission denied." });
        }
      }

      const where = {};
      
      // If a top-level admin is checking their own root level, show both their direct children AND 'orphaned' users (no parentId)
      const isTopAdmin = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(String(creatorIdentity).toUpperCase());
      const isWhiteLabel = String(creatorIdentity).toUpperCase() === 'WHITE_LABEL_ADMIN';

      if (isTopAdmin && targetParentId === currentUserId) {
        if (isSuperAdmin && identity) {
            // Super Admin searching by identity should see global results if no parentId specified
        } else if (isWhiteLabel) {
            // White Label Admin should see everyone in their tenant by default if no parentId specified
        } else {
            where.OR = [
              { parentId: targetParentId },
              { parentId: null }
            ];
        }
      } else {
        where.parentId = targetParentId;
      }

      if (!isSuperAdmin) where.tenantId = tenantId;
      if (identity) where.identity = identity.toUpperCase();
      
      console.log('[DEBUG] Hierarchy Children Query:', {
        currentUser: currentUserId,
        creatorIdentity,
        targetParentId,
        isTopAdmin,
        whereClause: JSON.stringify(where, null, 2)
      });

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) {
           const end = new Date(endDate);
           end.setHours(23, 59, 59, 999);
           where.createdAt.lte = end;
        }
      }

      const [children, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true, mobile: true, fullName: true, email: true, gender: true,
            dateOfBirth: true, identity: true, approvalStatus: true,
            profilePhoto: true, createdAt: true,
            registrationState: true, registrationCity: true,
            registrationPincode: true, registrationLat: true,
            registrationLong: true,
            wallet: { select: { balance: true } },
            _count: { select: { children: true } }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ]);

      // Resolve Location IDs
      const stateIds = [...new Set(children.map(c => c.registrationState).filter(id => id && id.length > 5))];
      const cityIds = [...new Set(children.map(c => c.registrationCity).filter(id => id && id.length > 5))];

      const [states, cities] = await Promise.all([
        prisma.state.findMany({ where: { id: { in: stateIds } }, select: { id: true, name: true } }),
        prisma.district.findMany({ where: { id: { in: cityIds } }, select: { id: true, name: true } })
      ]);

      const stateMap = Object.fromEntries(states.map(s => [s.id, s.name]));
      const cityMap = Object.fromEntries(cities.map(c => [c.id, c.name]));

      res.json({
        success: true,
        data: children.map(c => ({
          ...c,
          hasChildren: c._count.children > 0,
          balance: c.wallet?.balance || 0,
          state: stateMap[c.registrationState] || c.registrationState || '—',
          city: cityMap[c.registrationCity] || c.registrationCity || '—'
        })),
        pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },
  /**
   * GET /api/admin/hierarchy/user-history/:targetUserId
   */
  getUserWalletHistory: async (req, res) => {
    const { user_id: currentUserId, tenant_id: tenantId, identity: creatorIdentity } = req.user;
    const { targetUserId } = req.params; // This can be ID or Mobile number
    const { page = 1, limit = 20, startDate, endDate, type, category } = req.query;

    try {
      const isSuperAdmin = creatorIdentity === 'SUPER_ADMIN';
      const identifier = targetUserId.trim();
      console.log(`[DEBUG] Searching for user: ${identifier} (Tenant: ${tenantId}, IsSuperAdmin: ${isSuperAdmin})`);
      const targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: identifier.includes('-') ? identifier : undefined }, // Likely UUID
            { mobile: identifier }
          ],
          tenantId: isSuperAdmin ? undefined : tenantId
        },
        select: { id: true, path: true, tenantId: true }
      });

      if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });

      // 2. Hierarchy Check
      if (!isSuperAdmin && targetUser.id !== currentUserId) {
        if (!targetUser.path || !targetUser.path.includes(currentUserId)) {
          return res.status(403).json({ success: false, message: "Permission denied. User not in your hierarchy." });
        }
      }

      let targetWallet = await prisma.wallet.findUnique({ where: { userId: targetUser.id } });
      if (!targetWallet) {
        targetWallet = await prisma.wallet.create({
          data: { 
            id: generateUuid(), 
            userId: targetUser.id, 
            tenantId: targetUser.tenantId || tenantId, 
            balance: 0, 
            isCorporate: false 
          }
        });
      }

      const where = { walletId: targetWallet.id };
      if (type) where.type = type;
      if (category) where.category = category;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) {
           const end = new Date(endDate);
           end.setHours(23, 59, 59, 999);
           where.createdAt.lte = end;
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [txns, total] = await Promise.all([
        prisma.walletTransaction.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.walletTransaction.count({ where })
      ]);

      res.json({
        success: true,
        data: txns,
        balance: targetWallet.balance,
        pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * GET /api/admin/hierarchy/summary
   * Returns high-level metrics for the user's hierarchy
   */
  getHierarchySummary: async (req, res) => {
    const { user_id: currentUserId, tenant_id: tenantId, identity: creatorIdentity } = req.user;

    try {
      const isSuperAdmin = creatorIdentity === 'SUPER_ADMIN';
      const isWhiteLabel = creatorIdentity === 'WHITE_LABEL_ADMIN';

      // Base filter: for partners, they only see their own path
      // for admins, they see the whole tenant
      let where = {};
      if (!isSuperAdmin) {
        where.tenantId = tenantId;
        if (!isWhiteLabel && !['ADMIN', 'SUB_ADMIN'].includes(creatorIdentity)) {
          where.OR = [
            { id: currentUserId },
            { path: { contains: currentUserId } }
          ];
        }
      }

      // Calculate Outstanding Credit (Total Negative Balance)
      const walletSummary = await prisma.wallet.aggregate({
        where: {
          ...where,
          balance: { lt: 0 }
        },
        _sum: { balance: true },
        _count: { id: true }
      });

      // Calculate User Counts by Identity
      const identityCounts = await prisma.user.groupBy({
        by: ['identity'],
        where,
        _count: { id: true }
      });

      const counts = Object.fromEntries(identityCounts.map(i => [i.identity, i._count.id]));

      res.json({
        success: true,
        data: {
          outstandingCredit: Math.abs(walletSummary._sum.balance || 0),
          negativeWalletCount: walletSummary._count.id,
          counts: {
            total: Object.values(counts).reduce((a, b) => a + b, 0),
            saathi: counts['SAATHI'] || 0,
            member: counts['MEMBER'] || 0,
            partner: (counts['STATE_PARTNER'] || 0) + (counts['DISTRICT_PARTNER'] || 0) + (counts['COUNTRY_HEAD'] || 0),
            agent: counts['AGENT'] || 0,
            user: counts['USER'] || 0
          }
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * GET /api/admin/hierarchy/user-details/:identifier
   * Search for a specific user by ID or Mobile
   */
  getUserDetails: async (req, res) => {
    const { user_id: currentUserId, tenant_id: tenantId, identity: creatorIdentity } = req.user;
    const { identifier } = req.params;

    try {
      const isSuperAdmin = creatorIdentity === 'SUPER_ADMIN';
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: identifier.includes('-') ? identifier : undefined },
            { mobile: identifier }
          ],
          tenantId: isSuperAdmin ? undefined : tenantId
        },
        select: { id: true, fullName: true, mobile: true, identity: true, path: true }
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found in this system" });
      }

      // Hierarchy Check
      if (!isSuperAdmin && user.id !== currentUserId) {
        if (!user.path || !user.path.includes(currentUserId)) {
          return res.status(403).json({ success: false, message: "User found but is outside your hierarchy" });
        }
      }

      res.json({ success: true, data: user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Search failed" });
    }
  },

  /**
   * GET /api/admin/hierarchy/all-transactions
   * Combined feed of all transactions from all users in the downline
   */
  getHierarchyTransactionFeed: async (req, res) => {
    const { user_id: currentUserId, tenant_id: tenantId, identity: creatorIdentity } = req.user;
    const { page = 1, limit = 20, startDate, endDate, type, category, search } = req.query;

    try {
      const isSuperAdmin = creatorIdentity === 'SUPER_ADMIN';
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {};
      if (!isSuperAdmin) where.tenantId = tenantId;

      // 1. Hierarchy Filter: Include current user's downline, the user themselves, and their corporate wallet
      if (!isSuperAdmin) {
        const isTopAdmin = ['WHITE_LABEL_ADMIN', 'ADMIN'].includes(creatorIdentity);
        const walletConditions = [
          {
            user: {
              OR: [
                { path: { contains: currentUserId } },
                { id: currentUserId }
              ]
            }
          }
        ];
        
        // Include corporate wallet transactions for tenant admins
        if (isTopAdmin) {
          walletConditions.push({ isCorporate: true, tenantId });
        }
        
        where.wallet = { OR: walletConditions };
      }

      // 2. Additional Filters
      if (type) where.type = type;
      if (category) where.category = category;
      
      if (search) {
        // Search in user's name or mobile within the hierarchy
        where.wallet = {
          ...where.wallet,
          user: {
            ...where.wallet?.user,
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { mobile: { contains: search } }
            ]
          }
        };
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) {
           const end = new Date(endDate);
           end.setHours(23, 59, 59, 999);
           where.createdAt.lte = end;
        }
      }

      const [txns, total] = await Promise.all([
        prisma.walletTransaction.findMany({
          where,
          include: {
            wallet: {
              include: {
                user: {
                  select: { id: true, fullName: true, mobile: true, identity: true }
                }
              }
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.walletTransaction.count({ where })
      ]);

      const mappedTxns = txns.map(t => ({
        ...t,
        transactionAmount: t.amount,
        transactionDateTime: t.createdAt,
        tnxDoneBy: t.wallet?.user?.fullName || "N/A",
        roleForDoneBy: t.wallet?.user?.identity || "N/A",
        userMobile: t.wallet?.user?.mobile || "N/A",
        serviceName: t.category === 'COMMISSION' ? 'Commission' : (t.category === 'SERVICE_CHARGE' ? 'Service Fee' : 'Wallet'),
        subServiceName: t.category,
        transactionMethod: t.type === 'CREDIT' ? 'Credit' : 'Debit',
        description: t.description || '—'
      }));

      // --- CSV Export Logic ---
      if (req.query.exportCsv === "true") {
        const headers = [
          "Timestamp", "User Name", "Mobile", "Role", "Service", "Category", 
          "Description", "Type", "Amount", "Method"
        ];
        
        let csv = headers.join(",") + "\n";
        mappedTxns.forEach(tx => {
          const row = [
            new Date(tx.transactionDateTime).toLocaleString('en-IN'),
            tx.tnxDoneBy,
            tx.userMobile,
            tx.roleForDoneBy,
            tx.serviceName,
            tx.subServiceName,
            tx.description,
            tx.type,
            tx.transactionAmount,
            tx.transactionMethod
          ];
          csv += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=user_ledger.csv');
        return res.status(200).send(csv);
      }

      res.json({
        success: true,
        data: mappedTxns,
        pagination: { 
          total, 
          page: parseInt(page), 
          totalPages: Math.ceil(total / parseInt(limit)) 
        }
      });
    } catch (err) {
      console.error("Hierarchy Transaction Feed Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * GET /api/admin/hierarchy/user-details/:targetUserId
   * Complete User Info for Hierarchy Explorer (360-degree view)
   */
  getCompleteUserInfo: async (req, res) => {
    const { user_id: currentUserId, identity: adminIdentity, tenant_id: tenantId } = req.user;
    const { targetUserId } = req.params; // This can be ID or Mobile number

    try {
      const identifier = targetUserId.trim();
      console.log(`[DEBUG] Searching for user details: ${identifier} (Tenant: ${tenantId}, Admin: ${adminIdentity})`);
      const targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: identifier.includes('-') ? identifier : undefined }, // Likely UUID
            { mobile: identifier }
          ],
          tenantId: adminIdentity === 'SUPER_ADMIN' ? undefined : tenantId
        },
        include: {
          wallet: true,
          parent: { select: { fullName: true } },
          membershipApplications: { where: { status: "APPROVED" }, take: 1 },
          saathiApplications: { where: { status: "APPROVED" }, take: 1 },
          _count: {
             select: {
               referrals: true,
               membershipApplications: true,
               saathiApplications: true,
               businessApplications: true,
               jobPosts: true
             }
          }
        }
      });

      if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });

      const isTopAdmin = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(adminIdentity);
      const isOwner = targetUser.id === currentUserId;
      const isInHierarchy = targetUser.path && targetUser.path.includes(currentUserId);
      const isSameTenant = targetUser.tenantId === tenantId;

      if (!isTopAdmin && !isOwner && !isInHierarchy) {
        return res.status(403).json({ success: false, message: "Permission denied. User not in your hierarchy." });
      }

      // Special check for White Label Admins: Must be same tenant if not SuperAdmin
      if (adminIdentity !== 'SUPER_ADMIN' && !isSameTenant) {
        return res.status(403).json({ success: false, message: "Permission denied. User belongs to another tenant." });
      }

      // 2. Fetch Aggregated Stats
      const [txnStats, commissionStats, topUpStats, docCount] = await Promise.all([
        // Transaction Stats
        prisma.walletTransaction.aggregate({
          where: { wallet: { userId: targetUser.id } },
          _count: { _all: true },
          _sum: { amount: true }
        }),
        // Commission Stats
        prisma.commissionHistory.aggregate({
          where: { userId: targetUser.id },
          _sum: { amount: true }
        }),
        // Remittance/Money Deposit Stats (via category filter)
        prisma.walletTransaction.aggregate({
          where: { 
            wallet: { userId: targetUser.id }, 
            category: { in: ['REMITTANCE', 'MONEY_TRANSFER', 'CASH_PICKUP'] } 
          },
          _count: { _all: true },
          _sum: { amount: true }
        }),
        // Document Counts (Membership docs)
        prisma.membershipDocument.count({
           where: { application: { userId: targetUser.id } }
        })
      ]);

      // 3. Format Response (Mirroring User Request Example)
      const data = {
        id: targetUser.id,
        firstName: targetUser.fullName.split(' ')[0],
        lastName: targetUser.fullName.split(' ').slice(1).join(' ') || "N/A",
        birthDate: targetUser.dateOfBirth?.toLocaleDateString() || "N/A",
        dateOfRegistration: targetUser.createdAt,
        email: targetUser.email || targetUser.membershipApplications[0]?.email || "N/A",
        role: targetUser.identity,
        phoneNo: targetUser.mobile,
        gender: targetUser.gender,
        genderName: targetUser.gender === "MALE" ? "Male" : targetUser.gender === "FEMALE" ? "Female" : "Other",
        isEmailVerified: !!(targetUser.email || targetUser.membershipApplications[0]?.email),
        isPhoneVerified: true,
        profilePhotoUrl: targetUser.profilePhoto || targetUser.membershipApplications[0]?.profilePhoto || "N/A",
        parentUserName: targetUser.parent?.fullName || "N/A",
        isActive: targetUser.approvalStatus !== "DEACTIVATED",
        walletBalance: targetUser.wallet?.balance || 0,
        isMemberApproved: targetUser.membershipApplications.length > 0,
        isSaathiApproved: targetUser.saathiApplications.length > 0,
        membershipNumber: targetUser.membershipApplications[0]?.membershipNumber || "N/A",
        referralCode: targetUser.referralCode || "N/A",
        
        // Address Info (if available from applications or registration)
        // Resolve Location IDs to names
        address: targetUser.membershipApplications[0]?.currentAddress || "N/A",
        city: (await prisma.district.findUnique({ where: { id: targetUser.registrationCity || "" }, select: { name: true } }))?.name || targetUser.registrationCity || targetUser.membershipApplications[0]?.currentAddress?.split(',').slice(-4, -3)[0]?.trim() || "N/A",
        district: targetUser.membershipApplications[0]?.currentDistrict || "N/A",
        state: (await prisma.state.findUnique({ where: { id: targetUser.registrationState || "" }, select: { name: true } }))?.name || targetUser.registrationState || targetUser.membershipApplications[0]?.currentState || "N/A",
        country: "India",
        pincode: targetUser.registrationPincode || targetUser.membershipApplications[0]?.currentPincode || "N/A",
        
        // Transaction Stats
        noOfTransactions: txnStats._count._all || 0,
        totalTransactions: txnStats._sum.amount || 0,
        noOfRemittanceTransactions: topUpStats._count._all || 0,
        totalRemittanceTransactions: topUpStats._sum.amount || 0,
        netCommission: commissionStats._sum.amount || 0,
        referralCount: targetUser._count.referrals || 0,
        noOfDocuments: docCount || 0,
        
        // Placeholder/Future features
        haveJobProfile: targetUser._count.jobPosts > 0,
        haveBusinessProfile: targetUser._count.businessApplications > 0,
        imeAgentRegistration: false,
        prabhuAgentRegistration: false,
        lastLogin: (await prisma.auditLog.findFirst({
          where: { userId: targetUser.id, action: 'USER_LOGIN' },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        }))?.createdAt || null
      };

      res.json({
        success: true,
        data,
        message: "User details found"
      });

    } catch (err) {
      console.error("Complete User Info Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * GET /api/admin/hierarchy/members
   */
  getDescendants: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId, identity: creatorIdentity } = req.user;
    const { identity, status, search, page = 1, limit = 20, startDate, endDate, parentId, exportCsv = "false" } = req.query;

    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      let baseId = parentId || userId;
      const isSuperAdmin = creatorIdentity === 'SUPER_ADMIN';
      
      const where = {};
      if (!isSuperAdmin) where.tenantId = tenantId;

      if (baseId !== userId || !['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(creatorIdentity)) {
          where.path = { contains: baseId };
          where.id = { not: baseId };
      } else {
          where.id = { not: userId };
      }

      if (identity) where.identity = identity;
      if (status) where.approvalStatus = status;
      if (search) {
        where.OR = [
          { fullName: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search } }
        ];
      }
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) {
           const end = new Date(endDate);
           end.setHours(23, 59, 59, 999);
           where.createdAt.lte = end;
        }
      }

      const [users, total, identityStats] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true, mobile: true, fullName: true, email: true, gender: true,
            dateOfBirth: true, identity: true, approvalStatus: true,
            profilePhoto: true, createdAt: true, path: true,
            referralCode: true,
            registrationState: true,
            registrationCity: true,
            registrationPincode: true,
            parentId: true,
            wallet: { select: { balance: true } }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where }),
        prisma.user.groupBy({ by: ['identity'], where, _count: { _all: true } })
      ]);

      const allPathIds = new Set();
      users.forEach(u => { if (u.path) u.path.split('/').forEach(id => { if (id && id.length > 5) allPathIds.add(id); }); });
      const pathUsers = await prisma.user.findMany({ where: { id: { in: Array.from(allPathIds) } }, select: { id: true, fullName: true, identity: true } });
      const userMap = Object.fromEntries(pathUsers.map(u => [u.id, u]));

      const enrichedUsers = users.map(u => {
        const pathArray = u.path ? u.path.split('/').filter(id => id && id.length > 5) : [];
        const partners = pathArray.map(id => userMap[id]).filter(Boolean);
        return {
          ...u,
          balance: u.wallet?.balance || 0,
          hierarchyInfo: {
            whiteLabel: partners.find(p => p.identity.includes('WHITE_LABEL')),
            countryHead: partners.find(p => p.identity.includes('COUNTRY')),
            statePartner: partners.find(p => p.identity.includes('STATE')),
            districtPartner: partners.find(p => p.identity.includes('DISTRICT'))
          }
        };
      });

      // Fetch last login for each user from AuditLog
      const auditLogins = await prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          userId: { in: users.map(u => u.id) },
          action: 'USER_LOGIN'
        },
        _max: { createdAt: true }
      });
      const loginMap = Object.fromEntries(auditLogins.map(l => [l.userId, l._max.createdAt]));

      const finalUsers = enrichedUsers.map(u => ({
        ...u,
        lastLogin: loginMap[u.id] || null
      }));

      // Resolve Location IDs to Names
      const stateIds = [...new Set(finalUsers.map(u => u.registrationState).filter(id => id && id.length > 5))];
      const cityIds = [...new Set(finalUsers.map(u => u.registrationCity).filter(id => id && id.length > 5))];

      const [states, cities] = await Promise.all([
        prisma.state.findMany({ where: { id: { in: stateIds } }, select: { id: true, name: true } }),
        prisma.district.findMany({ where: { id: { in: cityIds } }, select: { id: true, name: true } })
      ]);

      const stateMap = Object.fromEntries(states.map(s => [s.id, s.name]));
      const cityMap = Object.fromEntries(cities.map(c => [c.id, c.name]));

      const resolvedUsers = finalUsers.map(u => ({
        ...u,
        state: stateMap[u.registrationState] || u.registrationState || '—',
        city: cityMap[u.registrationCity] || u.registrationCity || '—'
      }));

      if (exportCsv === "true") {
        const headers = ["ID", "Name", "Mobile", "Email", "Role", "Status", "Balance", "White Label", "Country Head", "State Partner", "District Partner", "Last Login", "Created At"];
        let csv = headers.join(",") + "\n";
        resolvedUsers.forEach(u => {
          const values = [u.id, u.fullName, u.mobile, u.email || "N/A", u.identity, u.approvalStatus, u.balance, u.hierarchyInfo.whiteLabel?.fullName || "N/A", u.hierarchyInfo.countryHead?.fullName || "N/A", u.hierarchyInfo.statePartner?.fullName || "N/A", u.hierarchyInfo.districtPartner?.fullName || "N/A", u.lastLogin ? u.lastLogin.toISOString() : "N/A", u.createdAt.toISOString()];
          csv += values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=hierarchy.csv`);
        return res.status(200).send(csv);
      }

      const summary = {};
      identityStats.forEach(s => { summary[s.identity] = s._count._all; });

      res.json({ success: true, data: { users: resolvedUsers, summary, pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Request Hierarchy Transfer via Referral Code
   * POST /api/admin/hierarchy/request-transfer
   */
  requestTransfer: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    const { referralCode } = req.body;

    if (!referralCode) return res.status(400).json({ success: false, message: "Referral code required" });

    try {
      const [user, newParent] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.user.findUnique({ where: { referralCode } })
      ]);

      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      if (!newParent) return res.status(404).json({ success: false, message: "Invalid referral code. New parent not found." });

      if (newParent.id === userId) return res.status(400).json({ success: false, message: "You cannot transfer to yourself." });
      if (newParent.id === user.parentId) return res.status(400).json({ success: false, message: "You are already under this parent." });

      // Hierarchy Rule: New parent must be a higher level (lower rank number)
      const roleRank = {
        "SUPER_ADMIN": 0, "WHITE_LABEL_ADMIN": 1, "ADMIN": 2, "SUB_ADMIN": 3,
        "COUNTRY_HEAD": 4, "STATE_PARTNER": 5, "DISTRICT_PARTNER": 6,
        "BUSINESS_PARTNER": 7, "SAATHI": 8, "MEMBER": 9, "AGENT": 10, "USER": 11
      };

      const myRank = roleRank[user.identity] ?? 99;
      const parentRank = roleRank[newParent.identity] ?? 99;

      if (parentRank >= myRank) {
        return res.status(400).json({ 
          success: false, 
          message: `A ${user.identity} cannot move under a ${newParent.identity}. Parent must be of a higher level.` 
        });
      }

      // Check for existing pending request
      const existingRequest = await prisma.hierarchyTransferRequest.findFirst({
        where: { userId, status: "PENDING" }
      });

      if (existingRequest) {
        return res.status(400).json({ success: false, message: "You already have a pending transfer request." });
      }

      // Create Request with 24h schedule
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + 24);

      const request = await prisma.hierarchyTransferRequest.create({
        data: {
          id: generateUuid(),
          userId,
          oldParentId: user.parentId,
          newParentId: newParent.id,
          tenantId,
          scheduledAt,
          status: "PENDING"
        },
        include: { newParent: { select: { fullName: true, identity: true } } }
      });

      // 3. Notifications to Parents
      const notifications = [];
      
      // Notify Current Parent (if exists)
      if (user.parentId) {
        notifications.push({
          id: generateUuid(),
          userId: user.parentId,
          tenantId,
          title: "Hierarchy Transfer Request",
          message: `${user.fullName} (${user.identity}) has requested to move under ${newParent.fullName}. This will be processed in 24 hours.`,
          type: "TRANSFER_REQUEST",
          metadata: { requestId: request.id, userId: user.id }
        });
      }

      // Notify New Parent
      notifications.push({
        id: generateUuid(),
        userId: newParent.id,
        tenantId,
        title: "New Downline Request",
        message: `${user.fullName} (${user.identity}) has requested to join your hierarchy. This will be processed in 24 hours.`,
        type: "TRANSFER_REQUEST",
        metadata: { requestId: request.id, userId: user.id }
      });

      await prisma.notification.createMany({ data: notifications });

      res.json({
        success: true,
        message: `Transfer request submitted. It will be automatically processed on ${scheduledAt.toLocaleString()} (after 24 hours). Notifications sent to parents.`,
        data: request
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Withdraw Hierarchy Transfer Request
   * POST /api/admin/hierarchy/withdraw-transfer
   */
  withdrawTransfer: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId } = req.user;
    try {
      const request = await prisma.hierarchyTransferRequest.findFirst({
        where: { userId, status: "PENDING" },
        include: { user: { select: { fullName: true } } }
      });

      if (!request) return res.status(404).json({ success: false, message: "No pending transfer request found." });

      await prisma.hierarchyTransferRequest.update({
        where: { id: request.id },
        data: { status: "WITHDRAWN" }
      });

      // Notify Parents about withdrawal
      const notifications = [];
      if (request.oldParentId) {
        notifications.push({
          id: generateUuid(),
          userId: request.oldParentId,
          tenantId,
          title: "Transfer Request Withdrawn",
          message: `${request.user.fullName} has withdrawn their transfer request and will stay in your hierarchy.`,
          type: "WITHDRAWN",
          metadata: { requestId: request.id }
        });
      }
      notifications.push({
        id: generateUuid(),
        userId: request.newParentId,
        tenantId,
        title: "Transfer Request Withdrawn",
        message: `${request.user.fullName} has withdrawn their request to join your hierarchy.`,
        type: "WITHDRAWN",
        metadata: { requestId: request.id }
      });

      await prisma.notification.createMany({ data: notifications });

      res.json({ success: true, message: "Transfer request withdrawn successfully. Parents notified." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  },

  /**
   * Execute Scheduled Transfers (Older than 24h)
   * This can be called by a cron job or manually for testing.
   */
  executeScheduledTransfers: async (req, res) => {
    try {
      const pendingRequests = await prisma.hierarchyTransferRequest.findMany({
        where: { 
          status: "PENDING",
          scheduledAt: { lte: new Date() }
        },
        include: { user: true, newParent: true }
      });

      if (pendingRequests.length === 0) {
        return res.json({ success: true, message: "No transfers ready for processing.", count: 0 });
      }

      let processedCount = 0;
      for (const req of pendingRequests) {
        // Execute the transfer (using the internal transfer logic pattern)
        const targetUserId = req.userId;
        const newParent = req.newParent;
        const tenantId = req.tenantId;

        const descendants = await prisma.user.findMany({
          where: { OR: [{ id: targetUserId }, { path: { contains: targetUserId } }] }
        });

        await prisma.$transaction(async (tx) => {
          const newRootPrefix = newParent.path ? `${newParent.path}/${newParent.id}` : `/${newParent.id}`;
          
          for (const u of descendants) {
            let newPath = "";
            if (u.id === targetUserId) {
              newPath = newRootPrefix;
            } else {
              const currentPath = u.path || "";
              const targetIndex = currentPath.indexOf(targetUserId);
              newPath = targetIndex !== -1 
                ? `${newRootPrefix}/${currentPath.substring(targetIndex)}`.replace(/\/\//g, '/')
                : `${newRootPrefix}/${targetUserId}/${u.id}`.replace(/\/\//g, '/');
            }

            await tx.user.update({
              where: { id: u.id },
              data: {
                path: newPath,
                ...(u.id === targetUserId ? { parentId: newParent.id } : {})
              }
            });
          }

          // Mark request as completed
          await tx.hierarchyTransferRequest.update({
            where: { id: req.id },
            data: { status: "COMPLETED" }
          });

          // 4. Completion Notifications
          const notifications = [];
          
          // Notify User
          notifications.push({
            id: generateUuid(),
            userId: targetUserId,
            tenantId,
            title: "Hierarchy Transfer Successful",
            message: `Your hierarchy has been successfully moved under ${newParent.fullName}.`,
            type: "COMPLETED",
            metadata: { requestId: req.id }
          });

          // Notify New Parent
          notifications.push({
            id: generateUuid(),
            userId: newParent.id,
            tenantId,
            title: "New Downline Added",
            message: `${req.user.fullName} and their downline have been added to your hierarchy.`,
            type: "COMPLETED",
            metadata: { requestId: req.id, userId: targetUserId }
          });

          // Notify Old Parent (if exists)
          if (req.oldParentId) {
            notifications.push({
              id: generateUuid(),
              userId: req.oldParentId,
              tenantId,
              title: "Downline Left",
              message: `${req.user.fullName} has been moved to another hierarchy.`,
              type: "COMPLETED",
              metadata: { requestId: req.id, userId: targetUserId }
            });
          }

          await tx.notification.createMany({ data: notifications });
        });

        processedCount++;
      }

      res.json({ success: true, message: `Processed ${processedCount} scheduled transfers.`, count: processedCount });

    } catch (err) {
      console.error("Scheduled Transfer Execution Error:", err);
      res.status(500).json({ success: false, message: "Execution failed" });
    }
  }
};

module.exports = hierarchyController;
