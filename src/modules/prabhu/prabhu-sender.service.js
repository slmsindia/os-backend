const { PrismaClient } = require('@prisma/client');
const { generateUuid } = require('../../utils/id');

const prisma = new PrismaClient();

const asStringOrNull = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const normalizePayload = (payload = {}) => ({
  customerId: asStringOrNull(payload.customerId),
  name: String(payload.name || '').trim(),
  mobile: String(payload.mobile || '').trim(),
  gender: asStringOrNull(payload.gender),
  dateOfBirth: asStringOrNull(payload.dateOfBirth || payload.dob),
  address: asStringOrNull(payload.address),
  city: asStringOrNull(payload.city),
  district: asStringOrNull(payload.district),
  state: asStringOrNull(payload.state),
  nationality: asStringOrNull(payload.nationality),
  email: asStringOrNull(payload.email),
  idType: asStringOrNull(payload.idType || payload.senderIDType),
  idNumber: asStringOrNull(payload.idNumber || payload.senderIDNumber),
  idExpiryDate: asStringOrNull(payload.idExpiryDate || payload.senderIDExpiryDate),
  idIssuedPlace: asStringOrNull(payload.idIssuedPlace || payload.senderIDIssuedPlace),
  sourceIncomeType: asStringOrNull(payload.sourceIncomeType),
  customerType: asStringOrNull(payload.customerType),
  status: asStringOrNull(payload.status) || 'Pending'
});

const list = async ({ customerId = '', mobile = '' } = {}) => {
  const normalizedCustomerId = String(customerId || '').trim();
  const normalizedMobile = String(mobile || '').trim();

  const where = {};
  if (normalizedCustomerId || normalizedMobile) {
    where.OR = [];
    if (normalizedCustomerId) {
      where.OR.push({ customerId: normalizedCustomerId });
    }
    if (normalizedMobile) {
      where.OR.push({ mobile: normalizedMobile });
    }
  }

  return prisma.prabhuSender.findMany({
    where,
    orderBy: { updatedAt: 'desc' }
  });
};

const upsert = async (payload = {}) => {
  const normalized = normalizePayload(payload);
  if (!normalized.name || !normalized.mobile) {
    throw new Error('name and mobile are required to save sender');
  }

  if (normalized.customerId) {
    return prisma.prabhuSender.upsert({
      where: { customerId: normalized.customerId },
      update: {
        ...normalized,
        customerId: normalized.customerId
      },
      create: {
        id: generateUuid(),
        ...normalized,
        customerId: normalized.customerId
      }
    });
  }

  const existing = await prisma.prabhuSender.findFirst({
    where: { mobile: normalized.mobile }
  });

  if (existing) {
    return prisma.prabhuSender.update({
      where: { id: existing.id },
      data: normalized
    });
  }

  return prisma.prabhuSender.create({
    data: {
      id: generateUuid(),
      ...normalized
    }
  });
};

module.exports = {
  list,
  upsert
};
