/**
 * Utility to extract location data from a request.
 * Expected fields from frontend (either in body or custom headers):
 * x-lat, x-long, x-pincode, x-state, x-city
 */
const getLocationData = (req) => {
  const body = req.body || {};
  const headers = req.headers || {};

  return {
    state: body.state || headers['x-state'] || null,
    city: body.city || headers['x-city'] || null,
    pincode: body.pincode || headers['x-pincode'] || null,
    lat: parseFloat(body.lat || headers['x-lat'] || 0) || null,
    long: parseFloat(body.long || headers['x-long'] || 0) || null,
    ip: headers['x-forwarded-for'] || req.socket.remoteAddress || null,
    deviceInfo: headers['user-agent'] || null
  };
};

module.exports = { getLocationData };
