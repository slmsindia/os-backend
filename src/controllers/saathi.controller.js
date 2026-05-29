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
      const { tenant_id: tenantId } = req.user;
      const setting = await prisma.globalSetting.findFirst({
        where: { key: 'SAATHI_FEE', tenantId }
      });

      let feeData = { amount: 1000, currency: "INR" };
      if (setting && setting.value) {
        try {
          const parsed = JSON.parse(setting.value);
          feeData = { ...parsed, currency: "INR" };
          // Support both names for frontend consistency
          if (feeData.serviceCharges) {
            feeData.serviceCharge = feeData.serviceCharges;
          }
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

      const feeSetting = await prisma.globalSetting.findFirst({ 
        where: { key: 'SAATHI_FEE', tenantId } 
      });
      let amount = 1000;
      if (feeSetting && feeSetting.value) {
        try {
          const parsed = JSON.parse(feeSetting.value);
<<<<<<< HEAD
          amount = parsed.amount || 1000;
=======
          amount = parsed.amount !== undefined ? parsed.amount : 1000;
>>>>>>> origin/main
        } catch (e) {
          amount = parseFloat(feeSetting.value);
        }
      }

      // 4 & 5. Create Application and Handle Payment
      // Check for existing application to avoid duplicates or allow resubmission
      const existing = await prisma.saathiApplication.findFirst({
        where: { userId },
        include: { payment: true },
        orderBy: { createdAt: 'desc' }
      });

      // BLOCK if already APPROVED
      if (existing && existing.status === 'APPROVED') {
        return res.status(400).json({ success: false, message: "You are already a SAATHI." });
      }

      // Check if it's a paid resubmission
      const isPaidResubmission = existing && 
                                existing.status === 'REJECTED' && 
                                (existing.payment?.status === 'SUCCESS' || existing.payment?.status === 'PAID');

      let finalPaymentMethod = paymentMethod;
      let razorpayOrder = null;

      // Check wallet balance if method is WALLET
      if (finalPaymentMethod === 'WALLET' && !isPaidResubmission) {
        const wallet = await walletService.resolveWallet(userId, tenantId, userIdentity);
        if (!wallet || wallet.balance < amount) {
          // Automatic fallback to Razorpay
          console.log(`[SaathiApply] Insufficient wallet balance for user ${userId}. Falling back to Razorpay.`);
          finalPaymentMethod = 'RAZORPAY';
        }
      }

      // Create Razorpay Order if needed (OUTSIDE transaction)
      if (finalPaymentMethod === 'RAZORPAY' && !isPaidResubmission) {
        const razorpayService = require("../services/razorpay.service");
        try {
          razorpayOrder = await razorpayService.createOrder(
            tenantId, 
            amount, 
            "INR", 
            `saathi_apply_${userId.slice(0, 8)}`
          );
        } catch (err) {
          console.error("Razorpay Order Error:", err);
          return res.status(500).json({ success: false, message: "Failed to initiate Razorpay payment. Please try again." });
        }
      }

      const application = await prisma.$transaction(async (tx) => {
        let app;
        // Logic for Resubmission or Updating Pending
        if (existing && (existing.status === 'PENDING' || isPaidResubmission)) {
          app = await tx.saathiApplication.update({
            where: { id: existing.id },
            data: {
              fullName,
              mobile,
              gender,
              dateOfBirth: new Date(dateOfBirth),
              address,
              paymentType: finalPaymentMethod,
              status: 'PENDING', // Reset status if it was REJECTED
              rejectionReason: null
            },
            include: { payment: true }
          });

          // Update or recreate payment
          if (!isPaidResubmission) {
            await tx.saathiPayment.update({
              where: { id: existing.payment.id },
              data: {
                amount,
                method: finalPaymentMethod,
                razorpayOrderId: razorpayOrder?.id || null,
                status: finalPaymentMethod === 'WALLET' ? 'SUCCESS' : 'PENDING',
                paidAt: finalPaymentMethod === 'WALLET' ? new Date() : null
              }
            });
          }
        } else {
          // Create New Application
          app = await tx.saathiApplication.create({
            data: {
              id: generateUuid(),
              userId,
              fullName,
              mobile,
              gender,
              dateOfBirth: new Date(dateOfBirth),
              address,
              createdById: userId,
              paymentType: finalPaymentMethod,
              status: 'PENDING',
              payment: {
                create: {
                  id: generateUuid(),
                  amount,
                  method: finalPaymentMethod,
                  razorpayOrderId: razorpayOrder?.id || null,
                  status: finalPaymentMethod === 'WALLET' ? 'SUCCESS' : 'PENDING',
                  paidAt: finalPaymentMethod === 'WALLET' ? new Date() : null
                }
              }
            },
            include: { payment: true }
          });
        }

        // If WALLET and not resubmission, deduct now but don't credit admin immediately
        if (finalPaymentMethod === 'WALLET' && !isPaidResubmission) {
          const userWallet = await walletService.resolveWallet(userId, tenantId, userIdentity);
          const adminWallet = await tx.wallet.findFirst({ where: { tenantId, isCorporate: true } });
          
          if (!adminWallet) throw new Error("Admin wallet configuration missing.");

          await walletService.payCreationFeeWithHistory(
            userWallet.id,
            adminWallet.id,
            amount,
            `Saathi Application Fee for ${fullName}`,
            app.id,
            tenantId,
            'WALLET',
            tx,
            false // creditAdminImmediately = false (Wait for approval)
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
        message: isPaidResubmission 
          ? "Application resubmitted successfully." 
          : (finalPaymentMethod === 'WALLET' ? "Application submitted successfully" : "Proceed to payment"),
        data: {
          applicationId: application.id,
          payment: application.payment,
          razorpayOrder: razorpayOrder ? {
            ...razorpayOrder,
            key: await require("../services/razorpay.service").getKeyId(tenantId)
          } : null
        }
      });

    } catch (err) {
      console.error("Saathi Application Error:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
};

module.exports = saathiController;
