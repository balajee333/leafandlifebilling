const client = require('./mongodb');

const DB_NAME = process.env.MONGODB_DB || 'invoice-app';
const COLLECTION_NAME = 'bills';

async function getCollection() {
  if (!client.isConnected?.()) {
    await client.connect();
  }
  return client.db(DB_NAME).collection(COLLECTION_NAME);
}

function normalizeBill(raw = {}, existing) {
  const now = new Date().toISOString();
  const status = raw.status || existing?.status || 'draft';
  const items = Array.isArray(raw.items) ? raw.items : [];
  const total = Number(raw.total) || items.reduce((sum, item) => sum + (Number(item.total) || Number(item.qty) * Number(item.price) || 0), 0);

  return {
    billNumber: raw.billNumber || existing?.billNumber || null,
    status,
    paid: raw.paid ?? existing?.paid ?? false,
    customerName: raw.customerName || '',
    customerPhone: raw.customerPhone || '',
    date: raw.date || existing?.date || new Date().toISOString().slice(0, 10),
    items,
    total,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deliveredAt: status === 'delivered' ? (raw.deliveredAt || existing?.deliveredAt || now) : undefined
  };
}

async function listBills() {
  const collection = await getCollection();
  return collection.find().sort({ updatedAt: -1, createdAt: -1 }).toArray();
}

async function loadDraft(fileName) {
  const collection = await getCollection();
  const bill = await collection.findOne({ fileName });
  if (!bill) throw new Error('Bill not found');
  return bill;
}

async function saveBill(raw = {}, fileName) {
  const collection = await getCollection();
  const existing = fileName ? await collection.findOne({ fileName }) : null;
  const incomingStatus = raw.status || existing?.status || 'draft';
  if (existing?.status === 'delivered' && incomingStatus !== 'delivered') {
    throw new Error('Delivered bills cannot be edited');
  }
  const payload = normalizeBill(raw, existing);
  payload.fileName = fileName || `bill-${payload.billNumber || '000'}-${Date.now()}.json`;
  payload.billNumber = payload.billNumber || await createBillNumber(collection);

  await collection.updateOne(
    { fileName: payload.fileName },
    { $set: payload },
    { upsert: true }
  );

  return { fileName: payload.fileName, bill: payload };
}

async function deleteBill(fileName) {
  const collection = await getCollection();
  const result = await collection.deleteOne({ fileName });
  if (result.deletedCount === 0) throw new Error('Bill not found');
}

async function createBillNumber(collection) {
  const latest = await collection.find().sort({ billNumber: -1 }).limit(1).toArray();
  const highest = latest.length ? Number(latest[0].billNumber) || 0 : 0;
  return String(highest + 1).padStart(3, '0');
}

module.exports = {
  listBills,
  loadDraft,
  saveBill,
  deleteBill
};
