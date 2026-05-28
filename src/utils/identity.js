/**
 * Normalize identity strings from JWT/DB/UI so comparisons match Prisma Identity enum values.
 */
const normalizeIdentity = (value) => {
  const compact = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const collapsed = compact.replace(/_/g, "");
  const aliasMap = {
    SUPERADMIN: "SUPER_ADMIN",
    WHITELABELADMIN: "WHITE_LABEL_ADMIN",
    SUBADMIN: "SUB_ADMIN",
    COUNTRYHEAD: "COUNTRY_HEAD",
    STATEPARTNER: "STATE_PARTNER",
    DISTRICTPARTNER: "DISTRICT_PARTNER",
    SUPPORTTEAM: "SUPPORT_TEAM",
    BUSINESSPARTNER: "BUSINESS_PARTNER",
  };

  return aliasMap[collapsed] || compact;
};

module.exports = { normalizeIdentity };
