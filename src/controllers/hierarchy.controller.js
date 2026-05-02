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

      const where = { parentId: targetParentId };
      if (!isSuperAdmin) where.tenantId = tenantId;
      if (identity) where.identity = identity;
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

      res.json({
        success: true,
        data: children.map(c => ({
          ...c,
          hasChildren: c._count.children > 0,
          balance: c.wallet?.balance || 0
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
    const { targetUserId } = req.params;
    const { page = 1, limit = 20, startDate, endDate, type, category } = req.query;

    try {
      const isSuperAdmin = creatorIdentity === 'SUPER_ADMIN';
      const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { path: true } });
      
      if (!isSuperAdmin && targetUserId !== currentUserId) {
        if (!targetUser || !targetUser.path || !targetUser.path.includes(currentUserId)) {
          return res.status(403).json({ success: false, message: "Permission denied." });
        }
      }

      let targetWallet = await prisma.wallet.findUnique({ where: { userId: targetUserId } });
      if (!targetWallet) {
        targetWallet = await prisma.wallet.create({
          data: { id: generateUuid(), userId: targetUserId, tenantId: targetUser?.tenantId || tenantId, balance: 0, isCorporate: false }
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
   * GET /api/admin/hierarchy/user-details/:targetUserId
   * Complete User Info for Hierarchy Explorer (360-degree view)
   */
  getCompleteUserInfo: async (req, res) => {
    const { user_id: currentUserId, identity: adminIdentity, tenant_id: tenantId } = req.user;
    const { targetUserId } = req.params;

    try {
      // 1. Security Check: Is the target user in the admin's hierarchy?
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
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
      const isOwner = targetUserId === currentUserId;
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
          where: { wallet: { userId: targetUserId } },
          _count: { _all: true },
          _sum: { amount: true }
        }),
        // Commission Stats
        prisma.commissionHistory.aggregate({
          where: { userId: targetUserId },
          _sum: { amount: true }
        }),
        // Remittance/Money Deposit Stats (via category filter)
        prisma.walletTransaction.aggregate({
          where: { 
            wallet: { userId: targetUserId }, 
            category: { in: ['REMITTANCE', 'MONEY_TRANSFER', 'CASH_PICKUP'] } 
          },
          _count: { _all: true },
          _sum: { amount: true }
        }),
        // Document Counts (Membership docs)
        prisma.membershipDocument.count({
           where: { application: { userId: targetUserId } }
        })
      ]);

      // 3. Format Response (Mirroring User Request Example)
      const data = {
        id: targetUser.id,
        firstName: targetUser.fullName.split(' ')[0],
        lastName: targetUser.fullName.split(' ').slice(1).join(' ') || "N/A",
        birthDate: targetUser.dateOfBirth?.toLocaleDateString() || "N/A",
        dateOfRegistration: targetUser.createdAt,
        email: targetUser.email || "N/A",
        role: targetUser.identity,
        phoneNo: targetUser.mobile,
        gender: targetUser.gender,
        genderName: targetUser.gender === "MALE" ? "Male" : targetUser.gender === "FEMALE" ? "Female" : "Other",
        isEmailVerified: !!targetUser.email,
        isPhoneVerified: true,
        profilePhotoUrl: targetUser.profilePhoto || "N/A",
        parentUserName: targetUser.parent?.fullName || "N/A",
        isActive: targetUser.approvalStatus !== "DEACTIVATED",
        walletBalance: targetUser.wallet?.balance || 0,
        isMemberApproved: targetUser.membershipApplications.length > 0,
        isSaathiApproved: targetUser.saathiApplications.length > 0,
        membershipNumber: targetUser.membershipApplications[0]?.membershipNumber || "N/A",
        
        // Address Info (if available from applications)
        address: targetUser.membershipApplications[0]?.currentAddress || "N/A",
        city: targetUser.membershipApplications[0]?.currentAddress?.split(',').slice(-4, -3)[0]?.trim() || "N/A",
        district: targetUser.membershipApplications[0]?.currentDistrict || "N/A",
        state: targetUser.membershipApplications[0]?.currentState || "N/A",
        country: "India",
        pincode: targetUser.membershipApplications[0]?.currentPincode || "N/A",
        
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
        prabhuAgentRegistration: false
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

      if (exportCsv === "true") {
        const headers = ["ID", "Name", "Mobile", "Email", "Role", "Status", "Balance", "White Label", "Country Head", "State Partner", "District Partner", "Created At"];
        let csv = headers.join(",") + "\n";
        enrichedUsers.forEach(u => {
          const values = [u.id, u.fullName, u.mobile, u.email || "N/A", u.identity, u.approvalStatus, u.balance, u.hierarchyInfo.whiteLabel?.fullName || "N/A", u.hierarchyInfo.countryHead?.fullName || "N/A", u.hierarchyInfo.statePartner?.fullName || "N/A", u.hierarchyInfo.districtPartner?.fullName || "N/A", u.createdAt.toISOString()];
          csv += values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=hierarchy.csv`);
        return res.status(200).send(csv);
      }

      const summary = {};
      identityStats.forEach(s => { summary[s.identity] = s._count._all; });

      res.json({ success: true, data: { users: enrichedUsers, summary, pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } } });
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

      res.json({
        success: true,
        message: `Transfer request submitted. It will be automatically processed on ${scheduledAt.toLocaleString()} (after 24 hours).`,
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
    const { user_id: userId } = req.user;
    try {
      const request = await prisma.hierarchyTransferRequest.findFirst({
        where: { userId, status: "PENDING" }
      });

      if (!request) return res.status(404).json({ success: false, message: "No pending transfer request found." });

      await prisma.hierarchyTransferRequest.update({
        where: { id: request.id },
        data: { status: "WITHDRAWN" }
      });

      res.json({ success: true, message: "Transfer request withdrawn successfully." });
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
