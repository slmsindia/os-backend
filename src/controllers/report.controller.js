const prisma = require("../lib/prisma");
const {
  buildWalletBalanceMap,
  buildStyledLedgerExportHtml,
  enrichLedgerTransactions,
  getLedgerMetadataUserIds
} = require("../utils/ledger");

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

      if (!isSuperAdmin) {
        where.tenantId = tenantId;
      }

      if (userId) {
        where.wallet = { userId };
        if (!['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'].includes(adminIdentity)) {
          where.wallet.user = { path: { contains: adminId } };
        }
      } else if (!isTopAdmin) {
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

      const txnLogIds = txns.map((txn) => txn.referenceId).filter(Boolean);

      const logs = txnLogIds.length
        ? await prisma.transactionLog.findMany({
            where: { id: { in: txnLogIds } },
            include: {
              subService: { include: { service: true } }
            }
          })
        : [];

      const userIdsToFetch = new Set();
      logs.forEach((log) => {
        if (log.transactionDoneById) userIdsToFetch.add(log.transactionDoneById);
        if (log.transactionDoneForId) userIdsToFetch.add(log.transactionDoneForId);
      });
      txns.flatMap(getLedgerMetadataUserIds).forEach((userId) => userIdsToFetch.add(userId));

      const involvedUsers = userIdsToFetch.size
        ? await prisma.user.findMany({
            where: { id: { in: Array.from(userIdsToFetch) } },
            select: { id: true, fullName: true, identity: true, mobile: true }
          })
        : [];

      const userMap = Object.fromEntries(involvedUsers.map((user) => [user.id, user]));
      const logMap = Object.fromEntries(logs.map((log) => [log.id, log]));

      const prabhuTxns = txnLogIds.length
        ? await prisma.prabhuTransaction.findMany({
            where: { transactionId: { in: txnLogIds } }
          })
        : [];
      const prabhuMap = Object.fromEntries(prabhuTxns.map((txn) => [txn.transactionId, txn.receiverName]));

      const enrichedTxns = enrichLedgerTransactions({
        transactions: txns,
        walletBalancesById: buildWalletBalanceMap(txns.map((txn) => txn.wallet).filter(Boolean)),
        logMap,
        userMap
      });

      const reportData = enrichedTxns.map((txn) => {
        const log = txn.referenceId ? logMap[txn.referenceId] : null;
        const type = String(txn.type || '').toUpperCase();

        return {
          transactionDateTime: txn.transactionDateTime,
          transactionAmount: txn.transactionAmount,
          transactionMethod: txn.transactionMethod || (type === 'CREDIT' ? 'Credit' : 'Debit'),
          credit: type === 'CREDIT' ? txn.transactionAmount : 'N/A',
          debit: type === 'DEBIT' ? txn.transactionAmount : 'N/A',
          tds: 'N/A',
          serviceName: log?.subService?.service?.name || txn.serviceName || txn.category || 'N/A',
          subServiceName: log?.subService?.name || txn.subServiceName || txn.category || 'N/A',
          description: txn.description || 'N/A',
          tnxDoneBy: txn.tnxDoneBy || 'System',
          roleForDoneBy: txn.roleForDoneBy || 'ADMIN',
          tnxDoneFor: txn.tnxDoneFor || 'N/A',
          roleForDoneFor: txn.roleForDoneFor || 'N/A',
          walletBalance: txn.walletBalance,
          closingBalance: txn.closingBalance,
          receiversName: prabhuMap[txn.referenceId] || 'N/A'
        };
      });

      if (exportCsv === "true") {
        const exportHtml = buildStyledLedgerExportHtml({
          title: 'Transaction Ledger Export',
          subtitle: 'Comprehensive payment history with balance movement and hierarchy details',
          columns: [
            { key: 'transactionDateTime', label: 'Date Time', value: (row) => new Date(row.transactionDateTime).toLocaleString('en-IN') },
            { key: 'transactionAmount', label: 'Amount', align: 'right' },
            { key: 'transactionMethod', label: 'Method' },
            { key: 'credit', label: 'Credit', align: 'right' },
            { key: 'debit', label: 'Debit', align: 'right' },
            { key: 'serviceName', label: 'Service' },
            { key: 'subServiceName', label: 'Sub Service' },
            { key: 'description', label: 'Description' },
            { key: 'tnxDoneBy', label: 'Done By' },
            { key: 'roleForDoneBy', label: 'Role (By)' },
            { key: 'tnxDoneFor', label: 'Done For' },
            { key: 'roleForDoneFor', label: 'Role (For)' },
            { key: 'walletBalance', label: 'Wallet Balance', align: 'right' },
            { key: 'closingBalance', label: 'Closing Balance', align: 'right' },
            { key: 'receiversName', label: 'Receiver' }
          ],
          rows: reportData
        });

        res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=transaction_report.xls');
        return res.status(200).send(`\ufeff${exportHtml}`);
      }

      res.json({ success: true, data: reportData, count: reportData.length });
    } catch (err) {
      console.error("Report Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = reportController;
