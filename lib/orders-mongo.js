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

function normalizeOrderItems(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const normalized = {
      product: String(item.product || '').trim(),
      qty,
      price,
      total: Number(item.total) || qty * price
    };
    if (item.delivered) {
      normalized.delivered = true;
      if (item.deliveredAt) normalized.deliveredAt = String(item.deliveredAt);
    }
    return normalized;
  });
}

function pendingItems(items = []) {
  return items.filter(item => !item.delivered);
}

function itemsTotal(items = []) {
  return items.reduce(
    (sum, item) => sum + (Number(item.total) || Number(item.qty) * Number(item.price) || 0),
    0
  );
}

function billLineItems(items = []) {
  return items.map(item => ({
    product: item.product || '',
    qty: Number(item.qty) || 0,
    price: Number(item.price) || 0,
    total: Number(item.total) || Number(item.qty) * Number(item.price) || 0
  }));
}

function normalizeOrder(raw = {}, existing) {
  const now = new Date().toISOString();
  const status = raw.status || existing?.status || 'draft';
  const items = normalizeOrderItems(Array.isArray(raw.items) ? raw.items : existing?.items || []);
  const total = Number(raw.total) || itemsTotal(items);
  const deliveryBillFileNames = Array.isArray(raw.deliveryBillFileNames)
    ? raw.deliveryBillFileNames.filter(Boolean).map(String)
    : (Array.isArray(existing?.deliveryBillFileNames) ? existing.deliveryBillFileNames : []);

  return {
    orderNumber: raw.orderNumber || existing?.orderNumber || null,
    billFileName: raw.billFileName || existing?.billFileName || null,
    deliveryBillFileNames,
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

function billCustomerPayload(order) {
  return {
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    flatName: order.flatName,
    flatNumber: order.flatNumber,
    date: order.date,
    paid: order.paid
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

  const batch = Array.isArray(raw.partialDeliveryBatch)
    ? normalizeOrderItems(raw.partialDeliveryBatch)
    : null;
  const billOpts = { skipOrderSync: true };

  if (batch && batch.length) {
    const currentBillFileName = payload.billFileName || null;
    const deliveredBill = await saveBill(
      {
        ...billCustomerPayload(payload),
        items: billLineItems(batch),
        total: itemsTotal(batch),
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        ...(currentBillFileName ? { fileName: currentBillFileName } : {})
      },
      currentBillFileName,
      billOpts
    );

    const history = Array.isArray(payload.deliveryBillFileNames)
      ? [...payload.deliveryBillFileNames]
      : [];
    if (!history.includes(deliveredBill.fileName)) {
      history.push(deliveredBill.fileName);
    }
    payload.deliveryBillFileNames = history;

    if (payload.status === 'delivered') {
      payload.billFileName = deliveredBill.fileName;
    } else {
      const remaining = pendingItems(payload.items);
      const draftBill = await saveBill(
        {
          ...billCustomerPayload(payload),
          items: billLineItems(remaining),
          total: itemsTotal(remaining),
          status: 'draft'
        },
        null,
        billOpts
      );
      payload.billFileName = draftBill.fileName;
    }
  } else {
    const forBill = payload.status === 'delivered'
      ? payload.items
      : pendingItems(payload.items);
    const billItems = forBill.length ? forBill : payload.items;
    const billResult = await saveBill(
      {
        ...billCustomerPayload(payload),
        items: billLineItems(billItems),
        total: itemsTotal(billItems),
        status: payload.status,
        paid: payload.paid,
        deliveredAt: payload.deliveredAt,
        ...(payload.billFileName ? { fileName: payload.billFileName } : {})
      },
      payload.billFileName || null,
      billOpts
    );
    payload.billFileName = billResult.fileName;
  }

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
  deleteOrder,
  normalizeOrderItems,
  pendingItems
};
