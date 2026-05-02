const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.imeCustomer.findFirst({
    where: { mobileNumber: '9800000000' }
  });
  console.log('Customer:', JSON.stringify(customer, null, 2));
  
  const allCustomers = await prisma.imeCustomer.findMany({ take: 5 });
  console.log('Sample Customers:', JSON.stringify(allCustomers.map(c => c.mobileNumber), null, 2));
  
  process.exit(0);
}

main();
