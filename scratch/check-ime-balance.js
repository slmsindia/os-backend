require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const imeService = require("../src/modules/ime/ime.service");

async function check() {
  try {
    const result = await imeService.login({});
    console.log("IME Service Login Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("IME Service Login Error:", err);
  }
}

check();
