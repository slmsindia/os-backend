<<<<<<< HEAD
<<<<<<< HEAD
const { generateUuid } = require('../../utils/id');

const prisma = require('../../lib/prisma');
=======
const { PrismaClient } = require('@prisma/client');
const { generateUuid } = require('../../utils/id');

const prisma = new PrismaClient();
>>>>>>> main
=======
const { generateUuid } = require('../../utils/id');

const prisma = require('../../lib/prisma');
>>>>>>> origin/main

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeCreatePayload = (payload = {}) => ({
  name: String(payload.name || '').trim(),
  mobile: String(payload.mobile || '').trim(),
  relationship: String(payload.relationship || 'Self').trim() || 'Self',
  sendAmountInr: toNumberOrNull(payload.sendAmountInr),
  receiveAmountNpr: toNumberOrNull(payload.receiveAmountNpr)
});

const list = async () => {
  return prisma.imeData.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

const create = async (payload) => {
  const normalized = normalizeCreatePayload(payload);
  return prisma.imeData.create({
    data: {
      id: generateUuid(),
      ...normalized
    }
  });
};

const update = async (id, payload) => {
  const normalized = normalizeCreatePayload(payload);
  return prisma.imeData.update({
    where: { id },
    data: normalized
  });
};

const remove = async (id) => {
  return prisma.imeData.delete({
    where: { id }
  });
};

module.exports = {
  list,
  create,
  update,
  remove
};
