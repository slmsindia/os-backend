const crypto = require('crypto');

const generateUuid = () => {
  // Use built-in crypto.randomUUID (standard v4)
  return crypto.randomUUID();
};

const generateReferralCode = () => {
  // Generates a short, user-friendly code like OS-X7B2K1
  return 'OS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

module.exports = {
  generateUuid,
  generateReferralCode
};
