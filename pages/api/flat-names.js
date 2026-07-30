const { listFlatNames, ensureFlatName } = require('../../lib/flat-names-mongo');

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const names = await listFlatNames();
      res.status(200).json(names);
      return;
    }

    if (req.method === 'POST') {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        res.status(400).json({ error: 'Invalid request body' });
        return;
      }
      const name = await ensureFlatName(req.body.name);
      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }
      const names = await listFlatNames();
      res.status(200).json({ success: true, name, names });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
