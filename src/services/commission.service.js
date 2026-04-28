const prisma = require("../lib/prisma");
const { v4: generateUuid } = require("uuid");

const commissionService = {
  /**
   * Distributes commission hierarchically based on Upline.
   * Logic: Admin -> Country -> State -> District -> Saathi
   */
  processCommission: async (transactionAmount, subServiceId, userId, tx = prisma) => {
    try {
      // 1. Get the user and their Upline (Path)
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { tenant: true }
      });
      if (!user) return { success: false, message: "User not found" };

      // Total fee goes to Admin first
      const adminWallet = await tx.wallet.findFirst({
        where: { tenantId: user.tenantId, isCorporate: true }
      });
      if (!adminWallet) return { success: false, message: "Corporate Admin Wallet not found" };

      // 2. Fetch the Upline (from top to bottom)
      const pathIds = user.path ? user.path.split('/').filter(id => id.length > 0) : [];
      if (adminWallet && !pathIds.includes(adminWallet.userId)) {
          pathIds.unshift(adminWallet.userId);
      }
      console.log(`[Commission] Processing path for user ${userId}:`, pathIds);
      
      const hierarchy = await tx.user.findMany({
        where: { id: { in: pathIds } },
        select: { id: true, identity: true, commissionSchemeId: true }
      });

      // Sort hierarchy top to bottom based on path index
      hierarchy.sort((a, b) => pathIds.indexOf(a.id) - pathIds.indexOf(b.id));

      const transactionLog = await tx.transactionLog.create({
        data: {
          id: generateUuid(),
          subServiceId,
          amount: transactionAmount,
          transactionDoneById: userId,
          status: "SUCCESS"
        }
      });
      console.log(`[Commission] Created TransactionLog: ${transactionLog.id}`);

      // Track how much balance the current "Sender" has (Starts with Admin having 100%)
      let currentSender = adminWallet.userId;
      
      // Calculate amount logic based on CommissionShare (1 = %, 2 = Flat)
      const calculateShare = (shareConfig, key) => {
          if (!shareConfig || !shareConfig[key]) return 0;
          return shareConfig.commissionType === 1 
              ? (transactionAmount * shareConfig[key]) / 100 
              : shareConfig[key];
      };

      // Traverse from Top (Admin) down to the direct parent
      for (let i = 0; i < hierarchy.length - 1; i++) {
          const sender = hierarchy[i];
          const receiver = hierarchy[i + 1];

          // We look at Receiver's scheme (assigned to them)
          if (!receiver.commissionSchemeId) continue; // Skip if receiver has no scheme

          const shareConfig = await tx.commissionShare.findUnique({
             where: { schemeId_subServiceId: { schemeId: receiver.commissionSchemeId, subServiceId } }
          });
          
          if (!shareConfig) continue;

          // Find the exact field to look up based on Receiver's identity
          let shareKey = '';
          if (receiver.identity === 'COUNTRY_HEAD') shareKey = 'countryPartner';
          else if (receiver.identity === 'STATE_PARTNER') shareKey = 'statePartner';
          else if (receiver.identity === 'DISTRICT_PARTNER') shareKey = 'districtPartner';
          else if (receiver.identity === 'SAATHI') shareKey = 'saathi';
          else if (receiver.identity === 'MEMBER') shareKey = 'member';
          // Country partner isn't strictly in the schema you provided earlier, but if it is, we'd add it.
          // Let's assume standard names for now.

          if (!shareKey) continue; // Unknown identity for commission

          const transferAmount = calculateShare(shareConfig, shareKey);

          if (transferAmount > 0) {
              console.log(`[Commission] SUCCESS: Transferring ${transferAmount} from ${sender.id} to ${receiver.id} (${receiver.identity})`);
              // Deduct from Sender
              await tx.wallet.update({
                  where: { userId: sender.id },
                  data: { balance: { decrement: transferAmount } }
              });

              // Add to Receiver
              await tx.wallet.update({
                  where: { userId: receiver.id },
                  data: { balance: { increment: transferAmount } }
              });

              // Create History for Receiver
              await tx.commissionHistory.create({
                  data: {
                      id: generateUuid(),
                      userId: receiver.id,
                      transactionId: transactionLog.id,
                      amount: transferAmount,
                      accountType: "commission"
                  }
              });

              // Transaction Logs
              await tx.walletTransaction.create({
                  data: {
                      id: generateUuid(),
                      walletId: (await tx.wallet.findUnique({ where: { userId: receiver.id } })).id,
                      amount: transferAmount,
                      type: "CREDIT",
                      category: "COMMISSION",
                      referenceId: transactionLog.id,
                      description: `Commission received from upline for ${receiver.identity}`,
                      tenantId: user.tenantId
                  }
              });
          }
      }

      return { success: true, message: "Commission cascading processed successfully" };
    } catch (err) {
      console.error("Commission processing error:", err);
      return { success: false, message: "Error processing commission" };
    }
  }
};

module.exports = commissionService;
