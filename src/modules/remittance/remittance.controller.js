const remittanceService = require('./remittance.service');

class RemittanceController {
    // Send Prabhu Transaction - Save to database
    async sendPrabhuTransaction(req, res) {
        try {
            const transactionData = req.body;
            const result = await remittanceService.savePrabhuTransaction(transactionData);
            
            res.status(201).json({
                success: true,
                message: 'Prabhu transaction saved successfully',
                data: result
            });
        } catch (error) {
            console.error('Error saving Prabhu transaction:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save Prabhu transaction',
                error: error.message
            });
        }
    }

    // Get Prabhu Transactions by user ID
    async getPrabhuTransactions(req, res) {
        try {
            const { userId } = req.params;
            const transactions = await remittanceService.getPrabhuTransactionsByUserId(userId);
            
            res.status(200).json({
                success: true,
                message: 'Prabhu transactions retrieved successfully',
                data: transactions
            });
        } catch (error) {
            console.error('Error fetching Prabhu transactions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch Prabhu transactions',
                error: error.message
            });
        }
    }

    // Get all transactions
    async getTransactions(req, res) {
        try {
            const transactions = await remittanceService.getAllTransactions();
            
            res.status(200).json({
                success: true,
                message: 'Transactions retrieved successfully',
                data: transactions
            });
        } catch (error) {
            console.error('Error fetching transactions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch transactions',
                error: error.message
            });
        }
    }

    // Get transaction by PIN number
    async getTransactionByPinNo(req, res) {
        try {
            const { pinNo } = req.query;
            const transaction = await remittanceService.getTransactionByPinNo(pinNo);
            
            res.status(200).json({
                success: true,
                message: 'Transaction retrieved successfully',
                data: transaction
            });
        } catch (error) {
            console.error('Error fetching transaction by PIN:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch transaction',
                error: error.message
            });
        }
    }
}

module.exports = new RemittanceController();
