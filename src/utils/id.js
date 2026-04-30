const crypto = require('crypto');

const generateUuid = () => {
  // Use built-in crypto.randomUUID (standard v4)
  return crypto.randomUUID();
};

module.exports = {
  generateUuid
};
