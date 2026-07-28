const { saveBill } = require('../../lib/bills-mongo');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const updated = req.body;
    const result = saveBill(updated, updated.fileName || null);
    res.status(200).json({ success: true, fileName: result.fileName, status: result.bill.status, billNumber: result.bill.billNumber });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
