/**
 * One-shot migration: rewrite legacy billNumber values to leafandlife-{seq}.
 * Usage: MONGODB_URI=... node scripts/migrate-bill-numbers.js
 * Optional: MONGODB_DB=invoice-app
 */
const path = require('path');

// Load .env.local if present (no dotenv dependency)
try {
  const fs = require('fs');
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
} catch {
  // ignore
}

const { parseBillSequence, formatBillNumber } = require('../lib/bills-mongo');
const client = require('../lib/mongodb');

const DB_NAME = process.env.MONGODB_DB || 'invoice-app';
const NEW_FORMAT = /^leafandlife-\d+$/i;

async function main() {
  await client.connect();
  const collection = client.db(DB_NAME).collection('bills');
  const bills = await collection.find().toArray();

  const used = new Set();
  for (const bill of bills) {
    if (NEW_FORMAT.test(String(bill.billNumber || ''))) {
      const seq = parseBillSequence(bill.billNumber);
      if (seq != null) used.add(seq);
    }
  }

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let nextFree = 1;

  function takeSequence(preferred) {
    let seq = preferred != null && preferred > 0 ? preferred : null;
    if (seq != null && !used.has(seq)) {
      used.add(seq);
      return seq;
    }
    if (seq != null && used.has(seq)) {
      console.warn(`Collision for sequence ${seq}; assigning next free number`);
    }
    while (used.has(nextFree)) nextFree += 1;
    seq = nextFree;
    used.add(seq);
    nextFree += 1;
    return seq;
  }

  for (const bill of bills) {
    const current = String(bill.billNumber || '');
    if (NEW_FORMAT.test(current)) {
      skipped += 1;
      continue;
    }
    try {
      const preferred = parseBillSequence(current);
      const sequence = takeSequence(preferred);
      const billNumber = formatBillNumber(sequence);
      await collection.updateOne(
        { _id: bill._id },
        { $set: { billNumber, updatedAt: new Date().toISOString() } }
      );
      console.log(`Migrated ${bill.fileName || bill._id}: ${current || '(empty)'} -> ${billNumber}`);
      migrated += 1;
    } catch (error) {
      failed += 1;
      console.error(`Failed ${bill.fileName || bill._id}:`, error.message);
    }
  }

  console.log(`Done. migrated=${migrated} skipped=${skipped} failed=${failed}`);
  await client.close();
}

main().catch(async (error) => {
  console.error(error);
  try { await client.close(); } catch { /* ignore */ }
  process.exit(1);
});
