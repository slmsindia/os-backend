const Razorpay = require('razorpay');
const crypto = require('crypto');
const prisma = require('../lib/prisma');

class RazorpayService {
  constructor() {
    this.instances = new Map();
    this.secrets = new Map();
  }

  isDevelopment() {
    return process.env.NODE_ENV !== 'production';
  }

  shouldUseMockOrder(error) {
    if (!this.isDevelopment()) return false;

    const statusCode = error?.statusCode || error?.error?.statusCode;
    const description = String(
      error?.error?.description ||
      error?.description ||
      error?.message ||
      ''
    ).toLowerCase();

    return (
      statusCode === 401 ||
      description.includes('authentication failed') ||
      description.includes('credentials') ||
      description.includes('unauthorized') ||
      description.includes('network') ||
      description.includes('timeout') ||
      description.includes('fetch')
    );
  }

  buildMockOrder(amount, currency = 'INR', receipt) {
    const id = `mock_order_${Date.now()}`;
    return {
      id,
      entity: 'order',
      amount: Math.round(amount * 100),
      amount_paid: 0,
      amount_due: Math.round(amount * 100),
      currency,
      receipt: receipt || `mock_receipt_${Date.now()}`,
      status: 'created',
      attempts: 0,
      mock: true
    };
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
      console.log(`[Razorpay] Instance created for global fallback using key: ${keyId.substring(0, 8)}...`);
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

    // Only use tenant keys if they look valid (not empty, not just spaces, long enough)
    if (tenant && 
        tenant.razorpayKeyId && tenant.razorpayKeyId.trim().length > 5 && 
        tenant.razorpayKeySecret && tenant.razorpayKeySecret.trim().length > 5) {
      keyId = tenant.razorpayKeyId.trim();
      keySecret = tenant.razorpayKeySecret.trim();
      console.log(`[Razorpay] Using tenant-specific keys for: ${tenantId}`);
    } else {
      // Fallback to .env
      console.log(`[Razorpay] Tenant keys invalid or missing for ${tenantId}. Falling back to .env.`);
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

    console.log(`[Razorpay] Instance created for tenant: ${tenantId || 'global'} using key: ${keyId.substring(0, 8)}... and secret: ${keySecret.substring(0, 2)}...${keySecret.slice(-2)} (length: ${keySecret.length})`);

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

      if (this.shouldUseMockOrder(error)) {
        const mockOrder = this.buildMockOrder(amount, currency, receipt);
        console.warn(`[Razorpay] Falling back to mock order in development: ${mockOrder.id}`);
        return mockOrder;
      }

      // Ensure we have a string message
      const errorMsg = error.message || error.description || JSON.stringify(error);
      throw new Error(errorMsg);
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
