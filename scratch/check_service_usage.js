const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsage() {
  try {
    console.log('--- IME Usage Stats ---');
    const imeLogs = await prisma.imeApiLog.groupBy({
      by: ['userId'],
      where: { success: true },
      _count: { _all: true }
    });

    for (const log of imeLogs) {
      if (!log.userId) continue;
      const user = await prisma.user.findUnique({
        where: { id: log.userId },
        select: { fullName: true, mobile: true, identity: true }
      });
      console.log(`User: ${user?.fullName || 'Unknown'} (${user?.mobile || 'N/A'}) - ${user?.identity} | Calls: ${log._count._all}`);
    }

    console.log('\n--- Prabhu Usage Stats ---');
    const prabhuLogs = await prisma.prabhuApiLog.groupBy({
      by: ['userId'],
      where: { success: true },
      _count: { _all: true }
    });

    for (const log of prabhuLogs) {
      if (!log.userId) continue;
      const user = await prisma.user.findUnique({
        where: { id: log.userId },
        select: { fullName: true, mobile: true, identity: true }
      });
      console.log(`User: ${user?.fullName || 'Unknown'} (${user?.mobile || 'N/A'}) - ${user?.identity} | Calls: ${log._count._all}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsage();
