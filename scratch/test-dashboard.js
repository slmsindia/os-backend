const prisma = require("../src/lib/prisma");

async function test() {
  try {
    const user = await prisma.user.findFirst({
      select: { tenantId: true }
    });
    const tenantId = user?.tenantId;
    if (!tenantId) {
      console.log("No tenant found.");
      return;
    }
    console.log("Testing stats for tenantId:", tenantId);

    const [userStats, appStats, corporateWallet, totalWalletAggregate, appGroups] = await Promise.all([
      prisma.user.groupBy({
        by: ["identity"],
        where: { tenantId },
        _count: { id: true },
      }),
      Promise.all([
        prisma.membershipApplication.groupBy({
          by: ["status"],
          where: { user: { tenantId } },
          _count: { id: true },
        }),
        prisma.saathiApplication.groupBy({
          by: ["status"],
          where: { user: { tenantId } },
          _count: { id: true },
        }),
        prisma.businessPartnerApplication.groupBy({
          by: ["status"],
          where: { user: { tenantId } },
          _count: { id: true },
        }),
      ]).then(([membership, saathi, business]) => {
        const format = (data) => {
          const res = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
          data.forEach((d) => {
            res[d.status] = d._count.id;
          });
          return res;
        };
        return {
          membership: format(membership),
          saathi: format(saathi),
          business: format(business),
        };
      }),
      prisma.wallet.findFirst({ where: { tenantId, isCorporate: true } }),
      prisma.wallet.aggregate({
        where: { tenantId },
        _sum: { balance: true }
      }),
      prisma.application.groupBy({
        by: ['targetIdentity'],
        where: {
          tenantId,
          status: 'APPROVED',
          paymentStatus: 'SUCCESS',
          paymentAmount: { gt: 0 }
        },
        _count: { id: true }
      })
    ]);

    const totalWalletBalance = totalWalletAggregate._sum.balance || 0;

    let totalIncome = 0;
    let totalExpense = 0;
    if (corporateWallet) {
      const [incomeAggregate, expenseAggregate] = await Promise.all([
        prisma.walletTransaction.aggregate({
          where: { walletId: corporateWallet.id, type: 'CREDIT', status: 'SUCCESS' },
          _sum: { amount: true }
        }),
        prisma.walletTransaction.aggregate({
          where: { walletId: corporateWallet.id, type: 'DEBIT', status: 'SUCCESS' },
          _sum: { amount: true }
        })
      ]);
      totalIncome = incomeAggregate._sum.amount || 0;
      totalExpense = expenseAggregate._sum.amount || 0;
    }

    // Pre-fetch configs to resolve fee structures
    const [membershipConfig, saathiSetting, businessSetting] = await Promise.all([
      prisma.membershipConfig.findFirst({ where: { isActive: true, tenantId }, orderBy: { createdAt: 'desc' } }),
      prisma.globalSetting.findFirst({ where: { key: 'SAATHI_FEE', tenantId } }),
      prisma.globalSetting.findFirst({ where: { key: 'BUSINESS_PARTNER_FEE', tenantId } })
    ]);

    const configs = {};

    if (membershipConfig) {
      configs['MEMBER'] = {
        gst: membershipConfig.gst || 0,
        includedExcluded: membershipConfig.includedExcluded || false,
        serviceCharge: membershipConfig.serviceCharges || 0
      };
    }

    if (saathiSetting?.value) {
      try {
        const parsed = JSON.parse(saathiSetting.value);
        configs['SAATHI'] = {
          gst: parsed.gst || 0,
          includedExcluded: parsed.includedExcluded || false,
          serviceCharge: parsed.serviceCharge || 0
        };
      } catch {}
    }

    if (businessSetting?.value) {
      try {
        const parsed = JSON.parse(businessSetting.value);
        configs['BUSINESS_USER'] = {
          gst: parsed.gst || 0,
          includedExcluded: parsed.includedExcluded || false,
          serviceCharge: parsed.serviceCharges || parsed.serviceCharge || 0
        };
        configs['BUSINESS_PARTNER'] = configs['BUSINESS_USER'];
      } catch {}
    }

    let gstIncluding = 0;
    let gstExcluding = 0;

    for (const group of appGroups) {
      const targetIdentity = group.targetIdentity;
      const count = group._count.id || 0;
      const config = configs[targetIdentity];

      if (config && config.gst > 0 && count > 0) {
        const sc = config.serviceCharge || 0;
        const gstPercent = config.gst;
        if (config.includedExcluded) {
          // Inclusive
          const gstAmountPerApp = sc * (gstPercent / (100 + gstPercent));
          gstIncluding += gstAmountPerApp * count;
        } else {
          // Exclusive
          const gstAmountPerApp = sc * (gstPercent / 100);
          gstExcluding += gstAmountPerApp * count;
        }
      }
    }

    const totalGst = gstIncluding + gstExcluding;

    console.log("Success! Computed fields:", {
      totalWalletBalance,
      totalIncome,
      totalExpense,
      gst: totalGst
    });

  } catch (err) {
    console.error("CRITICAL ERROR DURING DB QUERIES:", err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
