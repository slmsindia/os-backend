const { v4: uuidv4, v7: uuidv7 } = require('uuid');

const generateUuid = () => {
  if (typeof uuidv7 === 'function') {
    return uuidv7();
  }
  return uuidv4();
};

module.exports = {
  generateUuid
};
