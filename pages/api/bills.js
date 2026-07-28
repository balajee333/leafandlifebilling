const { listBills } = require('../../lib/bills-mongo');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const bills = await listBills();
    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
