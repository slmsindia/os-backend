const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { generateUuid } = require("../utils/id");
const { logAction } = require("../utils/audit");
const walletService = require("../services/wallet.service");

const saathiController = {
  /**
   * Get Saathi Fee
   */
  getSaathiFee: async (req, res) => {
    try {
      // In a real app, this would come from a GlobalSettings table.
      // For now, we will return a default or look for a setting.
      const setting = await prisma.globalSetting.findUnique({
        where: { key: 'SAATHI_FEE' }
      });

      res.json({
        success: true,
        data: {
          amount: setting ? parseFloat(setting.value) : 1000,
          currency: "INR"
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Error fetching fee" });
    }
  },

  /**
   * Apply for Saathi
   */
  applyForSaathi: async (req, res) => {
    const { user_id: userId, tenant_id: tenantId, identity: userIdentity } = req.user;
    const { fullName, mobile, gender, dateOfBirth, address, paymentMethod } = req.body;

    if (!fullName || !mobile || !paymentMethod) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
      // 1. Check if already Saathi
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user.identity === 'SAATHI') {
        return res.status(400).json({ success: false, message: "You are already a Saathi" });
      }

      // 2. Check for pending applications
      const existingApp = await prisma.saathiApplication.findFirst({
        where: { userId, status: 'PENDING' }
      });
      if (existingApp) {
        return res.status(400).json({ success: false, message: "You already have a pending application" });
      }

      // 3. Validate payment method based on identity
      if (userIdentity === 'USER' && paymentMethod !== 'RAZORPAY') {
        return res.status(400).json({ 
          success: false, 
          message: "Users can only apply using Razorpay" 
        });
      }

      const feeSetting = await prisma.globalSetting.findUnique({ where: { key: 'SAATHI_FEE' } });
      const amount = feeSetting ? parseFloat(feeSetting.value) : 1000;

      // 4. Handle Wallet Payment
      if (paymentMethod === 'WALLET') {
        const wallet = await walletService.resolveWallet(userId, tenantId, userIdentity);
        if (!wallet || wallet.balance < amount) {
          return res.status(400).json({ success: false, message: "Insufficient wallet balance. Use Razorpay instead." });
        }

        // Deduct from resolved wallet
        await walletService.updateBalance(wallet.id, -amount);
      }

      // 5. Create Application
      const application = await prisma.saathiApplication.create({
        data: {
          id: generateUuid(),
          userId,
          fullName,
          mobile,
          gender,
          dateOfBirth: new Date(dateOfBirth),
          address,
          createdById: userId, // Self application
          paymentType: paymentMethod,
          status: 'PENDING',
          payment: {
            create: {
              id: generateUuid(),
              amount,
              method: paymentMethod,
              status: paymentMethod === 'WALLET' ? 'SUCCESS' : 'PENDING',
              paidAt: paymentMethod === 'WALLET' ? new Date() : null
            }
          }
        },
        include: { payment: true }
      });

      await logAction({
        userId,
        action: "SAATHI_APPLICATION_SUBMITTED",
        targetId: application.id,
        tenantId
      });

      res.status(201).json({
        success: true,
        message: paymentMethod === 'WALLET' ? "Application submitted successfully" : "Proceed to payment",
        data: {
          applicationId: application.id,
          payment: application.payment
        }
      });

    } catch (err) {
      console.error("Saathi Application Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = saathiController;
