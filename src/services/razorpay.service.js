const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
  constructor() {
    this.instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  /**
   * Create a Razorpay order
   * @param {number} amount - Amount in rupees
   * @param {string} currency - Currency code (default: INR)
   * @param {string} receipt - Receipt ID for tracking
   * @returns {Promise<object>} - Razorpay order object
   */
  async createOrder(amount, currency = 'INR', receipt) {
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
