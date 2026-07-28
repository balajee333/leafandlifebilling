const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const draftsDir = path.join(__dirname, 'drafts');
if (!fs.existsSync(draftsDir)) fs.mkdirSync(draftsDir, { recursive: true });

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
    deliveredAt: status === 'delivered' ? (raw.deliveredAt || existing && existing.deliveredAt || now) : undefined
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

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);

  if (req.method === 'POST' && parsed.pathname === '/save-draft') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const result = saveBill(JSON.parse(body), null);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ success: true, fileName: result.fileName }));
      } catch (err) {
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && parsed.pathname === '/api/bills') {
    try {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(listBills()));
    } catch (err) {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && parsed.pathname === '/api/update-bill') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const updated = JSON.parse(body);
        const result = saveBill(updated, updated.fileName || null);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ success: true, fileName: result.fileName, status: result.bill.status, billNumber: result.bill.billNumber }));
      } catch (err) {
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && parsed.pathname === '/api/delete-bill') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { fileName } = JSON.parse(body);
        if (!fileName) throw new Error('fileName is required');
        const filePath = path.join(draftsDir, fileName);
        if (!fs.existsSync(filePath)) throw new Error('Bill file not found');
        fs.unlinkSync(filePath);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && parsed.pathname === '/api/bill') {
    try {
      const fileName = parsed.query.fileName;
      if (!fileName) throw new Error('fileName query parameter is required');
      const draft = loadDraft(fileName);
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify(draft));
    } catch (err) {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'GET') {
    let filePath = path.join(__dirname, parsed.pathname === '/' ? '/index.html' : parsed.pathname);
    const ext = path.extname(filePath).toLowerCase();
    const map = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.jpeg': 'image/jpeg',
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.json': 'application/json'
    };
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, {'Content-Type': map[ext] || 'application/octet-stream'});
      res.end(content);
    });
    return;
  }

  res.writeHead(405);
  res.end('Method not allowed');
});

const port = 3000;
server.listen(port, () => console.log(`Invoice server running at http://localhost:${port}`));
