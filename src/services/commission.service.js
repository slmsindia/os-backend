const prisma = require("../lib/prisma");
const { v4: generateUuid } = require("uuid");
const walletService = require("./wallet.service");

const commissionService = {
  /**
   * Distributes commission hierarchically.
   * Logic: Sender (Upline) -> Receiver (Downline)
   */
  processCommission: async (transactionAmount, subServiceId, userId, tx = prisma) => {
    console.log(`[Commission] >>> Starting distribution for User: ${userId}, Amount: ${transactionAmount}`);
    
    try {
      // 1. Get the target user and their full hierarchy path
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, path: true, tenantId: true }
      });

      if (!user) {
          console.error("[Commission] ERROR: Target User not found");
          return { success: false, message: "User not found" };
      }

      // 2. Build the full path of IDs including Admin
      const pathIds = user.path ? user.path.split('/').filter(id => id.length > 0) : [];
      
      // Get Corporate Admin Wallet to identify the Root Admin
      const adminWallet = await tx.wallet.findFirst({
        where: { tenantId: user.tenantId, isCorporate: true }
      });

      if (adminWallet && !pathIds.includes(adminWallet.userId)) {
          pathIds.unshift(adminWallet.userId);
      }

      if (pathIds.length < 1) {
          console.log("[Commission] SKIP: No upline path found for this user.");
          return { success: true, message: "No upline path" };
      }

      console.log("[Commission] Full Hierarchy Path:", pathIds.join(" -> "));

      // 3. Fetch all users in the path to get their Identities and Schemes
      const pathUsers = await tx.user.findMany({
        where: { id: { in: pathIds } },
        select: { id: true, identity: true, commissionSchemeId: true }
      });

      // Crucial: Sort users according to the path order (Top-Down)
      const hierarchy = pathIds.map(id => pathUsers.find(u => u.id === id)).filter(Boolean);

      // 4. Create a Transaction Log for this distribution
      const transactionLog = await tx.transactionLog.create({
        data: {
          id: generateUuid(),
          subServiceId,
          amount: transactionAmount,
          transactionDoneById: userId,
          status: "SUCCESS"
        }
      });

      // 5. Iterate through the hierarchy: Sender -> Receiver
      // We start from index 0 (Admin) and go down
      for (let i = 0; i < hierarchy.length - 1; i++) {
          const sender = hierarchy[i];
          const receiver = hierarchy[i+1];

          console.log(`[Commission] Evaluating step: ${sender.identity} (${sender.id}) -> ${receiver.identity} (${receiver.id})`);

          // Receiver must have a scheme assigned to them to define how much they get from Upline
          if (!receiver.commissionSchemeId) {
              console.log(`[Commission] SKIP: Receiver ${receiver.id} has no Commission Scheme assigned.`);
              continue;
          }

          const shareConfig = await tx.commissionShare.findUnique({
              where: { schemeId_subServiceId: { schemeId: receiver.commissionSchemeId, subServiceId } }
          });

          if (!shareConfig) {
              console.log(`[Commission] SKIP: No share rule found in Scheme ${receiver.commissionSchemeId} for SubService ${subServiceId}`);
              continue;
          }

          // Identify the share key based on receiver's identity
          let shareKey = "";
          const identity = receiver.identity.toUpperCase();
          if (identity.includes("COUNTRY")) shareKey = "countryPartner";
          else if (identity.includes("STATE")) shareKey = "statePartner";
          else if (identity.includes("DISTRICT")) shareKey = "districtPartner";
          else if (identity.includes("SAATHI")) shareKey = "saathi";
          else if (identity.includes("MEMBER")) shareKey = "member";

          if (!shareKey) {
              console.log(`[Commission] SKIP: Unknown identity type: ${identity}`);
              continue;
          }

          // Calculate amount (Percentage or Flat)
          const shareValue = shareConfig[shareKey] || 0;
          const transferAmount = shareConfig.commissionType === 1 
              ? (transactionAmount * shareValue) / 100 
              : shareValue;

          if (transferAmount > 0) {
              console.log(`[Commission] TRANSFER: ${transferAmount} to ${receiver.id} (${shareKey})`);
              
              // Ensure wallets exist for both
              await ensureWallet(sender.id, user.tenantId, tx);
              await ensureWallet(receiver.id, user.tenantId, tx);

              // Perform the transfer
              await tx.wallet.update({
                  where: { userId: sender.id },
                  data: { balance: { decrement: transferAmount } }
              });

              await tx.wallet.update({
                  where: { userId: receiver.id },
                  data: { balance: { increment: transferAmount } }
              });

              // Records
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
                      description: `Commission from ${sender.identity} for ${shareKey}`,
                      tenantId: user.tenantId
                  }
              });
              
              console.log(`[Commission] SUCCESS: ${transferAmount} transferred to ${receiver.id}`);
          } else {
              console.log(`[Commission] SKIP: Transfer amount is 0 for ${shareKey}`);
          }
      }

      console.log("[Commission] <<< Processing Finished Successfully");
      return { success: true };

    } catch (err) {
      console.error("[Commission] CRITICAL ERROR:", err);
      return { success: false, error: err.message };
    }
  }
};

/**
 * Helper to ensure a wallet exists before updating balance
 */
async function ensureWallet(userId, tenantId, tx) {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) {
        console.log(`[Commission] Creating missing wallet for User: ${userId}`);
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
