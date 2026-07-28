const { MongoClient } = require('mongodb');
let attachDatabasePool;
try {
  ({ attachDatabasePool } = require('@vercel/functions'));
} catch (error) {
  attachDatabasePool = undefined;
}

const uri = process.env.MONGODB_URI;
const invalidPlaceholder = !uri || typeof uri !== 'string' || uri.includes('<username>') || uri.includes('<password>') || uri.includes('<cluster-url>') || uri.includes('mongodb+srv://<');
if (invalidPlaceholder) {
  throw new Error('MONGODB_URI is not set to a valid MongoDB connection string. Set MONGODB_URI in Vercel environment variables and in .env.local for local development.');
}

const options = {
  appName: 'devrel.vercel.integration',
  maxIdleTimeMS: 5000
};

const client = new MongoClient(uri, options);
if (typeof attachDatabasePool === 'function') {
  attachDatabasePool(client);
}

module.exports = client;
