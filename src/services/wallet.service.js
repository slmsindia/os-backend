const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const walletService = {
  /**
   * Create a new wallet for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created wallet
   */
  createWallet: async (userId) => {
    try {
      const wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0.0,
          currency: "INR",
          isActive: true
        }
      });
      return wallet;
    } catch (err) {
      console.error("Error creating wallet:", err);
      throw err;
    }
  },

  /**
   * Get wallet by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Wallet object or null
   */
  getWalletByUserId: async (userId) => {
    try {
      const wallet = await prisma.wallet.findUnique({
        where: { userId },
        include: {
          topUpRequests: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              bankDetails: {
                select: {
                  id: true,
                  bankName: true,
                  accountNumber: true
                }
              }
            }
          }
        }
      });
      return wallet;
    } catch (err) {
      console.error("Error getting wallet:", err);
      throw err;
    }
  },

  /**
   * Update wallet balance
   * @param {string} walletId - Wallet ID
   * @param {number} amount - Amount to add (can be negative for deduction)
   * @returns {Promise<Object>} Updated wallet
   */
  updateBalance: async (walletId, amount) => {
    try {
      const wallet = await prisma.wallet.update({
        where: { id: walletId },
        data: {
          balance: {
            increment: amount
          }
        }
      });
      return wallet;
    } catch (err) {
      console.error("Error updating wallet balance:", err);
      throw err;
    }
  },

  /**
   * Check if UTR number already exists in approved requests
   * @param {string} utrNumber - UTR number to check
   * @returns {Promise<boolean>} True if UTR exists in approved requests
   */
  checkUtrExists: async (utrNumber) => {
    try {
      const existingRequest = await prisma.walletTopUpRequest.findFirst({
        where: {
          utrNumber,
          status: "APPROVED"
        }
      });
      return !!existingRequest;
    } catch (err) {
      console.error("Error checking UTR:", err);
      throw err;
    }
  },

  /**
   * Get wallet by ID
   * @param {string} walletId - Wallet ID
   * @returns {Promise<Object|null>} Wallet object or null
   */
  getWalletById: async (walletId) => {
    try {
      const wallet = await prisma.wallet.findUnique({
        where: { id: walletId }
      });
      return wallet;
    } catch (err) {
      console.error("Error getting wallet by ID:", err);
      throw err;
    }
  }
};

module.exports = walletService;
