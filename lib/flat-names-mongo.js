const client = require('./mongodb');

const DB_NAME = process.env.MONGODB_DB || 'invoice-app';
const COLLECTION_NAME = 'flatNames';

const DEFAULT_FLAT_NAMES = [
  'Urbanrise',
  'Akshaya Today',
  'XS Real',
  'Hiranandani',
  'Mantri Synergy'
];

async function getCollection() {
  if (!client.isConnected?.()) {
    await client.connect();
  }
  const collection = client.db(DB_NAME).collection(COLLECTION_NAME);
  await collection.createIndex({ nameLower: 1 }, { unique: true });
  return collection;
}

async function ensureDefaultFlatNames() {
  const collection = await getCollection();
  const now = new Date().toISOString();
  for (const name of DEFAULT_FLAT_NAMES) {
    const nameLower = name.toLowerCase();
    await collection.updateOne(
      { nameLower },
      {
        $setOnInsert: {
          name,
          nameLower,
          createdAt: now,
          updatedAt: now
        }
      },
      { upsert: true }
    );
  }
}

async function listFlatNames() {
  await ensureDefaultFlatNames();
  const collection = await getCollection();
  const docs = await collection.find({}, { projection: { name: 1 } }).sort({ name: 1 }).toArray();
  return docs.map(doc => doc.name).filter(Boolean);
}

async function ensureFlatName(rawName) {
  const name = String(rawName || '').trim();
  if (!name) return '';

  const collection = await getCollection();
  const nameLower = name.toLowerCase();
  const existing = await collection.findOne({ nameLower });
  if (existing) return existing.name;

  const now = new Date().toISOString();
  try {
    await collection.insertOne({
      name,
      nameLower,
      createdAt: now,
      updatedAt: now
    });
    return name;
  } catch (error) {
    if (error?.code === 11000) {
      const again = await collection.findOne({ nameLower });
      if (again) return again.name;
    }
    throw error;
  }
}

module.exports = {
  listFlatNames,
  ensureDefaultFlatNames,
  ensureFlatName,
  DEFAULT_FLAT_NAMES
};
