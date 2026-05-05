const prisma = require("../lib/prisma");
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

      let feeData = { amount: 1000, currency: "INR" };
      if (setting && setting.value) {
        try {
          const parsed = JSON.parse(setting.value);
          feeData = { ...parsed, currency: "INR" };
        } catch (e) {
          feeData = { amount: parseFloat(setting.value), currency: "INR" };
        }
      }

      res.json({
        success: true,
        data: feeData
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
      // 3. Validate payment method based on identity
      if (userIdentity === 'USER' && paymentMethod !== 'RAZORPAY') {
        return res.status(400).json({ 
          success: false, 
          message: "Users can only apply using Razorpay" 
        });
      }

      const feeSetting = await prisma.globalSetting.findUnique({ where: { key: 'SAATHI_FEE' } });
      let amount = 1000;
      if (feeSetting && feeSetting.value) {
        try {
          const parsed = JSON.parse(feeSetting.value);
          amount = parsed.amount || 1000;
        } catch (e) {
          amount = parseFloat(feeSetting.value);
        }
      }

      // 4 & 5. Create Application and Handle Payment in Transaction
      const application = await prisma.$transaction(async (tx) => {
        // Check for existing pending application
        const existing = await tx.saathiApplication.findFirst({
          where: { userId, status: 'PENDING' },
          include: { payment: true }
        });

        let app;
        if (existing && existing.payment?.status === 'PENDING') {
          // Update existing
          app = await tx.saathiApplication.update({
            where: { id: existing.id },
            data: {
              fullName,
              mobile,
              gender,
              dateOfBirth: new Date(dateOfBirth),
              address,
              paymentType: paymentMethod
            },
            include: { payment: true }
          });

          // Update or recreate payment
          await tx.saathiPayment.update({
            where: { id: existing.payment.id },
            data: {
              amount,
              method: paymentMethod,
              status: paymentMethod === 'WALLET' ? 'SUCCESS' : 'PENDING',
              paidAt: paymentMethod === 'WALLET' ? new Date() : null
            }
          });
        } else {
          // Create Application first to get ID
          app = await tx.saathiApplication.create({
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
        }

        // If Wallet, deduct now
        if (paymentMethod === 'WALLET') {
          const wallet = await walletService.resolveWallet(userId, tenantId, userIdentity);
          if (!wallet || wallet.balance < amount) {
            throw new Error("Insufficient wallet balance. Use Razorpay instead.");
          }

          const adminWallet = await tx.wallet.findFirst({ where: { tenantId, isCorporate: true } });
          if (!adminWallet) throw new Error("Admin wallet not found");

          // Deduct from user and credit to admin
          await walletService.payCreationFeeWithHistory(
            wallet.id,
            adminWallet.id,
            amount,
            `Saathi Application Fee for ${fullName}`,
            app.id,
            tenantId,
            'WALLET',
            tx
          );
        }

        return app;
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
