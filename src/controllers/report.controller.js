const prisma = require("../lib/prisma");

const reportController = {
  /**
   * GET /api/admin/reports/transactions
   * Fixed 500 error and improved data mapping
   */
  getTransactionReport: async (req, res) => {
    const { user_id: adminId, tenant_id: tenantId, identity: adminIdentity } = req.user;
    const { startDate, endDate, page = 1, limit = 100, exportCsv = "false", userId } = req.query;

    try {
      const isSuperAdmin = adminIdentity === 'SUPER_ADMIN';
      const isTopAdmin = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN', 'SUB_ADMIN'].includes(adminIdentity);
      
      const where = {};
      
      // If not SuperAdmin, restrict by their own tenant
      if (!isSuperAdmin) {
        where.tenantId = tenantId;
      }

      // If filtering by specific user
      if (userId) {
        where.wallet = { userId };
        // If not a high-level admin, extra security check to ensure target user is in their hierarchy
        if (!['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(adminIdentity)) {
          where.wallet.user = { path: { contains: adminId } };
        }
      } else if (!isTopAdmin) {
        // General view for restricted roles (only see their own/descendants' txns)
        where.wallet = {
          OR: [
            { userId: adminId },
            { user: { path: { contains: adminId } } }
          ]
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

      const txns = await prisma.walletTransaction.findMany({
        where,
        include: {
          wallet: {
            include: {
              user: {
                select: { id: true, fullName: true, identity: true, mobile: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        ...(exportCsv === "true" ? {} : { skip: (parseInt(page) - 1) * parseInt(limit), take: parseInt(limit) })
      });

      // --- MANUAL JOINS TO AVOID SCHEMA ERRORS ---
      const txnLogIds = txns.map(t => t.referenceId).filter(Boolean);
      
      // 1. Fetch Transaction Logs
      const logs = await prisma.transactionLog.findMany({
        where: { id: { in: txnLogIds } },
        include: {
          subService: { include: { service: true } }
        }
      });

      // 2. Fetch Users involved in those logs (Done By & Done For)
      const userIdsToFetch = new Set();
      logs.forEach(l => {
        if (l.transactionDoneById) userIdsToFetch.add(l.transactionDoneById);
        if (l.transactionDoneForId) userIdsToFetch.add(l.transactionDoneForId);
      });

      const involvedUsers = await prisma.user.findMany({
        where: { id: { in: Array.from(userIdsToFetch) } },
        select: { id: true, fullName: true, identity: true }
      });
      const userMap = Object.fromEntries(involvedUsers.map(u => [u.id, u]));

      // 3. Fetch Prabhu/IME Receivers if applicable
      const prabhuTxns = await prisma.prabhuTransaction.findMany({
        where: { transactionId: { in: txnLogIds } }
      });
      const prabhuMap = Object.fromEntries(prabhuTxns.map(p => [p.transactionId, p.receiverName]));

      const logMap = Object.fromEntries(logs.map(l => [l.id, l]));

      const reportData = txns.map(t => {
        const log = t.referenceId ? logMap[t.referenceId] : null;
        const doneBy = log ? userMap[log.transactionDoneById] : t.wallet?.user;
        const doneFor = log ? userMap[log.transactionDoneForId] : null;
        
        const method = t.description?.includes("RAZORPAY") ? "RAZORPAY" : "WALLET";
        const credit = t.type === "CREDIT" ? t.amount : "N/A";
        const debit = t.type === "DEBIT" ? t.amount : "N/A";

        return {
          transactionDateTime: t.createdAt,
          transactionAmount: t.amount,
          transactionMethod: method,
          credit,
          debit,
          tds: "N/A",
          serviceName: log?.subService?.service?.name || t.category || "N/A",
          subServiceName: log?.subService?.name || t.category || "N/A",
          description: t.description || "—",
          tnxDoneBy: doneBy?.fullName || "System",
          roleForDoneBy: doneBy?.identity || "ADMIN",
          tnxDoneFor: doneFor?.fullName || "N/A",
          roleForDoneFor: doneFor?.identity || "N/A",
          receiversName: prabhuMap[t.referenceId] || "N/A"
        };
      });

      if (exportCsv === "true") {
        const headers = ["Date Time", "Amount", "Method", "Credit", "Debit", "Service", "Sub Service", "Description", "Done By", "Role (By)", "Done For", "Role (For)", "Receiver"];
        let csv = headers.join(",") + "\n";
        reportData.forEach(row => {
          const values = [
            row.transactionDateTime.toLocaleString('en-IN'), 
            row.transactionAmount, 
            row.transactionMethod,
            row.credit, 
            row.debit, 
            row.serviceName, 
            row.subServiceName,
            row.description,
            row.tnxDoneBy, 
            row.roleForDoneBy, 
            row.tnxDoneFor, 
            row.roleForDoneFor, 
            row.receiversName
          ];
          csv += values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=transaction_report.csv`);
        return res.status(200).send(csv);
      }

      res.json({ success: true, data: reportData, count: reportData.length });
    } catch (err) {
      console.error("Report Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = reportController;
