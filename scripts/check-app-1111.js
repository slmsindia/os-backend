const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkApp() {
  try {
    const mobile = "1111111111";
    const app = await prisma.saathiApplication.findFirst({
      where: { mobile },
      include: { payment: true }
    });
    console.log("--- Saathi Application ---");
    console.log(app);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkApp();
