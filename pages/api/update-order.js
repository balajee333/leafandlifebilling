const { saveOrder } = require('../../lib/orders-mongo');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  try {
    const updated = req.body;
    const result = await saveOrder(updated, updated.fileName || null);
    res.status(200).json({
      success: true,
      fileName: result.fileName,
      orderNumber: result.order.orderNumber,
      billFileName: result.order.billFileName,
      status: result.order.status,
      paid: result.order.paid ?? false
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
