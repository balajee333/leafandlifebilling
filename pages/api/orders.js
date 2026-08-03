const { listOrders } = require('../../lib/orders-mongo');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const scopeRaw = String(req.query.scope || 'all').toLowerCase();
    const scope = ['active', 'past', 'all'].includes(scopeRaw) ? scopeRaw : 'all';
    const orders = await listOrders({ scope });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
