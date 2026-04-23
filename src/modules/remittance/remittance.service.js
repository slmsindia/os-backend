const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class RemittanceService {
    // Save Prabhu Transaction to database
    async savePrabhuTransaction(transactionData) {
        try {
            // Extract relevant fields from the transaction data
            const {
                customerId,
                senderName,
                senderMobile,
                receiverId,
                receiverName,
                receiverMobile,
                sendCountry,
                payoutCountry,
                paymentMode,
                transferAmount,
                sendAmount,
                sendCurrency,
                payAmount,
                payCurrency,
                exchangeRate,
                serviceCharge,
                collectedAmount,
                accountNumber,
                partnerPinNo,
                remittanceReason,
                SourceOfFund,
                cspCode,
                otpProcessId,
                otp,
                bankCode,
                bankBranchId,
                transactionId,
                pinNo,
                responseCode,
                responseMessage,
                transactionStatus,
                createdAt
            } = transactionData;

            // Create transaction record in database
            const transaction = await prisma.prabhuTransaction.create({
                data: {
                    customerId: customerId || null,
                    senderName: senderName || '',
                    senderMobile: senderMobile || '',
                    receiverId: receiverId || '',
                    receiverName: receiverName || '',
                    receiverMobile: receiverMobile || '',
                    sendCountry: sendCountry || 'India',
                    payoutCountry: payoutCountry || 'Nepal',
                    paymentMode: paymentMode || '',
                    transferAmount: transferAmount || '0',
                    sendAmount: sendAmount || '0',
                    sendCurrency: sendCurrency || 'INR',
                    payAmount: payAmount || '0',
                    payCurrency: payCurrency || 'NPR',
                    exchangeRate: exchangeRate || '1.6',
                    serviceCharge: serviceCharge || '0',
                    collectedAmount: collectedAmount || '0',
                    accountNumber: accountNumber || '',
                    partnerPinNo: partnerPinNo || '',
                    remittanceReason: remittanceReason || '',
                    sourceOfFund: SourceOfFund || '',
                    cspCode: cspCode || '',
                    otpProcessId: otpProcessId || '',
                    otp: otp || '',
                    bankCode: bankCode || '',
                    bankBranchId: bankBranchId || '',
                    transactionId: transactionId || null,
                    pinNo: pinNo || '',
                    responseCode: responseCode || '000',
                    responseMessage: responseMessage || 'Success',
                    transactionStatus: transactionStatus || 'Success',
                    createdAt: createdAt ? new Date(createdAt) : new Date()
                }
            });

            console.log('Prabhu transaction saved successfully:', transaction);
            return transaction;
        } catch (error) {
            console.error('Error saving Prabhu transaction to database:', error);
            throw error;
        }
    }

    // Get Prabhu Transactions by user ID
    async getPrabhuTransactionsByUserId(userId) {
        try {
            const transactions = await prisma.prabhuTransaction.findMany({
                where: {
                    customerId: userId
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return transactions;
        } catch (error) {
            console.error('Error fetching Prabhu transactions:', error);
            throw error;
        }
    }

    // Get all transactions
    async getAllTransactions() {
        try {
            const transactions = await prisma.prabhuTransaction.findMany({
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return transactions;
        } catch (error) {
            console.error('Error fetching all transactions:', error);
            throw error;
        }
    }

    // Get transaction by PIN number
    async getTransactionByPinNo(pinNo) {
        try {
            const transaction = await prisma.prabhuTransaction.findFirst({
                where: {
                    pinNo: pinNo
                }
            });

            return transaction;
        } catch (error) {
            console.error('Error fetching transaction by PIN:', error);
            throw error;
        }
    }
}

module.exports = new RemittanceService();
