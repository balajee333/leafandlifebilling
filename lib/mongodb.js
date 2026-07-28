const { MongoClient } = require('mongodb');
const { attachDatabasePool } = require('@vercel/functions');

const options = {
  appName: 'devrel.vercel.integration',
  maxIdleTimeMS: 5000
};

const client = new MongoClient(process.env.MONGODB_URI, options);
attachDatabasePool(client);

module.exports = client;
