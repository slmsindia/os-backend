const axios = require('axios');
axios.post('http://localhost:3005/api/prabhu/senders/upsert', {
  name: "Hari",
  mobile: "8488856251"
}).then(res => console.log(res.data)).catch(err => console.error(err.response?.data || err.message));
