const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");

const ADMIN_IDENTITIES = ["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"];

const IDENTITY_TO_SHARE_KEY = {
  COUNTRY_HEAD: "countryPartner",
  STATE_PARTNER: "statePartner",
  DISTRICT_PARTNER: "districtPartner",
  SAATHI: "saathi",
  MEMBER: "member",
  AGENT: "member",
  BUSINESS_PARTNER: "member",
};

const createSettlementError = (code, message, meta = {}) => {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, meta);
  return error;
};

const normalizeAmount = (amount) => {
  const parsed = Number.parseFloat(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createSettlementError("INVALID_AMOUNT", "Settlement amount must be greater than 0");
  }
  return parsed;
};

const asDb = (client) => client || prisma;

const isPrismaKnownError = (err, code) => Boolean(err && err.code === code);

async function loadSubService(subServiceId, db) {
  if (!subServiceId) return null;

  const client = asDb(db);
  return client.commissionSubService.findUnique({
    where: { id: subServiceId },
    select: {
      id: true,
      name: true,
      slug: true,
      serviceId: true,
      schemeId: true,
      tenantId: true,
    },
  });
}

async function loadHierarchyChain(joinerId, tenantId, db) {
  const client = asDb(db);
  const chain = [];
  const seen = new Set();
  let currentId = joinerId;

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);

    const user = await client.user.findUnique({
      where: { id: currentId },
      select: {
        id: true,
        fullName: true,
        identity: true,
        parentId: true,
        tenantId: true,
        commissionSchemeId: true,
      },
    });

    if (!user || (tenantId && user.tenantId !== tenantId)) {
      break;
    }

    chain.unshift(user);

    if (!user.parentId) {
      break;
    }

    currentId = user.parentId;
  }

  return chain;
}

async function findShareInScheme(schemeId, subService, db) {
  if (!schemeId || !subService) return null;

  const client = asDb(db);

  const directShare = await client.commissionShare.findUnique({
    where: {
      schemeId_subServiceId: {
        schemeId,
        subServiceId: subService.id,
      },
    },
  });
  if (directShare) return directShare;

  if (subService.slug) {
    const equivalentSubService = await client.commissionSubService.findFirst({
      where: { schemeId, slug: subService.slug },
      select: { id: true },
    });
    if (equivalentSubService) {
      const share = await client.commissionShare.findUnique({
        where: {
          schemeId_subServiceId: {
            schemeId,
            subServiceId: equivalentSubService.id,
          },
        },
      });
      if (share) return share;
    }
  }

  if (subService.name) {
    const firstWord = subService.name.split(" ")[0];
    const equivalentSubService = await client.commissionSubService.findFirst({
      where: {
        schemeId,
        name: { contains: firstWord, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (equivalentSubService) {
      const share = await client.commissionShare.findUnique({
        where: {
          schemeId_subServiceId: {
            schemeId,
            subServiceId: equivalentSubService.id,
          },
        },
      });
      if (share) return share;
    }
  }

  return null;
}

function calculateAmount(totalAmount, share, shareKey) {
  const rawValue = Number.parseFloat(share?.[shareKey] || 0);
  if (!Number.isFinite(rawValue) || rawValue <= 0) return 0;

  if (share.commissionType === 2) {
    return rawValue;
  }

  return (totalAmount * rawValue) / 100;
}

async function findActiveSchemeForUser(userId, tenantId, db) {
  const client = asDb(db);
  if (!userId) return null;

  const user = await client.user.findUnique({
    where: { id: userId },
    select: { commissionSchemeId: true, tenantId: true },
  });

  if (!user?.commissionSchemeId || (tenantId && user.tenantId !== tenantId)) {
    return null;
  }

  return client.commissionScheme.findFirst({
    where: {
      id: user.commissionSchemeId,
      tenantId,
      isActive: true,
    },
  });
}

async function findWhiteLabelBaseNode(tenantId, db) {
  const client = asDb(db);
  return client.user.findFirst({
    where: {
      tenantId,
      identity: "WHITE_LABEL_ADMIN",
      isDeleted: false,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fullName: true,
      identity: true,
      tenantId: true,
      parentId: true,
      commissionSchemeId: true,
    },
  });
}

async function resolveSchemeForHierarchyStep({
  chain,
  senderIndex,
  tenantId,
  subService,
  shareKey,
  db,
}) {
  const client = asDb(db);

  for (let i = senderIndex; i >= 0; i -= 1) {
    const candidate = chain[i];
    const scheme = await findActiveSchemeForUser(candidate.id, tenantId, client);
    if (!scheme) continue;

    const share = await findShareInScheme(scheme.id, subService, client);
    if (!share) continue;

    const amount = calculateAmount(1, share, shareKey);
    if (amount > 0) {
      return { scheme, share, sourceNode: candidate };
    }
  }

  const whiteLabelNode = await findWhiteLabelBaseNode(tenantId, client);
  if (whiteLabelNode) {
    const scheme = await findActiveSchemeForUser(whiteLabelNode.id, tenantId, client);
    if (scheme) {
      const share = await findShareInScheme(scheme.id, subService, client);
      const amount = calculateAmount(1, share, shareKey);
      if (amount > 0) {
        return { scheme, share, sourceNode: whiteLabelNode };
      }
    }
  }

  return null;
}

async function resolveShareAmountWithFallback({
  totalAmount,
  chain,
  senderIndex,
  sender,
  receiver,
  subService,
  db,
}) {
  const shareKey = IDENTITY_TO_SHARE_KEY[receiver.identity];
  if (!shareKey) {
    console.log(`[Commission-Debug] Step ${senderIndex}: No ShareKey defined for identity: ${receiver.identity}`);
    return { amount: 0, shareKey: null, scheme: null, sourceNode: null };
  }

  const client = asDb(db);
  const resolution = await resolveSchemeForHierarchyStep({
    chain,
    senderIndex,
    tenantId: sender.tenantId,
    subService,
    shareKey,
    db: client,
  });

  if (!resolution) {
    console.log(`[Commission-Debug] Step ${senderIndex}: Could not resolve Scheme/Share for ${receiver.identity} (${shareKey})`);
    return { amount: 0, shareKey, scheme: null, sourceNode: null };
  }

  return {
    amount: calculateAmount(totalAmount, resolution.share, shareKey),
    shareKey,
    scheme: resolution.scheme,
    sourceNode: resolution.sourceNode,
  };
}

async function ensureWalletForNode(node, tenantId, db) {
  const client = asDb(db);

  if (ADMIN_IDENTITIES.includes(node.identity)) {
    let corporateWallet = await client.wallet.findFirst({
      where: { tenantId, isCorporate: true },
    });

    if (!corporateWallet) {
      corporateWallet = await client.wallet.create({
        data: {
          id: generateUuid(),
          userId: null,
          tenantId,
          isCorporate: true,
          balance: 0,
          currency: "INR",
          isActive: true,
        },
      });
    }

    return corporateWallet;
  }

  let wallet = await client.wallet.findUnique({ where: { userId: node.id } });
  if (!wallet) {
    wallet = await client.wallet.create({
      data: {
        id: generateUuid(),
        userId: node.id,
        tenantId,
        isCorporate: false,
        balance: 0,
        currency: "INR",
        isActive: true,
      },
    });
  }

  return wallet;
}

async function postLedgerMovement({
  db,
  sender,
  receiver,
  amount,
  txLog,
  joiner,
  subService,
  customDescription,
  referenceId,
  referenceType,
  shareKey,
  schemeId,
  resolvedFromUserId,
  stepIndex,
}) {
  const client = asDb(db);
  const tenantId = joiner.tenantId;
  const senderWallet = await ensureWalletForNode(sender, tenantId, client);
  const receiverWallet = await ensureWalletForNode(receiver, tenantId, client);

  const baseMetadata = {
    sourceUserId: sender.id,
    sourceRole: sender.identity,
    targetUserId: receiver.id,
    targetRole: receiver.identity,
    joinerUserId: joiner.id,
    subServiceId: subService?.id || null,
    subServiceSlug: subService?.slug || null,
    shareKey,
    schemeId,
    resolvedFromUserId: resolvedFromUserId || null,
    stepIndex,
    referenceId: referenceId || null,
    referenceType: referenceType || null,
    transactionLogId: txLog.id,
  };

  const debitDescription =
    customDescription ||
    `Commission paid to ${receiver.fullName} for ${subService?.name || "service"}`;

  const creditDescription =
    customDescription ||
    `Commission received from ${sender.fullName} for ${subService?.name || "service"}`;

  console.log(`[Commission-Debug] Posting Movement: ${sender.identity} -> ${receiver.identity} | Amount: ${amount} | ShareKey: ${shareKey}`);
  
  await client.wallet.update({
    where: { id: senderWallet.id },
    data: {
      balance: { decrement: amount },
    },
  });

  await client.walletTransaction.create({
    data: {
      id: generateUuid(),
      walletId: senderWallet.id,
      amount,
      type: "DEBIT",
      category: "COMMISSION_PAYOUT",
      status: "SUCCESS",
      referenceId: referenceId || txLog.id,
      description: debitDescription,
      tenantId,
      metadata: {
        ...baseMetadata,
        walletSide: "DEBIT",
      },
    },
  });

  await client.wallet.update({
    where: { id: receiverWallet.id },
    data: {
      balance: { increment: amount },
    },
  });

  await client.walletTransaction.create({
    data: {
      id: generateUuid(),
      walletId: receiverWallet.id,
      amount,
      type: "CREDIT",
      category: "COMMISSION",
      status: "SUCCESS",
      referenceId: referenceId || txLog.id,
      description: creditDescription,
      tenantId,
      metadata: {
        ...baseMetadata,
        walletSide: "CREDIT",
      },
    },
  });

  await client.commissionHistory.create({
    data: {
      id: generateUuid(),
      userId: receiver.id,
      transactionId: txLog.id,
      amount,
      accountType: "commission",
    },
  });
  console.log(`[Commission-Debug] Successfully credited ${amount} to ${receiver.fullName} (${receiver.identity})`);
}

async function runSettlement(db, options) {
  const {
    transactionAmount,
    subServiceId,
    userId,
    customDescription,
    referenceId,
    referenceType,
  } = options;

  const client = asDb(db);
  const joiner = await client.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      identity: true,
      tenantId: true,
      parentId: true,
      commissionSchemeId: true,
    },
  });

  if (!joiner) {
    return { success: false, message: "User not found" };
  }

  const subService = await loadSubService(subServiceId, client);
  if (!subService) {
    return { success: false, message: "Commission sub-service not found" };
  }

  const tenantId = joiner.tenantId;
  const chain = await loadHierarchyChain(joiner.id, tenantId, client);
  console.log(`[Commission-Debug] Resolved Hierarchy Chain (${chain.length} nodes):`, chain.map(u => `${u.fullName} (${u.identity})`).join(' -> '));

  if (chain.length < 2) {
    console.log(`[Commission-Debug] Chain too short for payout. Skipping.`);
    return { success: true, skipped: true, reason: "No payout chain" };
  }

  const settlementKey = referenceId
    ? `${referenceType || "COMMISSION"}:${referenceId}:${subService.id}`
    : null;

  if (settlementKey) {
    const existing = await client.transactionLog.findUnique({
      where: { settlementKey },
    });

    if (existing) {
      return {
        success: true,
        duplicate: true,
        transactionLogId: existing.id,
        transfers: [],
      };
    }
  }

  const txLog = await client.transactionLog.create({
    data: {
      id: generateUuid(),
      settlementKey,
      subServiceId: subService.id,
      amount: transactionAmount,
      transactionDoneById: userId,
      transactionDoneForId: null,
      referenceId: referenceId || null,
      referenceType: referenceType || null,
      metadata: {
        joinerUserId: joiner.id,
        hierarchyDepth: chain.length,
        subServiceSlug: subService.slug || null,
        customDescription: customDescription || null,
      },
      status: "PENDING",
    },
  });

  const transfers = [];

  try {
    for (let index = 0; index < chain.length - 1; index += 1) {
      const sender = chain[index];
      const receiver = chain[index + 1];
      const resolution = await resolveShareAmountWithFallback({
        totalAmount: transactionAmount,
        chain,
        senderIndex: index,
        sender,
        receiver,
        subService,
        db: client,
      });

      if (!resolution.shareKey || resolution.amount <= 0 || !resolution.scheme) {
        console.log(`[Commission-Debug] Step ${index}: Skipping ${receiver.identity} (No valid share or amount is 0)`);
        continue;
      }

      console.log(`[Commission-Debug] Step ${index}: Resolved Share for ${receiver.identity} = ${resolution.amount} (Scheme: ${resolution.scheme.name})`);

      await postLedgerMovement({
        db: client,
        sender,
        receiver,
        amount: resolution.amount,
        txLog,
        joiner,
        subService,
        customDescription,
        referenceId,
        referenceType,
        shareKey: resolution.shareKey,
        schemeId: resolution.scheme.id,
        resolvedFromUserId: resolution.sourceNode?.id || null,
        stepIndex: index,
      });

      transfers.push({
        from: sender.fullName,
        fromRole: sender.identity,
        to: receiver.fullName,
        toRole: receiver.identity,
        amount: resolution.amount,
        schemeId: resolution.scheme.id,
        shareKey: resolution.shareKey,
        resolvedFromUserId: resolution.sourceNode?.id || null,
      });
    }

    await client.transactionLog.update({
      where: { id: txLog.id },
      data: {
        status: transfers.length > 0 ? "SUCCESS" : "SKIPPED",
      },
    });

    return {
      success: true,
      transactionLogId: txLog.id,
      transfers,
      skipped: transfers.length === 0,
    };
  } catch (err) {
    await client.transactionLog.update({
      where: { id: txLog.id },
      data: {
        status: "FAILED",
        metadata: {
          ...(txLog.metadata || {}),
          error: err.message,
        },
      },
    }).catch(() => {});

    throw err;
  }
}

const commissionSettlementService = {
  processCommission: async (
    transactionAmount,
    subServiceId,
    userId,
    customDescription = null,
    externalTx = null,
    options = {}
  ) => {
    const normalizedAmount = normalizeAmount(transactionAmount);
    const run = async (db) =>
      runSettlement(db, {
        transactionAmount: normalizedAmount,
        subServiceId,
        userId,
        customDescription,
        referenceId: options.referenceId || options.reference || null,
        referenceType: options.referenceType || "COMMISSION",
      });

    try {
      if (externalTx) {
        return await run(externalTx);
      }

      return await prisma.$transaction(async (tx) => run(tx), {
        maxWait: 10000,
        timeout: 60000
      });
    } catch (err) {
      if (externalTx) {
        throw err;
      }

      if (isPrismaKnownError(err, "P2002")) {
        const settlementKey = options.referenceId
          ? `${options.referenceType || "COMMISSION"}:${options.referenceId}:${subServiceId}`
          : null;

        if (settlementKey) {
          const existing = await prisma.transactionLog.findUnique({
            where: { settlementKey },
          });

          if (existing) {
            return {
              success: true,
              duplicate: true,
              transactionLogId: existing.id,
              transfers: [],
            };
          }
        }
      }

      return { success: false, error: err.message };
    }
  },
};

module.exports = commissionSettlementService;
