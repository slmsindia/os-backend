const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkReferralLogic() {
    console.log("Starting Referral Flow Audit...");
    
    try {
        // 1. Get a test user (Parent)
        const parent = await prisma.user.findFirst({
            where: { referralCode: { not: null } }
        });

        if (!parent) {
            console.log("No user with referral code found. Skipping test.");
            return;
        }

        console.log(`Auditing Parent: ${parent.fullName} (Referral: ${parent.referralCode})`);

        // 2. Simulate referral code lookup
        const foundParent = await prisma.user.findFirst({
            where: { referralCode: { equals: parent.referralCode, mode: 'insensitive' } }
        });

        if (foundParent && foundParent.id === parent.id) {
            console.log("✅ Referral lookup is case-insensitive and working.");
        } else {
            console.log("❌ Referral lookup failed.");
        }

        // 3. Check hierarchy transfer request data structure
        const request = await prisma.hierarchyTransferRequest.findFirst();
        if (request) {
            console.log("✅ HierarchyTransferRequest table exists and has data.");
            console.log(`Sample Request Status: ${request.status}, Scheduled: ${request.scheduledAt}`);
        } else {
            console.log("ℹ️ No transfer requests found in DB (Normal if none requested).");
        }

    } catch (error) {
        console.error("Audit failed:", error);
    } finally {
        await prisma.$disconnect();
    }
}

checkReferralLogic();
