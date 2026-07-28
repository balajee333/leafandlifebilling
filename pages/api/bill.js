const { loadDraft } = require('../../lib/bills-mongo');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const fileName = req.query.fileName;
    if (!fileName) throw new Error('fileName query parameter is required');
    const bill = await loadDraft(fileName);
    res.status(200).json(bill);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
