require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const prabhuService = require("../src/modules/prabhu/prabhu.service");

async function check() {
  try {
    const result = await prabhuService.callEndpoint('GetBalance', {});
    console.log("Prabhu Service GetBalance Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Prabhu Service GetBalance Error:", err);
  }
}

check();
