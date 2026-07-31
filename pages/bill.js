import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

const today = new Date().toISOString().slice(0, 10);
const emptyItem = { product: '', qty: 1, price: '' };

export default function BillPage() {
  const router = useRouter();
  const { fileName } = router.query;

  const [currentFileName, setCurrentFileName] = useState('');
  const [billNumber, setBillNumber] = useState('---');
  const [status, setStatus] = useState('draft');
  const [paid, setPaid] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [flatName, setFlatName] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [date, setDate] = useState(today);
  const [items, setItems] = useState([emptyItem]);
  const [loading, setLoading] = useState(false);
  const [flatNames, setFlatNames] = useState([]);

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0), [items]);
  const isDelivered = status === 'delivered';

  useEffect(() => {
    loadFlatNames();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (fileName) {
      loadBill(fileName);
    } else {
      resetBill();
    }
  }, [router.isReady, fileName]);

  async function loadFlatNames() {
    try {
      const res = await fetch('/api/flat-names');
      const data = await res.json().catch(() => []);
      if (res.ok && Array.isArray(data)) setFlatNames(data);
    } catch {
      // keep existing options
    }
  }

  function resetBill() {
    setCurrentFileName('');
    setBillNumber('---');
    setStatus('draft');
    setPaid(false);
    setCustomerName('');
    setCustomerPhone('');
    setFlatName('');
    setFlatNumber('');
    setDate(today);
    setItems([emptyItem]);
  }

  async function loadBill(name) {
    setLoading(true);
    try {
      const res = await fetch(`/api/bill?fileName=${encodeURIComponent(name)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Could not load bill.');
        return;
      }
      const bill = data;
      setCurrentFileName(name);
      setBillNumber(bill.billNumber || '---');
      setStatus(bill.status || 'draft');
      setPaid(bill.paid ?? false);
      setCustomerName(bill.customerName || '');
      setCustomerPhone(bill.customerPhone || '');
      setFlatName(bill.flatName || '');
      setFlatNumber(bill.flatNumber || '');
      setDate(bill.date || today);
      setItems(Array.isArray(bill.items) && bill.items.length ? bill.items : [emptyItem]);
    } catch (error) {
      alert('Could not load bill.');
    } finally {
      setLoading(false);
    }
  }

  function updateItem(index, field, value) {
    setItems(current => current.map((item, idx) => {
      if (idx !== index) return item;
      if (field === 'product') return { ...item, product: value };
      if (value === '' || value === null) return { ...item, [field]: '' };
      return { ...item, [field]: Number(value) };
    }));
  }

  function addItem() {
    setItems(current => [...current, emptyItem]);
  }

  function removeItem(index) {
    if (!confirm('Remove this item from the bill?')) return;
    setItems(current => {
      const next = current.filter((_, idx) => idx !== index);
      return next.length ? next : [emptyItem];
    });
  }

  function collectBillData(targetStatus, paidState = paid) {
    return {
      fileName: currentFileName || null,
      billNumber: billNumber === '---' ? null : billNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      flatName: flatName.trim(),
      flatNumber: flatNumber.trim(),
      date,
      items: items.map(item => ({
        product: item.product.trim(),
        qty: Number(item.qty || 0),
        price: Number(item.price || 0),
        total: Number(item.qty || 0) * Number(item.price || 0)
      })),
      total,
      status: targetStatus,
      paid: paidState
    };
  }

  async function persistBill(targetStatus, paidState = paid) {
    const payload = collectBillData(targetStatus, paidState);
    const res = await fetch('/api/update-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(result.error || 'Unable to save bill.');
      return false;
    }
    setCurrentFileName(result.fileName);
    setBillNumber(result.billNumber || billNumber);
    setStatus(result.status || targetStatus);
    setPaid(result.paid ?? paidState);
    await loadFlatNames();
    if (targetStatus === 'draft') {
      alert('Draft saved successfully.');
      router.push('/?tab=bills');
      return true;
    }
    router.replace({ pathname: '/bill', query: { fileName: result.fileName } }, undefined, { shallow: true });
    alert(targetStatus === 'delivered' ? 'Bill marked as delivered.' : 'Draft saved successfully.');
    return true;
  }

  async function saveDraft() {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Please enter both the customer name and phone number before saving a draft.');
      return;
    }
    await persistBill('draft');
  }

  async function markDelivered() {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Please enter both the customer name and phone number before marking the bill as delivered.');
      return;
    }
    await persistBill('delivered');
  }

  async function markPaid() {
    if (paid) return;
    await persistBill(status, true);
  }

  async function deleteCurrentBill() {
    if (!currentFileName) {
      alert('No bill selected to delete.');
      return;
    }
    if (!confirm('Warning: Delete this bill permanently?\n\nThis cannot be undone.')) return;
    const res = await fetch('/api/delete-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: currentFileName })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert('Could not delete bill: ' + (err.error || 'Unknown error'));
      return;
    }
    router.push('/?tab=bills');
  }

  function printBill() {
    const pdfTitle = `LeafAndLifeBill-${billNumber || '000'}`;
    const originalTitle = document.title;
    document.title = pdfTitle;
    window.onafterprint = () => {
      document.title = originalTitle;
      window.onafterprint = null;
    };
    window.print();
  }

  return (
    <>
      <Head>
        <title>Bill Editor</title>
      </Head>

      <div className='page'>
        <div className='editor-layout'>
          <div className='header'>
            <div className='header-main'>
              <a className='brand-link' href='/' aria-label='Go to home'>
                <img className='header-logo' src='/logo.png' alt='Leaf & Life logo' />
              </a>
              <div>
                <h1>Bill Editor</h1>
                <p>Create, save, and deliver bills. Drafts remain editable; delivered bills are locked.</p>
              </div>
            </div>
            <div className='actions'>
              <a className='button secondary' href='/?tab=bills'>Back to Bills</a>
              <button className='button secondary delete-action' onClick={deleteCurrentBill}>Delete Bill</button>
              {!isDelivered && <button className='button' onClick={markDelivered}>Mark as Delivered</button>}
              {!paid ? (
                <button className='button secondary' onClick={markPaid}>Mark as Paid</button>
              ) : (
                <button className='button secondary' disabled>Paid</button>
              )}
              <button className='button secondary' onClick={printBill}>Print / Save PDF</button>
            </div>
          </div>

          <div className='panel'>
            <div className='grid'>
              <div className='field'>
                <label>Bill #</label>
                <div className='status-pill'>{billNumber}</div>
              </div>
              <div className='field'>
                <label>Status</label>
                <div className='status-pill'>{`${status === 'delivered' ? 'Delivered' : 'Draft'} · ${paid ? 'Paid' : 'Not Yet'}`}</div>
              </div>
              <div className='field'>
                <label>Customer Name</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} disabled={isDelivered} placeholder='Customer name' />
              </div>
              <div className='field'>
                <label>Phone Number</label>
                <input type='tel' value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} disabled={isDelivered} placeholder='Phone number' />
              </div>
              <div className='field'>
                <label>Flat Name</label>
                <input
                  list='flat-name-options'
                  value={flatName}
                  onChange={e => setFlatName(e.target.value)}
                  disabled={isDelivered}
                  placeholder='Select or type flat / apartment name (optional)'
                  autoComplete='off'
                />
                <datalist id='flat-name-options'>
                  {flatNames.map(name => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <div className='field'>
                <label>Flat Number</label>
                <input value={flatNumber} onChange={e => setFlatNumber(e.target.value)} disabled={isDelivered} placeholder='Flat number (optional)' />
              </div>
              <div className='field'>
                <label>Date</label>
                <input type='date' value={date} onChange={e => setDate(e.target.value)} disabled={isDelivered} />
              </div>
              <div className='field'>
                <label>Amount</label>
                <div className='status-pill'>₹ {total.toFixed(2)}</div>
              </div>
            </div>

            <div className='field item-section'>
              <label>Items</label>
              <div className='table-shell'>
                <table>
                  <thead>
                    <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td><input value={item.product} disabled={isDelivered} onChange={e => updateItem(index, 'product', e.target.value)} placeholder='Product' /></td>
                        <td><input type='number' min='0' value={item.qty} disabled={isDelivered} onChange={e => updateItem(index, 'qty', e.target.value)} /></td>
                        <td><input type='number' step='0.01' min='0' value={item.price === '' || item.price == null ? '' : item.price} disabled={isDelivered} onChange={e => updateItem(index, 'price', e.target.value)} /></td>
                        <td>₹ {(Number(item.qty || 0) * Number(item.price || 0)).toFixed(2)}</td>
                        <td><button className='delete-btn' type='button' disabled={isDelivered} onClick={() => removeItem(index)}>🗑</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className='button secondary add-row-btn' onClick={addItem} disabled={isDelivered}>+ Add Item</button>
              {!isDelivered && (
                <button className='button save-draft-btn' onClick={saveDraft}>Save Draft</button>
              )}
            </div>

            <div className='total'><span>Total</span><span id='totalValue'>₹ {total.toFixed(2)}</span></div>
          </div>
        </div>

        <div className='print-layout'>
          <div className='invoice-card'>
            <div className='invoice-header'>
              <div className='logo-block'>
                <div className='logo-frame'>
                  <img className='brand-logo' src='/logo.png' alt='Leaf & Life logo' />
                </div>
                <div className='brand-block'>
                  <h2>Leaf & Life Nursery</h2>
                  <p>Bill / Delivery receipt</p>
                </div>
              </div>
              <div className='status-pill'>{`${status === 'delivered' ? 'Delivered' : 'Draft'} · ${paid ? 'Paid' : 'Not Yet'}`}</div>
            </div>

            <div className='invoice-meta'>
              <div className='meta-box'><div className='meta-label'>Bill #</div><div className='meta-value'>{billNumber}</div></div>
              <div className='meta-box'><div className='meta-label'>Date</div><div className='meta-value'>{date}</div></div>
              <div className='meta-box'><div className='meta-label'>Customer</div><div className='meta-value'>{customerName || '—'}</div></div>
              <div className='meta-box'><div className='meta-label'>Phone</div><div className='meta-value'>{customerPhone || '—'}</div></div>
              {(flatName || flatNumber) && (
                <>
                  <div className='meta-box'><div className='meta-label'>Flat Name</div><div className='meta-value'>{flatName || '—'}</div></div>
                  <div className='meta-box'><div className='meta-label'>Flat Number</div><div className='meta-value'>{flatNumber || '—'}</div></div>
                </>
              )}
            </div>

            <table className='print-table'>
              <thead>
                <tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan='4'>No items added</td></tr>
                ) : items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.product || '—'}</td>
                    <td>{item.qty}</td>
                    <td>₹ {Number(item.price || 0).toFixed(2)}</td>
                    <td>₹ {(Number(item.qty || 0) * Number(item.price || 0)).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className='print-total'><span>Total</span><span>₹ {total.toFixed(2)}</span></div>

            <div className='footer-row'>
              <div className='contact-block'>
                <b>Leaf & Life Nursery</b><br />
                Kelambakkam, Chennai<br />
                9942093711<br />
                @leafandlifenursery
              </div>
              <div className='scan-block'>
                <div className='scan-label'>Scan to Pay</div>
                <img src='/QR-code.jpeg' alt='Scan to pay QR code' />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(body){margin:0;font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#f4f8f4 0%,#eaf4ea 100%);color:#223126}
        .page{max-width:1000px;margin:24px auto;padding:24px}
        .editor-layout{display:grid;gap:20px}
        .header{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
        .header-main{display:flex;align-items:center;gap:12px;min-width:0}
        .brand-link{display:inline-flex;flex-shrink:0;line-height:0}
        .header-logo{width:52px;height:52px;object-fit:contain;display:block}
        .header h1{margin:0;color:#2e7d32}
        .header p{margin:6px 0 0;color:#4f6b53;max-width:580px}
        .actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:flex-end}
        button,a.button{display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:10px;padding:10px 14px;background:#2e7d32;color:#fff;text-decoration:none;cursor:pointer;font-weight:700;min-height:40px;font-size:15px;line-height:1.3}
        .button.secondary{background:#f2f7f2;color:#2e7d32;border:1px solid #d7e6da}
        .delete-action{background:#fff;color:#c62828;border:1px solid #f2c7c7}
        .panel{background:#fff;border-radius:18px;padding:24px;box-shadow:0 18px 40px rgba(26,61,35,.08);margin-top:18px}
        .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}
        .field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
        label{font-size:11px;color:#6b7a6f;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
        input{width:100%;padding:11px 12px;border:1px solid #dbe7de;border-radius:10px;background:#fcfdfc;box-sizing:border-box}
        input:focus{outline:none;border-color:#2e7d32}
        .table-shell{border:1px solid #e8efe9;border-radius:14px;overflow:hidden;background:#fff;margin-top:10px}
        .add-row-btn{margin-top:12px;align-self:flex-start}
        .save-draft-btn{margin-top:10px;align-self:stretch;width:100%}
        table{width:100%;border-collapse:collapse}
        th,td{padding:12px 12px;border-bottom:1px solid #e8efe9;text-align:left}
        th{background:#f5faf5;color:#2e7d32;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
        .delete-btn{background:#fff;color:#c62828;border:1px solid #f2c7c7;padding:8px 10px;border-radius:10px}
        .total{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:18px;padding:14px 18px;border:1px solid #dce8de;border-radius:12px;background:#f7fbf7;width:fit-content;margin-left:auto;font-weight:700;color:#1b5e20}
        .status-pill{display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;border-radius:999px;background:#eef7ed;color:#2e7d32;font-weight:700}
        .print-layout{display:none}
        .invoice-card{background:#fff;border:1px solid #e5eee4;border-radius:24px;padding:28px;box-shadow:none}
        .invoice-header{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:1px solid #e3ece4;padding-bottom:16px;margin-bottom:16px}
        .logo-block{display:flex;align-items:center;gap:12px}
        .logo-frame{width:72px;height:72px;display:flex;align-items:center;justify-content:center;border-radius:18px;background:#f4fbf4;overflow:hidden;border:1px solid #d7e8d7}
        .brand-logo{max-width:100%;max-height:100%;display:block;object-fit:contain}
        .brand-block h2{margin:0;color:#2e7d32;font-size:22px}
        .brand-block p{margin:4px 0 0;color:#4f6b53;font-size:13px}
        .invoice-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-bottom:16px}
        .meta-box{background:#f7fbf7;border:1px solid #e3ece4;border-radius:12px;padding:10px 12px}
        .meta-label{font-size:11px;color:#6b7a6f;text-transform:uppercase;letter-spacing:.08em;font-weight:700}
        .meta-value{font-size:14px;color:#223126;margin-top:4px}
        .print-table{width:100%;border-collapse:collapse;margin-top:8px}
        .print-table th,.print-table td{padding:10px;border-bottom:1px solid #e8efe9;text-align:left}
        .print-table th{background:#f5faf5;color:#2e7d32;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
        .print-total{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:16px;padding:12px 16px;border:1px solid #dce8de;border-radius:12px;background:#f7fbf7;width:fit-content;margin-left:auto;font-weight:700;color:#1b5e20}
        .footer-row{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-top:20px;padding-top:16px;border-top:1px solid #e3ece4;width:100%}
        .contact-block{font-size:13px;line-height:1.6;color:#4f6b53;flex:1;min-width:0}
        .scan-block{display:flex;flex-direction:column;align-items:center;text-align:center;margin-left:auto;flex:0 0 auto;width:180px}
        .scan-label{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#2e7d32;font-weight:700;margin-bottom:8px;width:100%;text-align:center}
        .scan-block img{display:block;width:180px;max-width:180px;height:auto;border:1px solid #e6eee7;border-radius:18px;padding:8px;background:#fff;box-sizing:border-box}
        @media screen and (max-width:900px){
          .grid{grid-template-columns:1fr}
          .invoice-meta{grid-template-columns:1fr}
          .footer-row{flex-direction:column}
          .scan-block{margin-left:0;align-self:flex-start}
          .actions{justify-content:flex-start}
          .page{margin:0 auto;padding:16px}
          .panel{padding:18px;margin-top:14px}
          .print-layout{padding:0}
          .status-pill{justify-content:flex-start;text-align:left;width:fit-content;max-width:100%;white-space:normal}
        }
        @media screen and (max-width:700px){
          .header{align-items:flex-start;flex-direction:column}
          .actions{width:100%;justify-content:flex-start;gap:8px}
          .actions button,.actions a.button{width:100%;box-sizing:border-box;font-size:16px;padding:12px 16px;min-height:48px;line-height:1.35}
          .add-row-btn,.save-draft-btn{font-size:16px;padding:12px 16px;min-height:48px;width:100%;box-sizing:border-box}
          .table-shell{overflow-x:auto;-webkit-overflow-scrolling:touch}
          .table-shell table{min-width:520px}
          .field.item-section{padding-bottom:0}
          .total{width:100%;justify-content:space-between;box-sizing:border-box}
          input{font-size:16px}
        }
        @media print{
          :global(body){background:#fff}
          .page{margin:0;padding:0;max-width:none}
          .editor-layout,.actions button,.actions a,.add-row-btn,.save-draft-btn{display:none!important}
          .print-layout{display:block!important}
          .invoice-card{box-shadow:none;border:0;padding:0}
          .panel,.header{display:none!important}
          .footer-row{display:flex!important;flex-direction:row!important;justify-content:space-between!important;align-items:flex-start!important;width:100%!important}
          .contact-block{flex:1 1 auto}
          .scan-block{display:flex!important;flex-direction:column!important;align-items:center!important;margin-left:auto!important;margin-right:0!important;width:180px!important;flex:0 0 180px!important}
          .scan-label{text-align:center!important;width:100%!important}
          .scan-block img{width:160px!important;max-width:160px!important}
        }
      `}</style>
    </>
  );
}
