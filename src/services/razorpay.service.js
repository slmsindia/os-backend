const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in .env. Razorpay features will be disabled.');
      this.instance = null;
    } else {
      this.instance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }
  }

  /**
   * Create a Razorpay order
   * @param {number} amount - Amount in rupees
   * @param {string} currency - Currency code (default: INR)
   * @param {string} receipt - Receipt ID for tracking
   * @returns {Promise<object>} - Razorpay order object
   */
  async createOrder(amount, currency = 'INR', receipt) {
    if (!this.instance) {
      throw new Error('Razorpay service is not initialized. Please check your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    }
    try {
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        payment_capture: 1, // Auto-capture payment
      };

      const order = await this.instance.orders.create(options);
      return order;
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      throw error;
    }
  }

  /**
   * Verify payment signature
   * @param {object} params - Payment verification params
   * @param {string} params.razorpay_order_id - Razorpay order ID
   * @param {string} params.razorpay_payment_id - Razorpay payment ID
   * @param {string} params.razorpay_signature - Razorpay signature
   * @returns {boolean} - True if signature is valid
   */
  verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    try {
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      return expectedSignature === razorpay_signature;
    } catch (error) {
      console.error('Payment signature verification error:', error);
      return false;
    }
  }

  /**
   * Fetch payment details
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Promise<object>} - Payment details
   */
  async fetchPayment(paymentId) {
    if (!this.instance) {
      throw new Error('Razorpay service is not initialized.');
    }
    try {
      const payment = await this.instance.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Razorpay payment fetch error:', error);
      throw error;
    }
  }

  /**
   * Fetch order details
   * @param {string} orderId - Razorpay order ID
   * @returns {Promise<object>} - Order details
   */
  async fetchOrder(orderId) {
    if (!this.instance) {
      throw new Error('Razorpay service is not initialized.');
    }
    try {
      const order = await this.instance.orders.fetch(orderId);
      return order;
    } catch (error) {
      console.error('Razorpay order fetch error:', error);
      throw error;
    }
  }
}

module.exports = new RazorpayService();
