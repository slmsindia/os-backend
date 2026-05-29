const crypto = require('crypto');

const generateUuid = () => {
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> origin/main
  // Use built-in crypto.randomUUID (standard v4)
  return crypto.randomUUID();
};

const generateReferralCode = () => {
  // Generates a short, user-friendly code like OS-X7B2K1
  return 'OS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
<<<<<<< HEAD
=======
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: deterministic simple UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
>>>>>>> main
=======
>>>>>>> origin/main
};

module.exports = {
  generateUuid,
<<<<<<< HEAD
<<<<<<< HEAD
  generateReferralCode
=======
>>>>>>> main
=======
  generateReferralCode
>>>>>>> origin/main
};
