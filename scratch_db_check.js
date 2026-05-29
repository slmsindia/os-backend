require('dotenv').config();
const prisma = require('./src/lib/prisma');
const { generateUuid } = require('./src/utils/id');

async function main() {
  const targetUserId = '868c5954-39ba-4b7f-8d19-e48a34c68614';
  const adminId = '868c5954-39ba-4b7f-8d19-e48a34c68614';
  
  const appData = {
    fullName: "kjdhwjk",
    mobile: "1098734567",
    gender: "MALE",
    dateOfBirth: new Date("2026-05-28T00:00:00.000Z"),
    address: "",
    maritalStatus: "SINGLE",
    citizenship: "Indian",
    isMigrantWorker: false,
    incomeAboveThreshold: false,
    membershipNumber: null,
    sector: "e47dd908-2d37-4d93-8e95-adb7357d2ce3",
    jobRole: "0db7bd65-1721-46bf-af3c-e5c8885b25d9",
    aadhaarNumber: null,
    panNumber: null,
    computerLiteracy: false,
    internetAvailability: false,
    pcLaptopAvailability: false,
    kycStatus: false,
    governmentSchemes: false,
    travelServices: false,
    bankingInsurance: false,
    jobServices: false,
    indoNepalServices: true,
    shopName: "gfdgdg",
    profilePhoto: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wgARCAKiBK8DASIAAhEBAxEB/8QAHAABAQACAwEBAAAAAAAAAAAAAAEGBwQFCAMC/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQAC...",
    addressesJson: [
      {
        address: "jkdbjdk",
        city: "984992ec-4714-4f07-bb25-fa6efc3bb236",
        districtId: "984992ec-4714-4f07-bb25-fa6efc3bb236",
        stateId: "8a457274-34b6-4358-ba12-b7607a8b4166",
        countryId: "792ab1a2-9b62-44aa-8b03-b8517440cf01",
        pinCode: "122211",
        municipality: "",
        addressType: "CURRENT"
      },
      {
        address: "jkdbjdk",
        city: "984992ec-4714-4f07-bb25-fa6efc3bb236",
        districtId: "984992ec-4714-4f07-bb25-fa6efc3bb236",
        stateId: "8a457274-34b6-4358-ba12-b7607a8b4166",
        countryId: "792ab1a2-9b62-44aa-8b03-b8517440cf01",
        pinCode: "122211",
        municipality: "",
        addressType: "PERMANENT"
      },
      {
        address: "qsds",
        city: "Rajkot",
        stateId: "8a457274-34b6-4358-ba12-b7607a8b4166",
        countryId: "792ab1a2-9b62-44aa-8b03-b8517440cf01",
        pinCode: "456889",
        addressType: "SHOP",
        districtId: "",
        municipality: ""
      }
    ],
    documentsJson: [
      {
        type: "AADHAAR",
        idNumber: "562363473",
        frontUrl: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wgARCAKiBK8DASIAAhEBAxEB/8QAHAABAQACAwEBAAAAAAAAAAAAAAEGBwQFCAMC/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQAC..."
      }
    ],
    createdById: adminId,
    paymentType: 'RAZORPAY',
    status: 'PAYMENT_PENDING'
  };

  try {
    await prisma.$transaction(async (tx) => {
      const { profilePhoto, ...cleanedAppData } = appData;
      const appResult = await tx.saathiApplication.create({
        data: {
          ...cleanedAppData,
          id: generateUuid(),
          userId: targetUserId,
          payment: {
            create: {
              id: generateUuid(),
              amount: 0,
              method: 'RAZORPAY',
              razorpayOrderId: null,
              status: 'PENDING',
              paidAt: null
            }
          }
        },
        include: { payment: true }
      });
      console.log("Success! Created application:", appResult.id);
    });
  } catch (err) {
    console.error("Prisma error details:");
    console.error(err);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
