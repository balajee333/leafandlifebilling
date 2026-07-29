# Leaf & Life Billing

Next.js app for Leaf & Life Nursery orders and bills, backed by MongoDB.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set environment variables in `.env.local` (and in Vercel for production):
   - `MONGODB_URI` — MongoDB connection string (required)
   - `MONGODB_DB` — database name (optional, default `invoice-app`)
3. Run the app:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`.

## Features

### Home tabs

- **Orders** — list of orders with customer, flat name/number, delivery status, and paid status. Create via **Create New Order**.
- **Bills** — draft and delivered bills. Create via **Create New Bill**, or automatically when an order is saved.

### Orders

- Fields: customer name, flat name, flat number, mobile, date, line items.
- Saving an order creates or updates a linked **draft bill**.
- **Mark as Delivered** sets the order and linked bill to delivered.
- **Mark as Paid** sets the order and linked bill to paid.
- Open the linked bill from the order editor to print / save PDF.

### Bills

- Bill numbers use the format `leafandlife-{sequence}` (e.g. `leafandlife-001`).
- Draft bills stay editable; delivered bills are locked.
- Print layout includes logo, QR pay code, and nursery contact details.
- Order-originated bills also store flat name and flat number for the receipt.

## Migrate existing bill numbers

Rewrite legacy numeric `billNumber` values to `leafandlife-{seq}`:

```bash
node scripts/migrate-bill-numbers.js
```

Requires `MONGODB_URI` (reads `.env.local` if present). Safe to re-run; already-migrated bills are skipped.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `node scripts/migrate-bill-numbers.js` | Migrate bill numbers |
