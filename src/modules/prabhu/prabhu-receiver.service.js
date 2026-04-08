const { PrismaClient } = require('@prisma/client');
const { generateUuid } = require('../../utils/id');

const prisma = new PrismaClient();

const asStringOrNull = (value) => {
  const normalized = String(value || '').trim();
  return normalized || null;
};

const normalizePayload = (payload = {}) => ({
  customerId: asStringOrNull(payload.customerId),
  receiverId: asStringOrNull(payload.receiverId),
  name: String(payload.name || '').trim(),
  mobile: String(payload.mobile || '').trim(),
  relationship: asStringOrNull(payload.relationship),
  gender: asStringOrNull(payload.gender),
  paymentMode: asStringOrNull(payload.paymentMode),
  bankCode: asStringOrNull(payload.bankCode),
  bankBranchId: asStringOrNull(payload.bankBranchId),
  accountNumber: asStringOrNull(payload.accountNumber),
  address: asStringOrNull(payload.address)
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

  return prisma.prabhuReceiver.findMany({
    where,
    orderBy: { updatedAt: 'desc' }
  });
};

const upsert = async (payload = {}) => {
  const normalized = normalizePayload(payload);
  if (!normalized.name || !normalized.mobile) {
    throw new Error('name and mobile are required to save receiver');
  }

  if (normalized.receiverId) {
    return prisma.prabhuReceiver.upsert({
      where: { receiverId: normalized.receiverId },
      update: {
        ...normalized,
        receiverId: normalized.receiverId
      },
      create: {
        id: generateUuid(),
        ...normalized,
        receiverId: normalized.receiverId
      }
    });
  }

  const existing = await prisma.prabhuReceiver.findFirst({
    where: {
      customerId: normalized.customerId,
      mobile: normalized.mobile
    }
  });

  if (existing) {
    return prisma.prabhuReceiver.update({
      where: { id: existing.id },
      data: normalized
    });
  }

  return prisma.prabhuReceiver.create({
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
