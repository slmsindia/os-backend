const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");

// ============================================================
// IDENTITY → COMMISSION SHARE KEY MAPPING
// Configurable map. Add new roles here as needed.
// ============================================================
const IDENTITY_TO_SHARE_KEY = {
  'COUNTRY_HEAD':     'countryPartner',
  'STATE_PARTNER':    'statePartner',
  'DISTRICT_PARTNER': 'districtPartner',
  'SAATHI':           'saathi',
  'MEMBER':           'member',
  'AGENT':            'member',         // Agents treated like members for commission
  'BUSINESS_PARTNER': 'member',         // Business Partners treated like members
};

// ============================================================
// HELPER: Build Dynamic Payout Chain
// 
// Walks the parentId chain upward from the joiner, building
// a top-down [WL → CH → DP → SAATHI] array.
//
// Key properties:
//   - Uses ACTUAL parentId relationships (not static path)
//   - Missing hierarchy levels are automatically skipped
//   - Handles broken/transferred hierarchy correctly
//   - Always anchors chain at WL Admin for the tenant
// ============================================================
async function buildDynamicPayoutChain(joinerId, tenantId, db) {
  const ADMIN_IDENTITIES = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'];
  const chain = [];
  let currentId = joinerId;
  const visited = new Set();
  const MAX_DEPTH = 20; // Safety guard against circular references
  let depth = 0;

  console.log(`[Commission] Building dynamic payout chain for joiner: ${joinerId}`);

  // Walk up the parentId chain
  while (currentId && !visited.has(currentId) && depth < MAX_DEPTH) {
    visited.add(currentId);
    depth++;

    const user = await db.user.findUnique({
      where: { id: currentId },
      select: {
        id: true,
        fullName: true,
        identity: true,
        parentId: true,
        commissionSchemeId: true,
        tenantId: true,
        path: true
      }
    });

    if (!user) {
      console.log(`[Commission] User ${currentId} not found during chain build. Stopping.`);
      break;
    }

    chain.unshift(user); // Prepend to build top-down order
    console.log(`[Commission] Chain step: ${user.fullName} (${user.identity}) → parent: ${user.parentId || 'NONE'}`);

    // Stop if we've reached the top admin level
    if (ADMIN_IDENTITIES.includes(user.identity)) break;

    currentId = user.parentId;
  }

  // Ensure WL Admin is at the top of the chain
  const topAdmin = await db.user.findFirst({
    where: {
      tenantId,
      identity: { in: ADMIN_IDENTITIES }
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fullName: true,
      identity: true,
      commissionSchemeId: true,
      tenantId: true,
      path: true,
      parentId: true
    }
  });

  if (topAdmin && (!chain[0] || chain[0].id !== topAdmin.id)) {
    console.log(`[Commission] Prepending WL Admin: ${topAdmin.fullName} (${topAdmin.identity})`);
    chain.unshift(topAdmin);
  }

  console.log(`[Commission] Final chain (${chain.length} nodes): ${chain.map(u => `${u.fullName}(${u.identity})`).join(' → ')}`);
  return chain;
}

// ============================================================
// HELPER: Find CommissionShare in a Scheme for a SubService
//
// First tries direct ID match, then falls back to:
//   1. Slug match (same service type, different scheme)
//   2. Fuzzy name match
// ============================================================
async function findShareInScheme(schemeId, subService, db) {
  if (!schemeId || !subService) return null;

  // Direct match
  let share = await db.commissionShare.findUnique({
    where: { schemeId_subServiceId: { schemeId, subServiceId: subService.id } }
  });

  if (share) return share;

  // Cross-scheme slug match
  if (subService.slug) {
    const equivalent = await db.commissionSubService.findFirst({
      where: { schemeId, slug: subService.slug }
    });
    if (equivalent) {
      share = await db.commissionShare.findUnique({
        where: { schemeId_subServiceId: { schemeId, subServiceId: equivalent.id } }
      });
      if (share) {
        console.log(`[Commission] Slug-matched subservice: ${equivalent.name} in scheme ${schemeId}`);
        return share;
      }
    }
  }

  // Fuzzy name match
  if (subService.name) {
    const firstWord = subService.name.split(' ')[0];
    const equivalent = await db.commissionSubService.findFirst({
      where: {
        schemeId,
        name: { contains: firstWord, mode: 'insensitive' }
      }
    });
    if (equivalent) {
      share = await db.commissionShare.findUnique({
        where: { schemeId_subServiceId: { schemeId, subServiceId: equivalent.id } }
      });
      if (share) {
        console.log(`[Commission] Fuzzy-matched subservice: ${equivalent.name} in scheme ${schemeId}`);
        return share;
      }
    }
  }

  return null;
}

// ============================================================
// HELPER: Calculate Amount from CommissionShare
// ============================================================
function calculateAmount(totalAmount, share, shareKey) {
  const val = parseFloat(share[shareKey]);
  if (!val || val <= 0) return 0;
  return share.commissionType === 1
    ? (totalAmount * val) / 100  // Percentage
    : val;                        // Flat
}

// ============================================================
// HELPER: Resolve SubService (with global fallback)
// ============================================================
async function resolveSubService(subServiceId, db) {
  let subService = await db.commissionSubService.findUnique({
    where: { id: subServiceId },
    select: { id: true, name: true, slug: true, schemeId: true }
  });

  if (!subService) {
    // Global fallback (cross-tenant/scheme lookup)
    subService = await prisma.commissionSubService.findFirst({
      where: { id: subServiceId },
      select: { id: true, name: true, slug: true, schemeId: true }
    });
    if (subService) {
      console.log(`[Commission] SubService found via global lookup: ${subService.name}`);
    } else {
      console.log(`[Commission] CRITICAL: SubService ${subServiceId} not found anywhere in DB`);
    }
  }

  return subService;
}

// ============================================================
// HELPER: Location-Based Scheme Share Lookup
// ============================================================
async function findLocationSchemeShare(joiner, subService, shareKey, db) {
  try {
    const locationScheme = await db.commissionScheme.findFirst({
      where: {
        tenantId: joiner.tenantId,
        isActive: true,
        OR: [
          { targetPincode: { equals: joiner.registrationPincode, not: null } },
          { targetCity: { equals: joiner.registrationCity, not: null } },
          { targetState: { equals: joiner.registrationState, not: null } }
        ]
      },
      orderBy: [
        { targetPincode: 'desc' },
        { targetCity: 'desc' },
        { targetState: 'desc' }
      ]
    });

    if (!locationScheme) return 0;

    const share = await findShareInScheme(locationScheme.id, subService, db);
    if (share) {
      const amount = calculateAmount(0, share, shareKey); // amount=0 means we return the config, not calc
      // Re-calculate with actual total — we need to pass totalAmount here
      // This is a design limitation; the caller must handle this differently
      console.log(`[Commission] Location scheme found: ${locationScheme.name}`);
      return share; // Return the share object, let caller calculate
    }
  } catch (err) {
    console.error(`[Commission] Location scheme lookup error:`, err);
  }
  return null;
}

// ============================================================
// HELPER: Resolve Share Amount for a Receiver
//
// Priority:
//   1. Sender's own commissionSchemeId (direct parent override)
//   2. Walk up joiner's path — find nearest ancestor with a scheme
//   3. Location-based scheme
//   4. Default tenant scheme (isDefault or oldest active)
// ============================================================
async function resolveShareAmount(totalAmount, sender, receiver, joiner, subService, db) {
  const shareKey = IDENTITY_TO_SHARE_KEY[receiver.identity];
  if (!shareKey) {
    console.log(`[Commission] SKIP: No shareKey for identity ${receiver.identity}`);
    return 0;
  }

  console.log(`[Commission] Resolving share for ${receiver.identity} (shareKey: ${shareKey})`);

  // 1. Check sender's scheme override (sender is the direct parent in payout chain)
  if (sender.commissionSchemeId) {
    console.log(`[Commission]   Checking sender scheme: ${sender.commissionSchemeId}`);
    const share = await findShareInScheme(sender.commissionSchemeId, subService, db);
    if (share && parseFloat(share[shareKey]) > 0) {
      const amount = calculateAmount(totalAmount, share, shareKey);
      console.log(`[Commission]   ✅ Sender scheme match: ${share[shareKey]} (${share.commissionType === 1 ? '%' : '₹'}) = ₹${amount}`);
      return amount;
    }
  }

  // 2. Walk up joiner's path to find nearest ancestor with a scheme
  //    (covers cases where grandparent has override, not direct parent)
  const pathIds = joiner.path ? joiner.path.split('/').filter(id => id && id.length > 5) : [];
  for (let i = pathIds.length - 1; i >= 0; i--) {
    const ancestorId = pathIds[i];
    if (ancestorId === sender.id) continue; // Already checked sender above
    
    const ancestor = await db.user.findUnique({
      where: { id: ancestorId },
      select: { commissionSchemeId: true, fullName: true, identity: true }
    });
    
    if (ancestor?.commissionSchemeId) {
      console.log(`[Commission]   Checking ancestor ${ancestor.fullName} (${ancestor.identity}) scheme: ${ancestor.commissionSchemeId}`);
      const share = await findShareInScheme(ancestor.commissionSchemeId, subService, db);
      if (share && parseFloat(share[shareKey]) > 0) {
        const amount = calculateAmount(totalAmount, share, shareKey);
        console.log(`[Commission]   ✅ Ancestor scheme match via ${ancestor.fullName}: ${share[shareKey]} = ₹${amount}`);
        return amount;
      }
    }
  }

  // 3. Location-based scheme fallback
  const joinerFull = await db.user.findUnique({
    where: { id: joiner.id },
    select: { registrationPincode: true, registrationCity: true, registrationState: true, tenantId: true }
  });

  if (joinerFull) {
    const locationScheme = await db.commissionScheme.findFirst({
      where: {
        tenantId: joinerFull.tenantId,
        isActive: true,
        OR: [
          (joinerFull.registrationPincode ? { targetPincode: joinerFull.registrationPincode } : null),
          (joinerFull.registrationCity ? { targetCity: joinerFull.registrationCity } : null),
          (joinerFull.registrationState ? { targetState: joinerFull.registrationState } : null)
        ].filter(Boolean)
      },
      orderBy: [
        { targetPincode: 'desc' },
        { targetCity: 'desc' },
        { targetState: 'desc' }
      ]
    });

    if (locationScheme) {
      console.log(`[Commission]   Trying location scheme: ${locationScheme.name}`);
      const share = await findShareInScheme(locationScheme.id, subService, db);
      if (share && parseFloat(share[shareKey]) > 0) {
        const amount = calculateAmount(totalAmount, share, shareKey);
        console.log(`[Commission]   ✅ Location scheme match: ₹${amount}`);
        return amount;
      }
    }
  }

  // 4. Default tenant scheme fallback
  const defaultScheme = await db.commissionScheme.findFirst({
    where: { tenantId: joiner.tenantId, isActive: true, isDefault: true }
  }) || await db.commissionScheme.findFirst({
    where: {
      tenantId: joiner.tenantId,
      isActive: true,
      targetState: null,
      targetCity: null,
      targetPincode: null
    },
    orderBy: { createdAt: 'asc' }
  });

  if (defaultScheme) {
    console.log(`[Commission]   Trying default scheme: ${defaultScheme.name}`);
    const share = await findShareInScheme(defaultScheme.id, subService, db);
    if (share && parseFloat(share[shareKey]) > 0) {
      const amount = calculateAmount(totalAmount, share, shareKey);
      console.log(`[Commission]   ✅ Default scheme match: ₹${amount}`);
      return amount;
    }
  }

  console.log(`[Commission]   ❌ No share resolved for ${receiver.identity}. Amount = 0.`);
  return 0;
}

// ============================================================
// HELPER: Ensure Wallet Exists
// ============================================================
async function ensureWalletExists(userId, tenantId, db) {
  if (!userId) return;
  const wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    await db.wallet.create({
      data: {
        id: generateUuid(),
        userId,
        tenantId,
        balance: 0,
        isCorporate: false,
        isActive: true
      }
    });
    console.log(`[Commission] Created new wallet for user ${userId}`);
  }
}

// ============================================================
// HELPER: Execute Wallet Transfer (Debit Sender, Credit Receiver)
// 
// IMPORTANT: No balance guard is applied here.
// Negative wallet balances are INTENTIONALLY ALLOWED per business rules.
// ============================================================
async function executeWalletTransfer(sender, receiver, amount, txLog, joiner, subService, customDesc, db) {
  const tenantId = joiner.tenantId;
  const ADMIN_IDENTITIES = ['SUPER_ADMIN', 'WHITE_LABEL_ADMIN', 'ADMIN'];
  const isAdminSender = ADMIN_IDENTITIES.includes(sender.identity);
  const serviceLabel = subService?.name || 'Service';

  // Resolve sender wallet
  let senderWallet;
  if (isAdminSender) {
    // Admin uses corporate wallet
    senderWallet = await db.wallet.findFirst({
      where: { tenantId, isCorporate: true }
    });
    if (!senderWallet) {
      console.error(`[Commission] ❌ No corporate wallet found for tenant ${tenantId}`);
      return false;
    }
  } else {
    await ensureWalletExists(sender.id, tenantId, db);
    senderWallet = await db.wallet.findUnique({ where: { userId: sender.id } });
  }

  if (!senderWallet) {
    console.error(`[Commission] ❌ No wallet for sender ${sender.fullName} (${sender.identity})`);
    return false;
  }

  // Resolve receiver wallet
  await ensureWalletExists(receiver.id, tenantId, db);
  const receiverWallet = await db.wallet.findUnique({ where: { userId: receiver.id } });

  if (!receiverWallet) {
    console.error(`[Commission] ❌ No wallet for receiver ${receiver.fullName} (${receiver.identity})`);
    return false;
  }

  const debitDesc = customDesc || `Commission paid to ${receiver.fullName} for ${serviceLabel} (joiner: ${joiner.fullName})`;
  const creditDesc = customDesc || `Commission received from ${sender.fullName} for ${serviceLabel} (joiner: ${joiner.fullName})`;

  // DEBIT sender — direct decrement, negative balances allowed
  await db.wallet.update({
    where: { id: senderWallet.id },
    data: { balance: { decrement: amount } }
  });
  await db.walletTransaction.create({
    data: {
      id: generateUuid(),
      walletId: senderWallet.id,
      amount,
      type: 'DEBIT',
      category: 'COMMISSION_PAYOUT',
      referenceId: txLog.id,
      description: debitDesc,
      tenantId
    }
  });

  // CREDIT receiver — direct increment
  await db.wallet.update({
    where: { id: receiverWallet.id },
    data: { balance: { increment: amount } }
  });
  await db.walletTransaction.create({
    data: {
      id: generateUuid(),
      walletId: receiverWallet.id,
      amount,
      type: 'CREDIT',
      category: 'COMMISSION',
      referenceId: txLog.id,
      description: creditDesc,
      tenantId
    }
  });

  // Commission history record for receiver
  await db.commissionHistory.create({
    data: {
      id: generateUuid(),
      userId: receiver.id,
      transactionId: txLog.id,
      amount,
      accountType: 'commission'
    }
  });

  console.log(`[Commission] ✅ Transferred ₹${amount}: ${sender.fullName}(${sender.identity}) → ${receiver.fullName}(${receiver.identity})`);
  return true;
}

// ============================================================
// MAIN: Commission Service
// ============================================================
const commissionService = {
  /**
   * processCommission — Dynamic Hierarchical Commission Engine
   * 
   * Implements wallet-chain settlement with:
   *   - Dynamic parentId traversal (not static path)
   *   - Missing-level safe hierarchy handling
   *   - Recursive override resolution (nearest ancestor wins)
   *   - Subtree-specific overrides via commissionSchemeId
   *   - Atomic transaction wrapping
   *   - Infinite negative wallet support (no balance guards)
   * 
   * @param {number} transactionAmount - Total amount collected (e.g. membership fee)
   * @param {string} subServiceId - CommissionSubService ID for rate lookup
   * @param {string} userId - The joiner/trigger user (new member, saathi, etc.)
   * @param {string|null} customDescription - Optional description override for wallet logs
   * @param {object|null} externalTx - Pass an existing Prisma transaction context (or null)
   */
  processCommission: async (transactionAmount, subServiceId, userId, customDescription = null, externalTx = null) => {
    console.log(`\n[Commission] ════════════ STARTING ════════════`);
    console.log(`[Commission] Amount: ₹${transactionAmount}, SubService: ${subServiceId}, Joiner: ${userId}`);

    try {
      // ── 1. Load Joiner ──────────────────────────────────────
      const joiner = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, path: true, tenantId: true, parentId: true, registrationPincode: true, registrationCity: true, registrationState: true }
      });

      if (!joiner) {
        console.log(`[Commission] ❌ Joiner user ${userId} not found`);
        return { success: false, message: 'User not found' };
      }

      // ── 2. Resolve SubService ───────────────────────────────
      const subService = await resolveSubService(subServiceId, prisma);
      console.log(`[Commission] SubService: ${subService?.name || 'UNKNOWN'} (slug: ${subService?.slug || 'none'})`);

      // ── 3. Build Dynamic Payout Chain ──────────────────────
      const payoutChain = await buildDynamicPayoutChain(joiner.id, joiner.tenantId, prisma);

      if (payoutChain.length < 2) {
        console.log(`[Commission] SKIP: Payout chain too short (${payoutChain.length} nodes). No upline to pay.`);
        return { success: true, skipped: true, reason: 'No payout chain' };
      }

      // ── 4. Create TransactionLog ────────────────────────────
      const txLog = await prisma.transactionLog.create({
        data: {
          id: generateUuid(),
          subServiceId: subService?.id || subServiceId,
          amount: transactionAmount,
          transactionDoneById: userId,
          status: 'PENDING'
        }
      });
      console.log(`[Commission] TransactionLog created: ${txLog.id}`);

      // ── 5. Execute Payout Chain in Atomic Transaction ───────
      const transfers = [];
      const errors = [];

      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < payoutChain.length - 1; i++) {
          const sender = payoutChain[i];
          const receiver = payoutChain[i + 1];

          console.log(`\n[Commission] ── Step ${i + 1}: ${sender.fullName}(${sender.identity}) → ${receiver.fullName}(${receiver.identity})`);

          // Resolve how much this receiver gets
          const shareAmount = await resolveShareAmount(
            transactionAmount,
            sender,
            receiver,
            joiner,
            subService,
            tx
          );

          if (shareAmount <= 0) {
            console.log(`[Commission]   SKIP: Amount resolved to 0 for ${receiver.identity}`);
            continue;
          }

          // Execute the actual wallet transfer
          const success = await executeWalletTransfer(
            sender,
            receiver,
            shareAmount,
            txLog,
            joiner,
            subService,
            customDescription,
            tx
          );

          if (success) {
            transfers.push({
              from: sender.fullName,
              fromRole: sender.identity,
              to: receiver.fullName,
              toRole: receiver.identity,
              amount: shareAmount
            });
          } else {
            errors.push(`Failed: ${sender.identity} → ${receiver.identity}`);
          }
        }
      });

      // ── 6. Update TransactionLog Status ────────────────────
      await prisma.transactionLog.update({
        where: { id: txLog.id },
        data: { status: transfers.length > 0 ? 'SUCCESS' : 'SKIPPED' }
      });

      console.log(`\n[Commission] ════════════ COMPLETE ════════════`);
      console.log(`[Commission] ${transfers.length} transfers executed, ${errors.length} errors`);
      transfers.forEach(t => console.log(`[Commission]   ₹${t.amount}: ${t.fromRole} → ${t.toRole}`));

      return {
        success: true,
        transactionLogId: txLog.id,
        transfers,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (err) {
      console.error(`[Commission] ❌ CRITICAL ERROR:`, err);
      return { success: false, error: err.message };
    }
  }
};

module.exports = commissionService;
