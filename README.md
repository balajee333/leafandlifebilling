# Invoice Draft Saving

This folder contains a simple invoice page with draft saving support.

## Run

1. Install Node.js if not already installed.
2. In the `invoice` folder, run:
   ```bash
   node server.js
   ```
3. Open `http://localhost:3000` in the browser.

## Save draft

- Enter customer name and phone number.
- Add items as needed.
- Click `Save Draft`.
- The draft is stored under `invoice/drafts/` as a JSON file.

## Bill list

- Open `http://localhost:3000/bills.html` to view saved bills.
- Draft bills show a `Mark as delivered` button.
- Delivered bills update the `status` field in the JSON draft.

## Notes

- Draft files are named `bill-<number>-<timestamp>.json`.
- Each draft includes `status: "draft"`.
