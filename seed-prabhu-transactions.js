const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedPrabhuTransactions() {
  try {
    console.log('Starting to seed PrabhuTransaction data...');

    // Sample transaction data
    const sampleTransactions = [
      {
        customerId: "1108405",
        senderName: "Ram Bahadur",
        senderMobile: "7041897207",
        receiverId: "3779896",
        receiverName: "Hemraj Thapa",
        receiverMobile: "9841234567",
        sendCountry: "India",
        payoutCountry: "Nepal",
        paymentMode: "Cash Payment",
        transferAmount: "700",
        sendAmount: "700",
        sendCurrency: "INR",
        payAmount: "1120",
        payCurrency: "NPR",
        exchangeRate: "1.6",
        serviceCharge: "200",
        collectedAmount: "900",
        accountNumber: "",
        partnerPinNo: "PARTNER123",
        remittanceReason: "6",
        sourceOfFund: "10",
        cspCode: "SHUBHPMT",
        otpProcessId: "ff16cb3b-3611-4907-8d6b-9766add460c3",
        otp: "958103",
        bankCode: "",
        bankBranchId: "",
        transactionId: null,
        pinNo: "1111260282751950",
        responseCode: "000",
        responseMessage: "Success",
        transactionStatus: "Success",
        createdAt: new Date("2026-04-21T09:30:00.000Z")
      },
      {
        customerId: "1108405",
        senderName: "Ram Bahadur",
        senderMobile: "7041897207",
        receiverId: "3779897",
        receiverName: "Sita Sharma",
        receiverMobile: "9845678901",
        sendCountry: "India",
        payoutCountry: "Nepal",
        paymentMode: "Bank",
        transferAmount: "1000",
        sendAmount: "1000",
        sendCurrency: "INR",
        payAmount: "1600",
        payCurrency: "NPR",
        exchangeRate: "1.6",
        serviceCharge: "150",
        collectedAmount: "1150",
        accountNumber: "1234567890",
        partnerPinNo: "PARTNER456",
        remittanceReason: "3",
        sourceOfFund: "8",
        cspCode: "SHUBHPMT",
        otpProcessId: "ff16cb3b-3611-4907-8d6b-9766add460c4",
        otp: "123456",
        bankCode: "NABIL",
        bankBranchId: "123",
        transactionId: null,
        pinNo: "1111260282751951",
        responseCode: "000",
        responseMessage: "Success",
        transactionStatus: "Success",
        createdAt: new Date("2026-04-20T14:15:00.000Z")
      },
      {
        customerId: "1108414",
        senderName: "Shyam Kumar",
        senderMobile: "6354156798",
        receiverId: "3779898",
        receiverName: "Gopal Singh",
        receiverMobile: "9842345678",
        sendCountry: "India",
        payoutCountry: "Nepal",
        paymentMode: "Cash Payment",
        transferAmount: "500",
        sendAmount: "500",
        sendCurrency: "INR",
        payAmount: "800",
        payCurrency: "NPR",
        exchangeRate: "1.6",
        serviceCharge: "100",
        collectedAmount: "600",
        accountNumber: "",
        partnerPinNo: "PARTNER789",
        remittanceReason: "2",
        sourceOfFund: "5",
        cspCode: "SHUBHPMT",
        otpProcessId: "ff16cb3b-3611-4907-8d6b-9766add460c5",
        otp: "789012",
        bankCode: "",
        bankBranchId: "",
        transactionId: null,
        pinNo: "1111260282751952",
        responseCode: "000",
        responseMessage: "Success",
        transactionStatus: "Success",
        createdAt: new Date("2026-04-19T11:45:00.000Z")
      },
      {
        customerId: "1108420",
        senderName: "Ramesh Prasad",
        senderMobile: "9876543210",
        receiverId: "3779899",
        receiverName: "Laxmi Devi",
        receiverMobile: "9843456789",
        sendCountry: "India",
        payoutCountry: "Nepal",
        paymentMode: "Bank",
        transferAmount: "2000",
        sendAmount: "2000",
        sendCurrency: "INR",
        payAmount: "3200",
        payCurrency: "NPR",
        exchangeRate: "1.6",
        serviceCharge: "250",
        collectedAmount: "2250",
        accountNumber: "0987654321",
        partnerPinNo: "PARTNER101",
        remittanceReason: "1",
        sourceOfFund: "7",
        cspCode: "SHUBHPMT",
        otpProcessId: "ff16cb3b-3611-4907-8d6b-9766add460c6",
        otp: "345678",
        bankCode: "EBL",
        bankBranchId: "456",
        transactionId: null,
        pinNo: "1111260282751953",
        responseCode: "000",
        responseMessage: "Success",
        transactionStatus: "Success",
        createdAt: new Date("2026-04-18T16:20:00.000Z")
      },
      {
        customerId: "1108405",
        senderName: "Ram Bahadur",
        senderMobile: "7041897207",
        receiverId: "3779900",
        receiverName: "Kiran Thapa",
        receiverMobile: "9844567890",
        sendCountry: "India",
        payoutCountry: "Nepal",
        paymentMode: "Cash Payment",
        transferAmount: "1500",
        sendAmount: "1500",
        sendCurrency: "INR",
        payAmount: "2400",
        payCurrency: "NPR",
        exchangeRate: "1.6",
        serviceCharge: "200",
        collectedAmount: "1700",
        accountNumber: "",
        partnerPinNo: "PARTNER202",
        remittanceReason: "4",
        sourceOfFund: "9",
        cspCode: "SHUBHPMT",
        otpProcessId: "ff16cb3b-3611-4907-8d6b-9766add460c7",
        otp: "567890",
        bankCode: "",
        bankBranchId: "",
        transactionId: null,
        pinNo: "1111260282751954",
        responseCode: "000",
        responseMessage: "Success",
        transactionStatus: "Success",
        createdAt: new Date("2026-04-17T10:30:00.000Z")
      }
    ];

    // Insert sample transactions
    for (const transaction of sampleTransactions) {
      await prisma.prabhuTransaction.create({
        data: transaction
      });
      console.log(`✅ Inserted transaction for ${transaction.receiverName} - PIN: ${transaction.pinNo}`);
    }

    console.log(`\n🎉 Successfully seeded ${sampleTransactions.length} PrabhuTransaction records!`);
    
    // Verify the data was inserted
    const count = await prisma.prabhuTransaction.count();
    console.log(`📊 Total PrabhuTransaction records in database: ${count}`);

  } catch (error) {
    console.error('❌ Error seeding PrabhuTransaction data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedPrabhuTransactions();
