const Razorpay = require('razorpay');
const crypto = require('crypto');
const prisma = require('../lib/prisma');

class RazorpayService {
  constructor() {
    this.instances = new Map();
    this.secrets = new Map();
  }

  /**
   * Get or create a Razorpay instance for a specific tenant
   * @param {string} tenantId 
   */
  async getInstance(tenantId) {
    if (!tenantId) {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) throw new Error("Global Razorpay credentials missing in .env");
      
      this.secrets.set('global', keySecret);
      return new Razorpay({ key_id: keyId, key_secret: keySecret });
    }

    if (this.instances.has(tenantId)) {
      return this.instances.get(tenantId);
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { razorpayKeyId: true, razorpayKeySecret: true }
    });

    let keyId, keySecret;

    if (tenant && tenant.razorpayKeyId && tenant.razorpayKeySecret) {
      keyId = tenant.razorpayKeyId;
      keySecret = tenant.razorpayKeySecret;
    } else {
      // Fallback to .env
      keyId = process.env.RAZORPAY_KEY_ID;
      keySecret = process.env.RAZORPAY_KEY_SECRET;
    }

    if (!keyId || !keySecret) {
      throw new Error(`Razorpay credentials not found for tenant: ${tenantId}`);
    }

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    this.instances.set(tenantId, instance);
    this.secrets.set(tenantId, keySecret);
    return instance;
  }

  /**
   * Create a Razorpay order
   */
  async createOrder(tenantId, amount, currency = 'INR', receipt) {
    try {
      const instance = await this.getInstance(tenantId);
      const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        payment_capture: 1,
      };

      const order = await instance.orders.create(options);
      return order;
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      throw error;
    }
  }

  /**
   * Verify payment signature
   */
  async verifyPaymentSignature(tenantId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    try {
      // Ensure instance/secret is loaded
      await this.getInstance(tenantId);
      const secret = this.secrets.get(tenantId || 'global');

      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
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
   */
  async fetchPayment(tenantId, paymentId) {
    const instance = await this.getInstance(tenantId);
    return await instance.payments.fetch(paymentId);
  }

  /**
   * Get Key ID for frontend
   */
  async getKeyId(tenantId) {
    if (!tenantId) return process.env.RAZORPAY_KEY_ID;
    
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { razorpayKeyId: true }
    });

    return (tenant && tenant.razorpayKeyId) ? tenant.razorpayKeyId : process.env.RAZORPAY_KEY_ID;
  }
}

module.exports = new RazorpayService();
