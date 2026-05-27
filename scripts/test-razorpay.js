const Razorpay = require('razorpay');
require('dotenv').config();

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function testRazorpay() {
  console.log('Testing Razorpay with Key:', process.env.RAZORPAY_KEY_ID);
  try {
    const order = await instance.orders.create({
      amount: 100,
      currency: 'INR',
      receipt: 'test_receipt'
    });
    console.log('Order created successfully:', order.id);
  } catch (err) {
    console.error('Razorpay Error:', JSON.stringify(err, null, 2));
  }
}

testRazorpay();
