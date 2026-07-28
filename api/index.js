const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const defaultDraftsDir = path.join(__dirname, '..', 'drafts');
const fallbackDraftsDir = process.env.DRAFTS_DIR || path.join('/tmp', 'invoice-drafts');
let draftsDir = defaultDraftsDir;

function ensureDraftsDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch (err) {
    return false;
  }
}

if (!ensureDraftsDir(draftsDir)) {
  draftsDir = fallbackDraftsDir;
  if (!ensureDraftsDir(draftsDir)) {
    throw new Error(`Unable to create drafts directory: ${draftsDir}`);
  }
}

function listDraftFiles() {
  return fs.readdirSync(draftsDir).filter(file => file.endsWith('.json')).sort();
}

function loadDraft(fileName) {
  const filePath = path.join(draftsDir, fileName);
  if (!fs.existsSync(filePath)) throw new Error('File not found');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveDraftFile(fileName, data) {
  const filePath = path.join(draftsDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function createBillNumber() {
  const numbers = listDraftFiles()
    .map(fileName => {
      try { return Number(loadDraft(fileName).billNumber); } catch { return null; }
    })
    .filter(value => Number.isFinite(value));
  const highest = numbers.length ? Math.max(...numbers) : 0;
  return String(highest + 1).padStart(3, '0');
}

function buildBillPayload(raw, existing) {
  const now = new Date().toISOString();
  const status = raw.status || (existing && existing.status) || 'draft';
  const items = Array.isArray(raw.items) ? raw.items : [];
  const total = Number(raw.total) || items.reduce((sum, item) => sum + (Number(item.total) || Number(item.qty) * Number(item.price) || 0), 0);
  return {
    billNumber: raw.billNumber || (existing && existing.billNumber) || createBillNumber(),
    status,
    customerName: raw.customerName || '',
    customerPhone: raw.customerPhone || '',
    date: raw.date || (existing && existing.date) || new Date().toISOString().slice(0, 10),
    items,
    total,
    createdAt: existing && existing.createdAt ? existing.createdAt : now,
    updatedAt: now,
    deliveredAt: status === 'delivered' ? (raw.deliveredAt || (existing && existing.deliveredAt) || now) : undefined
  };
}

function saveBill(raw, fileName) {
  const existing = fileName ? loadDraft(fileName) : null;
  const incomingStatus = raw.status || (existing && existing.status) || 'draft';
  if (existing && existing.status === 'delivered' && incomingStatus !== 'delivered') {
    throw new Error('Delivered bills cannot be edited');
  }
  const payload = buildBillPayload(raw, existing);
  const resolvedFileName = fileName || `bill-${payload.billNumber}-${Date.now()}.json`;
  saveDraftFile(resolvedFileName, payload);
  return { fileName: resolvedFileName, bill: payload };
}

function listBills() {
  return listDraftFiles()
    .map(fileName => {
      const bill = loadDraft(fileName);
      return { fileName, ...bill };
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

app.get('/bills', (req, res) => {
  try {
    res.json(listBills());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/bill', (req, res) => {
  try {
    const fileName = req.query.fileName;
    if (!fileName) throw new Error('fileName query parameter is required');
    res.json(loadDraft(fileName));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/update-bill', (req, res) => {
  try {
    const updated = req.body;
    const result = saveBill(updated, updated.fileName || null);
    res.json({ success: true, fileName: result.fileName, status: result.bill.status, billNumber: result.bill.billNumber });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/delete-bill', (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) throw new Error('fileName is required');
    const filePath = path.join(draftsDir, fileName);
    if (!fs.existsSync(filePath)) throw new Error('Bill file not found');
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
