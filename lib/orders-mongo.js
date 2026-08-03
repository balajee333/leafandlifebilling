const client = require('./mongodb');
const { saveBill, deleteBill, loadDraft } = require('./bills-mongo');
const { ensureFlatName } = require('./flat-names-mongo');

const DB_NAME = process.env.MONGODB_DB || 'invoice-app';
const COLLECTION_NAME = 'orders';

async function getCollection() {
  if (!client.isConnected?.()) {
    await client.connect();
  }
  return client.db(DB_NAME).collection(COLLECTION_NAME);
}

function normalizeOrder(raw = {}, existing) {
  const now = new Date().toISOString();
  const status = raw.status || existing?.status || 'draft';
  const items = Array.isArray(raw.items) ? raw.items : [];
  const total = Number(raw.total) || items.reduce((sum, item) => sum + (Number(item.total) || Number(item.qty) * Number(item.price) || 0), 0);

  return {
    orderNumber: raw.orderNumber || existing?.orderNumber || null,
    billFileName: raw.billFileName || existing?.billFileName || null,
    status,
    paid: raw.paid ?? existing?.paid ?? false,
    customerName: raw.customerName || '',
    flatName: raw.flatName || '',
    flatNumber: raw.flatNumber || '',
    customerPhone: raw.customerPhone || '',
    date: raw.date || existing?.date || new Date().toISOString().slice(0, 10),
    items,
    total,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    deliveredAt: status === 'delivered' ? (raw.deliveredAt || existing?.deliveredAt || now) : undefined
  };
}

function billPayloadFromOrder(order) {
  return {
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    flatName: order.flatName,
    flatNumber: order.flatNumber,
    date: order.date,
    items: order.items,
    total: order.total,
    status: order.status,
    paid: order.paid,
    deliveredAt: order.deliveredAt
  };
}

async function createOrderNumber(collection) {
  const orders = await collection.find({}, { projection: { orderNumber: 1 } }).toArray();
  let highest = 0;
  for (const order of orders) {
    const value = Number(String(order.orderNumber || '').replace(/\D/g, '')) || 0;
    if (value > highest) highest = value;
  }
  return String(highest + 1).padStart(3, '0');
}

async function listOrders({ scope = 'all' } = {}) {
  const collection = await getCollection();
  let query = {};
  let sort = { updatedAt: -1, createdAt: -1 };

  if (scope === 'active') {
    // Everything except delivered + paid (past orders).
    query = {
      $or: [
        { status: { $ne: 'delivered' } },
        { paid: { $ne: true } }
      ]
    };
  } else if (scope === 'past') {
    query = { status: 'delivered', paid: true };
    sort = { deliveredAt: -1, updatedAt: -1, createdAt: -1 };
  }

  return collection.find(query).sort(sort).toArray();
}

async function loadOrder(fileName) {
  const collection = await getCollection();
  const order = await collection.findOne({ fileName });
  if (!order) throw new Error('Order not found');
  return order;
}

async function saveOrder(raw = {}, fileName) {
  const collection = await getCollection();
  const existing = fileName ? await collection.findOne({ fileName }) : null;
  const payload = normalizeOrder(raw, existing);
  if (payload.flatName) {
    payload.flatName = await ensureFlatName(payload.flatName);
  }
  payload.orderNumber = payload.orderNumber || await createOrderNumber(collection);
  payload.fileName = fileName || `order-${payload.orderNumber}-${Date.now()}.json`;

  const billResult = await saveBill(
    {
      ...billPayloadFromOrder(payload),
      ...(payload.billFileName ? { fileName: payload.billFileName } : {})
    },
    payload.billFileName || null
  );
  payload.billFileName = billResult.fileName;

  const update = { $set: { ...payload } };
  if (payload.status !== 'delivered') {
    delete update.$set.deliveredAt;
    update.$unset = { deliveredAt: '' };
  }

  await collection.updateOne(
    { fileName: payload.fileName },
    update,
    { upsert: true }
  );

  return { fileName: payload.fileName, order: payload };
}

async function deleteOrder(fileName) {
  const collection = await getCollection();
  const order = await collection.findOne({ fileName });
  if (!order) throw new Error('Order not found');

  if (order.billFileName) {
    let bill;
    try {
      bill = await loadDraft(order.billFileName);
    } catch {
      bill = null;
    }
    if (bill?.status === 'delivered') {
      throw new Error('Cannot delete an order whose linked bill is delivered');
    }
    if (bill) {
      await deleteBill(order.billFileName);
    }
  }

  const result = await collection.deleteOne({ fileName });
  if (result.deletedCount === 0) throw new Error('Order not found');
}

module.exports = {
  listOrders,
  loadOrder,
  saveOrder,
  deleteOrder
};
