const { deleteOrder } = require('../../lib/orders-mongo');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { fileName } = req.body || {};
    if (!fileName) throw new Error('fileName is required');
    await deleteOrder(fileName);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
