const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const walletService = require('../src/services/wallet.service');

async function testCommissionFlow() {
    console.log("Starting Commission Flow Mock Test...");

    try {
        // 1. Setup Mock Data
        const tenantId = (await prisma.tenant.findFirst())?.id;
        if (!tenantId) throw new Error("No tenant found in DB");

        const adminUser = await prisma.user.findFirst({
            where: { tenantId, identity: 'WHITE_LABEL_ADMIN' }
        });
        if (!adminUser) throw new Error("No White Label Admin found");

        const saathiUser = await prisma.user.findFirst({
            where: { tenantId, identity: 'SAATHI' }
        });
        if (!saathiUser) throw new Error("No Saathi user found");

        console.log(`Using Tenant: ${tenantId}`);
        console.log(`Using Admin: ${adminUser.fullName} (${adminUser.id})`);
        console.log(`Using Saathi: ${saathiUser.fullName} (${saathiUser.id})`);

        // 2. Ensure Service Fee Config exists for PRABHU
        let feeConfig = await prisma.serviceFeeConfig.findFirst({
            where: { serviceType: 'PRABHU', tenantId }
        });

        if (!feeConfig) {
            console.log("Creating mock ServiceFeeConfig for PRABHU (Amount: 50)");
            feeConfig = await prisma.serviceFeeConfig.create({
                data: {
                    id: 'mock-fee-config',
                    serviceType: 'PRABHU',
                    amount: 50,
                    effectiveFrom: new Date(),
                    tenantId
                }
            });
        } else {
            console.log(`Existing Fee Config found: ₹${feeConfig.amount}`);
        }

        // 3. Ensure Commission Sub-Service exists
        let subService = await prisma.commissionSubService.findUnique({
            where: { slug: 'prabhu_transfer' }
        });

        if (!subService) {
            console.log("Creating mock CommissionSubService for prabhu_transfer");
            const mainService = await prisma.commissionService.findFirst() || await prisma.commissionService.create({ data: { name: 'Remittance' } });
            subService = await prisma.commissionSubService.create({
                data: {
                    id: 'mock-sub-service',
                    name: 'Prabhu Transfer',
                    slug: 'prabhu_transfer',
                    serviceId: mainService.id
                }
            });
        }

        // 4. Capture Initial Balances
        const adminWallet = await walletService.resolveWallet(adminUser.id, tenantId, adminUser.identity);
        const saathiWallet = await prisma.wallet.findUnique({ where: { userId: saathiUser.id } });

        console.log(`Initial Admin Balance: ₹${adminWallet.balance}`);
        console.log(`Initial Saathi Balance: ₹${saathiWallet?.balance || 0}`);

        // 5. Simulate Transaction
        console.log("\n--- SIMULATING PRABHU TRANSACTION ---");
        const refId = "TEST-REF-" + Date.now();
        await walletService.processServiceCommission('PRABHU', tenantId, refId, saathiUser.id);

        // 6. Capture Final Balances
        const adminWalletFinal = await prisma.wallet.findUnique({ where: { id: adminWallet.id } });
        const saathiWalletFinal = await prisma.wallet.findUnique({ where: { userId: saathiUser.id } });

        console.log(`Final Admin Balance: ₹${adminWalletFinal.balance} (Delta: +${adminWalletFinal.balance - adminWallet.balance})`);
        console.log(`Final Saathi Balance: ₹${saathiWalletFinal.balance} (Delta: +${saathiWalletFinal.balance - (saathiWallet?.balance || 0)})`);

        if (adminWalletFinal.balance > adminWallet.balance) {
            console.log("\n✅ SUCCESS: Admin wallet credited correctly.");
        } else {
            console.log("\n❌ FAILURE: Admin wallet was not credited.");
        }

        if (saathiWalletFinal.balance > (saathiWallet?.balance || 0)) {
            console.log("✅ SUCCESS: Saathi (hierarchy) received commission.");
        } else {
            console.log("ℹ️ INFO: Saathi balance did not increase. This is expected if no Commission Scheme is assigned or shares are 0.");
        }

    } catch (error) {
        console.error("Test failed with error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

testCommissionFlow();
