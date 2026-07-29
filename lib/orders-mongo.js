const client = require('./mongodb');
const { saveBill, deleteBill, loadDraft } = require('./bills-mongo');

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

async function listOrders() {
  const collection = await getCollection();
  return collection.find().sort({ updatedAt: -1, createdAt: -1 }).toArray();
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
  const incomingStatus = raw.status || existing?.status || 'draft';
  if (existing?.status === 'delivered' && incomingStatus !== 'delivered') {
    throw new Error('Delivered orders cannot be edited');
  }

  const payload = normalizeOrder(raw, existing);
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

  await collection.updateOne(
    { fileName: payload.fileName },
    { $set: payload },
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
