const prisma = require("../lib/prisma");
const { v4: generateUuid } = require("uuid");

const commissionService = {
  processCommission: async (transactionAmount, subServiceId, userId, tx = prisma) => {
    console.log(`[Commission] >>> STARTING: User=${userId}, Amt=${transactionAmount}, SubService=${subServiceId}`);
    
    try {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, path: true, tenantId: true }
      });

      if (!user) {
          console.error("[Commission] ERROR: User not found in DB");
          return { success: false, message: "User not found" };
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

      console.log("[Commission] Resolved Hierarchy Path:", pathIds.join(" -> "));

      if (pathIds.length < 2) {
          console.log("[Commission] SKIP: Path too short (No uplines found)");
          return { success: true };
      }

      const pathUsers = await tx.user.findMany({
        where: { id: { in: pathIds } },
        select: { id: true, identity: true, commissionSchemeId: true, fullName: true }
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

          // 7. Determine the Scheme for this Receiver
          let effectiveSchemeId = null;

          if (receiver.commissionSchemeId) {
              // Check if the assigned scheme is active
              const assignedScheme = await tx.commissionScheme.findFirst({
                  where: { id: receiver.commissionSchemeId, isActive: true }
              });
              if (assignedScheme) {
                  effectiveSchemeId = assignedScheme.id;
              } else {
                  console.log(`[Commission]   Assigned scheme ${receiver.commissionSchemeId} is INACTIVE. Falling back...`);
              }
          }

          if (!effectiveSchemeId) {
              // FALLBACK: Find the active scheme for this tenant
              const defaultScheme = await tx.commissionScheme.findFirst({
                  where: { tenantId: user.tenantId, isActive: true },
                  orderBy: { createdAt: 'desc' }
              });

              if (defaultScheme) {
                  effectiveSchemeId = defaultScheme.id;
                  console.log(`[Commission]   USING DEFAULT ACTIVE SCHEME: ${defaultScheme.name} for ${receiver.fullName}`);
              }
          }

          if (!effectiveSchemeId) {
              console.log(`[Commission]   SKIP: No active scheme found for ${receiver.fullName}`);
              continue;
          }

          const shareConfig = await tx.commissionShare.findUnique({
              where: { schemeId_subServiceId: { schemeId: effectiveSchemeId, subServiceId } }
          });

          if (!shareConfig) {
              console.log(`[Commission]   SKIP: No share rule in Scheme ${effectiveSchemeId} for SubService ${subServiceId}`);
              continue;
          }

          let shareKey = "";
          const identity = receiver.identity.toUpperCase();
          if (identity.includes("COUNTRY")) shareKey = "countryPartner";
          else if (identity.includes("STATE")) shareKey = "statePartner";
          else if (identity.includes("DISTRICT")) shareKey = "districtPartner";
          else if (identity.includes("SAATHI")) shareKey = "saathi";
          else if (identity.includes("MEMBER")) shareKey = "member";

          if (!shareKey) {
              console.log(`[Commission]   SKIP: No shareKey for ${identity}`);
              continue;
          }

          const shareValue = parseFloat(shareConfig[shareKey]) || 0;
          const transferAmount = shareConfig.commissionType === 1
              ? (transactionAmount * shareValue) / 100
              : shareValue;

          if (transferAmount <= 0) {
              console.log(`[Commission]   SKIP: Amount is 0`);
              continue;
          }

          // --- EXECUTE TRANSFER ---
          // For Platform Fees, the Admin has received the full amount, 
          // so ALL hierarchical transfers should be deducted from the Admin Corporate Wallet.
          
          try {
            if (adminCorporateWallet) {
                console.log(`[Commission]   DEDUCTING ${transferAmount} from Corporate Wallet for ${receiver.fullName}`);
                await tx.wallet.update({
                    where: { id: adminCorporateWallet.id },
                    data: { balance: { decrement: transferAmount } }
                });
            } else {
                // Fallback: Deduct from immediate sender if no corporate wallet (shouldn't happen for platform fees)
                console.log(`[Commission]   DEDUCTING ${transferAmount} from ${sender.fullName}'s Personal Wallet (No Corp Wallet found)`);
                await ensureWallet(sender.id, user.tenantId, tx);
                await tx.wallet.update({
                    where: { userId: sender.id },
                    data: { balance: { decrement: transferAmount } }
                });
            }

            await ensureWallet(receiver.id, user.tenantId, tx);
            await tx.wallet.update({
                where: { userId: receiver.id },
                data: { balance: { increment: transferAmount } }
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

            const recWallet = await tx.wallet.findUnique({ where: { userId: receiver.id } });
            await tx.walletTransaction.create({
                data: {
                    id: generateUuid(),
                    walletId: recWallet.id,
                    amount: transferAmount,
                    type: "CREDIT",
                    category: "COMMISSION",
                    referenceId: transactionLog.id,
                    description: `Commission for ${shareKey}`,
                    tenantId: user.tenantId
                }
            });

            console.log(`[Commission]   SUCCESS: ${transferAmount} transferred to ${receiver.fullName}`);
          } catch (txErr) {
            console.error(`[Commission]   TRANSFER FAILED for ${receiver.fullName}:`, txErr.message);
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
        console.log(`[Commission] Creating wallet for ${userId}`);
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
