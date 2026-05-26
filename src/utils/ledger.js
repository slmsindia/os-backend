const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getTxnDate = (tx) => new Date(tx.createdAt || tx.transactionDateTime || 0);

const sortTransactionsDesc = (left, right) => {
  const dateDiff = getTxnDate(right).getTime() - getTxnDate(left).getTime();
  if (dateDiff !== 0) return dateDiff;
  return String(right.id || '').localeCompare(String(left.id || ''));
};

const buildUserMap = (users = []) =>
  Object.fromEntries(users.filter(Boolean).map((user) => [user.id, user]));

const buildLogMap = (logs = []) =>
  Object.fromEntries(logs.filter(Boolean).map((log) => [log.id, log]));

const buildWalletBalanceMap = (wallets = []) =>
  Object.fromEntries(wallets.filter(Boolean).map((wallet) => [wallet.id, toFiniteNumber(wallet.balance)]));

const getMetadata = (tx = {}) => (
  tx.metadata && typeof tx.metadata === 'object' && !Array.isArray(tx.metadata)
    ? tx.metadata
    : {}
);

const getLedgerMetadataUserIds = (tx = {}) => {
  const metadata = getMetadata(tx);
  return [
    metadata.sourceUserId,
    metadata.targetUserId,
    metadata.joinerUserId,
    metadata.resolvedFromUserId,
    metadata.debitSourceUserId,
  ].filter(Boolean);
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatExportCell = (value) => {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (value instanceof Date) return value.toLocaleString('en-IN');
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(2) : '0.00';
  }
  return String(value);
};

const buildStyledLedgerExportHtml = ({
  title = 'Ledger Export',
  subtitle = '',
  columns = [],
  rows = [],
  generatedAt = new Date(),
}) => {
  const headerCells = columns
    .map((column) => {
      const width = column.width ? ` style="width:${escapeHtml(column.width)};"` : '';
      return `<th${width}>${escapeHtml(column.label || column.key || '')}</th>`;
    })
    .join('');

  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const rawValue = typeof column.value === 'function'
            ? column.value(row)
            : row?.[column.key];
          const alignClass = column.align === 'right' ? 'num' : column.align === 'center' ? 'center' : '';
          return `<td class="${alignClass}">${escapeHtml(formatExportCell(rawValue))}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Type" content="application/vnd.ms-excel; charset=UTF-8" />
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 24px;
    }
    .sheet {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      padding: 18px;
      border-radius: 10px;
    }
    .header {
      margin-bottom: 16px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 6px 0;
      color: #0f172a;
    }
    .subtitle {
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      margin: 0 0 4px 0;
    }
    .meta {
      font-size: 11px;
      color: #64748b;
      margin: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      vertical-align: top;
      word-break: break-word;
      white-space: normal;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .num {
      text-align: right;
      white-space: nowrap;
    }
    .center {
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <h1 class="title">${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
      <p class="meta">Generated at ${escapeHtml(generatedAt.toLocaleString('en-IN'))}</p>
    </div>
    <table>
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>
        ${bodyRows || `<tr><td colspan="${Math.max(columns.length, 1)}">N/A</td></tr>`}
      </tbody>
    </table>
  </div>
</body>
</html>`;
};

const enrichLedgerTransactions = ({
  transactions = [],
  walletBalancesById = {},
  logMap = {},
  userMap = {},
}) => {
  const groupedByWallet = new Map();
  const sortedTransactions = [...transactions].sort(sortTransactionsDesc);

  for (const tx of sortedTransactions) {
    const walletId = tx.walletId || tx.wallet?.id || 'default';
    if (!groupedByWallet.has(walletId)) {
      groupedByWallet.set(walletId, []);
    }
    groupedByWallet.get(walletId).push(tx);
  }

  const enriched = [];

  for (const [walletId, walletTransactions] of groupedByWallet.entries()) {
    let closingBalance = toFiniteNumber(walletBalancesById[walletId] ?? walletTransactions[0]?.wallet?.balance ?? 0);

    for (const tx of walletTransactions) {
      const amount = toFiniteNumber(tx.amount);
      const isCredit = String(tx.type || '').toUpperCase() === 'CREDIT';
      const openingBalance = isCredit ? closingBalance - amount : closingBalance + amount;
      const log = tx.referenceId ? logMap[tx.referenceId] : null;
      const metadata = getMetadata(tx);

      const walletUser = tx.wallet?.user || null;
      const doneByUser = log?.transactionDoneById ? userMap[log.transactionDoneById] : null;
      const doneForUser = log?.transactionDoneForId ? userMap[log.transactionDoneForId] : null;
      const metadataSourceUser = metadata.sourceUserId ? userMap[metadata.sourceUserId] : null;
      const metadataTargetUser = metadata.targetUserId ? userMap[metadata.targetUserId] : null;
      const walletSide = String(metadata.walletSide || '').toUpperCase();
      const ownerIdentity = walletUser?.identity || (tx.wallet?.isCorporate ? 'ADMIN' : 'N/A');
      const isCorporateWallet = Boolean(tx.wallet?.isCorporate);
      const debitSourceRole = metadata.debitSourceRole || (isCorporateWallet ? 'ADMIN' : null);
      const debitSourceName = debitSourceRole ? 'System Corporate' : null;

      let resolvedDoneBy = doneByUser || walletUser;
      let resolvedDoneFor = doneForUser || walletUser || resolvedDoneBy;
      let roleForDoneBy = resolvedDoneBy?.identity || ownerIdentity;
      let roleForDoneFor = resolvedDoneFor?.identity || ownerIdentity;

      if (metadataSourceUser || metadataTargetUser || debitSourceRole || walletSide) {
        if (walletSide === 'CREDIT') {
          resolvedDoneBy = metadataSourceUser || null;
          resolvedDoneFor = metadataTargetUser || walletUser || resolvedDoneBy;
          roleForDoneBy = metadata.sourceRole || resolvedDoneBy?.identity || debitSourceRole || ownerIdentity;
          roleForDoneFor = metadata.targetRole || resolvedDoneFor?.identity || ownerIdentity;

          if (debitSourceRole && !metadataSourceUser) {
            roleForDoneBy = debitSourceRole;
          }
        } else if (walletSide === 'DEBIT') {
          resolvedDoneBy = metadataSourceUser || walletUser || null;
          resolvedDoneFor = metadataTargetUser || null;
          roleForDoneBy = metadata.sourceRole || resolvedDoneBy?.identity || debitSourceRole || ownerIdentity;
          roleForDoneFor = metadata.targetRole || resolvedDoneFor?.identity || ownerIdentity;

          if (isCorporateWallet || debitSourceRole) {
            roleForDoneBy = debitSourceRole || roleForDoneBy;
          }
        }
      }

      const doneByName =
        (walletSide === 'CREDIT' && debitSourceRole && !metadataSourceUser)
          ? debitSourceName
          : resolvedDoneBy?.fullName || (isCorporateWallet ? 'System Corporate' : 'System');
      const doneForName = resolvedDoneFor?.fullName || (isCorporateWallet ? 'System Corporate' : walletUser?.fullName || 'N/A');

      enriched.push({
        ...tx,
        transactionDateTime: tx.transactionDateTime || tx.createdAt,
        transactionAmount: amount,
        transactionMethod: isCredit ? 'Credit' : 'Debit',
        openingBalance,
        balanceBefore: openingBalance,
        closingBalance,
        balanceAfter: closingBalance,
        walletBalance: openingBalance,
        tnxDoneBy: doneByName,
        roleForDoneBy,
        tnxDoneFor: doneForName,
        roleForDoneFor,
        doneByUserId: resolvedDoneBy?.id || null,
        doneForUserId: resolvedDoneFor?.id || null,
        userMobile: walletUser?.mobile || 'N/A',
        walletOwner: walletUser?.fullName || (tx.wallet?.isCorporate ? 'System Corporate' : 'Unknown'),
        ownerIdentity,
      });

      closingBalance = openingBalance;
    }
  }

  return enriched.sort(sortTransactionsDesc);
};

module.exports = {
  buildLogMap,
  buildUserMap,
  buildWalletBalanceMap,
  buildStyledLedgerExportHtml,
  getLedgerMetadataUserIds,
  enrichLedgerTransactions,
  sortTransactionsDesc,
  toFiniteNumber,
};
