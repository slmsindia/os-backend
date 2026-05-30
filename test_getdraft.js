const draftController = require('./src/controllers/draft.controller');
const prisma = require('./src/lib/prisma');

async function test() {
  const req = {
    user: {
      user_id: 'd4dc03aa-a2a9-4815-98c5-9e1388f52589',
      tenant_id: '469b4f78-1672-4902-a0d6-9f4f2284baa4' // From the task log
    },
    params: {
      type: 'MEMBERSHIP_APPLICATION',
      mobile: '6664442220'
    }
  };

  const res = {
    status: function(s) {
      console.log('Status:', s);
      return this;
    },
    json: function(data) {
      console.log('JSON:', data);
      return this;
    }
  };

  await draftController.getDraft(req, res);
}

test().catch(console.error).finally(() => prisma.$disconnect());
