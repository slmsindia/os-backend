const { prisma } = require("../lib/prisma");
const { v4: generateUuid } = require("uuid");

const commissionService = {
  /**
   * Automatically distributes commission based on the user's scheme and the transaction sub-service.
   * This should be called inside your main transaction endpoints (like after a recharge or registration).
   * 
   * @param {number} transactionAmount - Total transaction/service charge amount
   * @param {string} subServiceId - ID of the CommissionSubService
   * @param {string} userId - ID of the user performing the transaction
   * @param {object} tx - Prisma transaction object (optional, defaults to prisma)
   */
  processCommission: async (transactionAmount, subServiceId, userId, tx = prisma) => {
    try {
      // 1. Get User and their assigned Scheme
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { tenant: true }
      });
      if (!user || !user.commissionSchemeId) return { success: false, message: "No scheme assigned to user" };

      // 2. Get Commission Share configuration
      const share = await tx.commissionShare.findUnique({
        where: { schemeId_subServiceId: { schemeId: user.commissionSchemeId, subServiceId } }
      });
      if (!share) return { success: false, message: "No share configured for this sub-service in user's scheme" };

      // 3. Calculate amount based on commission type (1 = %, 2 = Flat)
      const calcAmount = (value) => share.commissionType === 1 ? (transactionAmount * value) / 100 : value;

      const distributions = {
        admin: calcAmount(share.admin),
        statePartner: calcAmount(share.statePartner),
        districtPartner: calcAmount(share.districtPartner),
        saathi: calcAmount(share.saathi),
        member: calcAmount(share.member),
        referral: transactionAmount >= share.referralMinAmount ? calcAmount(share.referral) : 0
      };

      // 4. Create TransactionLog
      const transactionLog = await tx.transactionLog.create({
        data: {
          id: generateUuid(),
          subServiceId,
          amount: transactionAmount,
          transactionDoneById: userId,
          status: "SUCCESS"
        }
      });

      // Helper function to distribute to a specific role's wallet
      const addCommission = async (targetUserId, amount, roleDesc) => {
        if (!targetUserId || amount <= 0) return;
        
        // Add to Commission History
        await tx.commissionHistory.create({
          data: {
            id: generateUuid(),
            userId: targetUserId,
            transactionId: transactionLog.id,
            amount,
            accountType: "commission"
          }
        });

        // Update Wallet Balance
        const wallet = await tx.wallet.findUnique({ where: { userId: targetUserId } });
        if (wallet) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: amount } }
          });
          
          await tx.walletTransaction.create({
            data: {
              id: generateUuid(),
              walletId: wallet.id,
              amount,
              type: "CREDIT",
              category: "COMMISSION",
              referenceId: transactionLog.id,
              description: `Commission earned for ${roleDesc} from transaction`,
              tenantId: user.tenantId
            }
          });
        }
      };

      // 5. Fetch upline (parents) from the user's hierarchy path
      const pathIds = user.path ? user.path.split('/').filter(id => id.length > 0) : [];
      const hierarchy = await tx.user.findMany({
        where: { id: { in: pathIds } },
        select: { id: true, identity: true }
      });

      const findRoleInUpline = (identity) => hierarchy.find(u => u.identity === identity)?.id;

      // 6. Execute distributions
      await Promise.all([
        addCommission(findRoleInUpline("STATE_PARTNER"), distributions.statePartner, "State Partner"),
        addCommission(findRoleInUpline("DISTRICT_PARTNER"), distributions.districtPartner, "District Partner"),
        addCommission(findRoleInUpline("SAATHI"), distributions.saathi, "Saathi"),
        addCommission(findRoleInUpline("MEMBER"), distributions.member, "Member"),
        addCommission(user.referredBy, distributions.referral, "Referral") // Direct referral
      ]);

      // 7. Admin Income Logic
      if (distributions.admin > 0) {
        await tx.adminIncome.create({
          data: {
            id: generateUuid(),
            transactionId: transactionLog.id,
            amount: distributions.admin,
            type: "credit"
          }
        });
        
        const adminWallet = await tx.wallet.findFirst({
          where: { tenantId: user.tenantId, isCorporate: true }
        });
        
        if (adminWallet) {
          await tx.wallet.update({
            where: { id: adminWallet.id },
            data: { balance: { increment: distributions.admin } }
          });
          await tx.walletTransaction.create({
            data: {
              id: generateUuid(),
              walletId: adminWallet.id,
              amount: distributions.admin,
              type: "CREDIT",
              category: "COMMISSION",
              referenceId: transactionLog.id,
              description: "Admin commission share",
              tenantId: user.tenantId
            }
          });
        }
      }

      return { success: true, message: "Commission processed and wallets updated successfully" };
    } catch (err) {
      console.error("Commission processing error:", err);
      return { success: false, message: "Error processing commission" };
    }
  }
};

module.exports = commissionService;
