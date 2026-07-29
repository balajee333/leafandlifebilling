const { loadOrder } = require('../../lib/orders-mongo');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const fileName = req.query.fileName;
    if (!fileName) throw new Error('fileName query parameter is required');
    const order = await loadOrder(fileName);
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
