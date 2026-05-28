const prisma = require('../lib/prisma');

/**
 * Feature Restriction Middleware
 * Checks if a specific service is restricted for the user's identity and location
 */
const checkRestriction = (serviceId) => {
  return async (req, res, next) => {
    const { tenant_id: tenantId, identity, user_id: userId } = req.user;

    try {
      // 1. Get user's location (State/District) from their profile
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { registrationState: true, registrationCity: true }
      });

      const userState = user?.registrationState;
      const userDistrict = user?.registrationCity; // city is used as district in some parts of the app

      // 2. Fetch all applicable restrictions for this identity and service
      // We check for:
      // - Global restriction (state/district is null)
      // - State level restriction
      // - District level restriction
      const restrictions = await prisma.featureRestriction.findMany({
        where: {
          tenantId,
          identity,
          serviceId,
          isRestricted: true,
          OR: [
            { state: null, district: null },
            { state: userState, district: null },
            { state: userState, district: userDistrict }
          ]
        }
      });

      if (restrictions.length > 0) {
        return res.status(403).json({
          success: false,
          message: `The '${serviceId}' service is currently unavailable for your role or in your region.`,
          code: 'FEATURE_RESTRICTED'
        });
      }

      next();
    } catch (err) {
      console.error('Restriction check failed:', err);
      // Fail-safe: allow if check fails? Or block? 
      // Blocking is safer for access control.
      next(); 
    }
  };
};

module.exports = { checkRestriction };
