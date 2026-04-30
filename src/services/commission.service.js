const prisma = require("../lib/prisma");
const { generateUuid } = require("../utils/id");

const commissionService = {
  /**
   * Cascading Commission Logic with Full Transaction History (Debit & Credit)
   * Includes Joiner Name in descriptions for better transparency.
   */
  processCommission: async (transactionAmount, subServiceId, userId, tx = prisma) => {
    console.log(`[Commission] >>> STARTING CASCADING: User=${userId}, SubService=${subServiceId}`);
    
    try {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, path: true, tenantId: true }
      });

      if (!user) return { success: false, message: "User not found" };
      const joinerName = user.fullName || "New Member";

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

          let effectiveSchemeId = receiver.commissionSchemeId;
          if (!effectiveSchemeId) {
              const defaultScheme = await tx.commissionScheme.findFirst({
                  where: { tenantId: user.tenantId, isActive: true },
                  orderBy: { createdAt: 'desc' }
              });
              if (defaultScheme) effectiveSchemeId = defaultScheme.id;
          }

          if (!effectiveSchemeId) continue;

          const shareConfig = await tx.commissionShare.findUnique({
              where: { schemeId_subServiceId: { schemeId: effectiveSchemeId, subServiceId } } }
          );

          if (!shareConfig) continue;

          let shareKey = "";
          const identity = receiver.identity.toUpperCase();
          if (identity.includes("COUNTRY")) shareKey = "countryPartner";
          else if (identity.includes("STATE")) shareKey = "statePartner";
          else if (identity.includes("DISTRICT")) shareKey = "districtPartner";
          else if (identity.includes("SAATHI")) shareKey = "saathi";
          else if (identity.includes("MEMBER")) shareKey = "member";

          if (!shareKey) continue;

          const shareValue = parseFloat(shareConfig[shareKey]) || 0;
          const transferAmount = shareConfig.commissionType === 1
              ? (transactionAmount * shareValue) / 100
              : shareValue;

          if (transferAmount <= 0) continue;

          // --- EXECUTE TRANSFER ---
          const isSenderTopAdmin = ["SUPER_ADMIN", "WHITE_LABEL_ADMIN", "ADMIN"].includes(sender.identity.toUpperCase());
          
          try {
            let senderWallet;
            if (isSenderTopAdmin && adminCorporateWallet) {
                senderWallet = adminCorporateWallet;
                await tx.wallet.update({
                    where: { id: adminCorporateWallet.id },
                    data: { balance: { decrement: transferAmount } }
                });
            } else {
                await ensureWallet(sender.id, user.tenantId, tx);
                senderWallet = await tx.wallet.findUnique({ where: { userId: sender.id } });
                await tx.wallet.update({
                    where: { id: senderWallet.id },
                    data: { balance: { decrement: transferAmount } }
                });
            }

            // Create DEBIT Transaction log for Sender
            await tx.walletTransaction.create({
                data: {
                    id: generateUuid(),
                    walletId: senderWallet.id,
                    amount: transferAmount,
                    type: "DEBIT",
                    category: "COMMISSION_PAYOUT",
                    referenceId: transactionLog.id,
                    description: `Commission paid to ${receiver.fullName} for joiner ${joinerName}`,
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
                    description: `Commission for ${joinerName} received from ${sender.fullName}`,
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

            console.log(`[Commission]   SUCCESS: ${transferAmount} moved to ${receiver.fullName}`);
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
