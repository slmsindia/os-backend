const prisma = require('./src/lib/prisma');

async function test() {
  const query = {
    userId_formType_targetMobile_tenantId: {
      userId: 'd4dc03aa-a2a9-4815-98c5-9e1388f52589',
      formType: 'MEMBERSHIP_APPLICATION',
      targetMobile: '6664442220',
      tenantId: '469b4f78-1672-4902-a0d6-9f4f2284baa4'
    }
  };

  const draft = await prisma.formDraft.findUnique({ where: query });
  console.log('Draft findUnique:', !!draft);
}

test().catch(console.error).finally(() => prisma.$disconnect());
