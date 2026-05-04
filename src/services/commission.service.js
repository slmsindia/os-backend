const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");

const commissionService = {
  /**
   * Cascading Commission Logic with Full Transaction History (Debit & Credit)
   * Includes Joiner Name in descriptions for better transparency.
   */
  processCommission: async (transactionAmount, subServiceId, userId, customDescription = null, tx = prisma) => {
    console.log(`[Commission] >>> STARTING CASCADING: User=${userId}, SubService=${subServiceId}`);
    
    try {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, path: true, tenantId: true }
      });

      if (!user) return { success: false, message: "User not found" };
      const joinerName = user.fullName || "User";

      // Fetch subservice info for better descriptions
      const subService = await tx.commissionSubService.findUnique({
        where: { id: subServiceId },
        select: { name: true, slug: true }
      });
      const serviceLabel = subService?.name || "Service";
      const isTransfer = subService?.slug?.includes('transfer');

      // --- LOCATION BASED SCHEME LOOKUP ---
      let locationScheme = null;
      try {
        const joiner = await tx.user.findUnique({
          where: { id: userId },
          select: { registrationPincode: true, registrationCity: true, registrationState: true, tenantId: true }
        });

        if (joiner) {
          // Priority: Pincode > City > State
          locationScheme = await tx.commissionScheme.findFirst({
            where: {
              tenantId: joiner.tenantId,
              isActive: true,
              OR: [
                { targetPincode: joiner.registrationPincode },
                { targetCity: joiner.registrationCity },
                { targetState: joiner.registrationState }
              ]
            },
            orderBy: [
              { targetPincode: 'desc' }, // Nulls last usually, but we want the most specific
              { targetCity: 'desc' },
              { targetState: 'desc' }
            ]
          });
          
          if (locationScheme) {
            console.log(`[Commission] LOCATION OVERRIDE FOUND: ${locationScheme.name} for Joiner Location`);
          }
        }
      } catch (locErr) {
        console.error("[Commission] Location lookup failed:", locErr);
      }

      const rawPathIds = user.path ? user.path.split('/').filter(id => id && id.length > 5) : [];
      
      const adminUser = await tx.user.findFirst({
        where: {
          tenantId: user.tenantId,
          identity: { in: ["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"] }
        },
        orderBy: { createdAt: 'asc' }
      });

      const pathIds = [...rawPathIds];
      if (adminUser && !pathIds.includes(adminUser.id)) {
          pathIds.unshift(adminUser.id);
      }

      if (pathIds.length < 2) {
          console.log("[Commission] SKIP: No partners in path");
          return { success: true };
      }

      const pathUsers = await tx.user.findMany({
        where: { id: { in: pathIds } },
        select: { id: true, identity: true, commissionSchemeId: true, fullName: true, tenantId: true }
      });

      const hierarchy = pathIds.map(id => pathUsers.find(u => u.id === id)).filter(Boolean);

      const transactionLog = await tx.transactionLog.create({
        data: {
          id: generateUuid(),
          subServiceId,
          amount: transactionAmount,
          transactionDoneById: userId,
          status: "SUCCESS"
        }
      });

      const adminCorporateWallet = await tx.wallet.findFirst({
        where: { tenantId: user.tenantId, isCorporate: true }
      });

      for (let i = 0; i < hierarchy.length - 1; i++) {
          const sender = hierarchy[i];
          const receiver = hierarchy[i + 1];

          console.log(`[Commission] STEP ${i+1}: ${sender.fullName} -> ${receiver.fullName}`);

          // --- SCHEME RESOLUTION (UPSTREAM OVERRIDE CHAIN) ---
          // Rule: Each partner's commission is decided by the closest upstream override.
          // Fallback: Immediate Parent -> Next Parent -> ... -> WLA Default
          
          let transferAmount = 0;
          let resolvedBy = "";

          // Identity of the receiver for lookup
          const recIdentity = receiver.identity.toUpperCase();
          let shareKey = "";
          if (recIdentity.includes("COUNTRY")) shareKey = "countryPartner";
          else if (recIdentity.includes("STATE")) shareKey = "statePartner";
          else if (recIdentity.includes("DISTRICT")) shareKey = "districtPartner";
          else if (recIdentity.includes("SAATHI")) shareKey = "saathi";
          else if (recIdentity.includes("MEMBER")) shareKey = "member";

          if (!shareKey) continue;

          // Search from the current sender upwards to find an override
          for (let j = i; j >= 0; j--) {
              const upstreamPartner = hierarchy[j];
              const schemeId = upstreamPartner.commissionSchemeId;
              
              if (schemeId) {
                  const share = await tx.commissionShare.findUnique({
                      where: { schemeId_subServiceId: { schemeId, subServiceId } }
                  });
                  
                  if (share && parseFloat(share[shareKey]) > 0) {
                      const val = parseFloat(share[shareKey]);
                      transferAmount = share.commissionType === 1 ? (transactionAmount * val) / 100 : val;
                      resolvedBy = upstreamPartner.fullName;
                      break; // Found the closest override
                  }
              }
          }

          // Global Default Fallback if no override found in hierarchy
          if (transferAmount <= 0) {
              const defaultScheme = await tx.commissionScheme.findFirst({
                  where: { tenantId: user.tenantId, isActive: true, isDefault: true }
              });
              if (defaultScheme) {
                  const share = await tx.commissionShare.findUnique({
                      where: { schemeId_subServiceId: { schemeId: defaultScheme.id, subServiceId } }
                  });
                  if (share) {
                      const val = parseFloat(share[shareKey]);
                      transferAmount = share.commissionType === 1 ? (transactionAmount * val) / 100 : val;
                      resolvedBy = "System Default";
                  }
              }
          }

          if (transferAmount <= 0) {
            console.log(`[Commission]   SKIP: No commission defined for ${receiver.fullName} (${recIdentity})`);
            continue;
          }

          // --- EXECUTE TRANSFER (CREDIT-BASED: FULL DISTRIBUTION) ---
          const isSenderTopAdmin = ["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"].includes(sender.identity.toUpperCase());
          
          try {
            let senderWallet;
            if (isSenderTopAdmin && adminCorporateWallet) {
                senderWallet = adminCorporateWallet;
            } else {
                await ensureWallet(sender.id, user.tenantId, tx);
                senderWallet = await tx.wallet.findUnique({ where: { userId: sender.id } });
            }

            // Deduct from Sender (Always executes, balance allowed to go negative)
            await tx.wallet.update({
                where: { id: senderWallet.id },
                data: { balance: { decrement: transferAmount } }
            });

            // Create DEBIT Transaction log for Sender
            await tx.walletTransaction.create({
                data: {
                    id: generateUuid(),
                    walletId: senderWallet.id,
                    amount: transferAmount,
                    type: "DEBIT",
                    category: "COMMISSION_PAYOUT",
                    referenceId: transactionLog.id,
                    description: customDescription || (isTransfer 
                        ? `${serviceLabel} commission paid to ${receiver.fullName} (determined by ${resolvedBy})`
                        : `Commission paid to ${receiver.fullName} for joiner ${joinerName} (determined by ${resolvedBy})`),
                    tenantId: user.tenantId
                }
            });

            // CREDIT TO RECEIVER
            await ensureWallet(receiver.id, user.tenantId, tx);
            const recWallet = await tx.wallet.findUnique({ where: { userId: receiver.id } });
            await tx.wallet.update({
                where: { id: recWallet.id },
                data: { balance: { increment: transferAmount } }
            });

            // Create CREDIT Transaction log for Receiver
            await tx.walletTransaction.create({
                data: {
                    id: generateUuid(),
                    walletId: recWallet.id,
                    amount: transferAmount,
                    type: "CREDIT",
                    category: "COMMISSION",
                    referenceId: transactionLog.id,
                    description: customDescription || (isTransfer
                        ? `${serviceLabel} commission from ${sender.fullName} (determined by ${resolvedBy})`
                        : `Commission for ${joinerName} received from ${sender.fullName} (determined by ${resolvedBy})`),
                    tenantId: user.tenantId
                }
            });

            await tx.commissionHistory.create({
                data: {
                    id: generateUuid(),
                    userId: receiver.id,
                    transactionId: transactionLog.id,
                    amount: transferAmount,
                    accountType: "commission"
                }
            });

            console.log(`[Commission]   SUCCESS: ${transferAmount} moved from ${sender.fullName} to ${receiver.fullName} (resolved by ${resolvedBy})`);
          } catch (txErr) {
            console.error(`[Commission]   FAILED Transfer:`, txErr.message);
          }
      }

      console.log("[Commission] <<< FINISHED");
      return { success: true };

    } catch (err) {
      console.error("[Commission] CRITICAL ERROR:", err);
      return { success: false, error: err.message };
    }
  }
};

async function ensureWallet(userId, tenantId, tx) {
    if (!userId) return;
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) {
        await tx.wallet.create({
            data: {
                id: generateUuid(),
                userId,
                tenantId,
                balance: 0,
                isCorporate: false
            }
        });
    }
}

module.exports = commissionService;
