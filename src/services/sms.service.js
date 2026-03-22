const axios = require("axios");

const sendOtpSMS = async (mobile, otp) => {
  const { SMS_API_URL, SMS_API_KEY, SENDER_ID, DLT_TEMPLATE_ID, SMS_PEID } = process.env;


  if (!SMS_API_URL || !SMS_API_KEY) {
    return true;
  }

  try {
    const message = `Dear Saathi,  OTP for Your Online Saathi App Account Registration is ${otp}. OTP will expire in 10 minutes. Keep Using your Online Saathi App.\n\nSHLAXM`;

    // ensure 91 prefix for india
    const formattedMobile = mobile.startsWith("91") ? mobile : `91${mobile}`;

    const params = {
      APIKey: SMS_API_KEY,
      senderid: SENDER_ID,
      channel: "Trans",
      DCS: 0,
      flashsms: 0,
      number: formattedMobile,
      text: message,
      route: 6,
    };

    const res = await axios.get(SMS_API_URL, { params });

    return res.data.ErrorCode === "000" || res.status === 200;
  } catch (err) {
    console.error("sms api failed:", err.message);
    if (err.response) console.error("gateway error data:", err.response.data);
    return false;
  }
};

module.exports = { sendOtpSMS };
