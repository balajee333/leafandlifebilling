import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

const today = new Date().toISOString().slice(0, 10);
const emptyItem = { product: '', qty: 1, price: '' };

function IconBtn({ href, onClick, label, disabled, danger, primary, children }) {
  const className = [
    'icon-btn',
    primary ? 'primary' : 'secondary',
    danger ? 'danger' : ''
  ].filter(Boolean).join(' ');
  if (href) {
    return (
      <a className={className} href={href} title={label} aria-label={label}>
        {children}
      </a>
    );
  }
  return (
    <button type='button' className={className} onClick={onClick} disabled={disabled} title={label} aria-label={label}>
      {children}
    </button>
  );
}

const icons = {
  back: (
    <svg viewBox='0 0 24 24' width='20' height='20' aria-hidden='true' focusable='false'>
      <path fill='currentColor' d='M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z' />
    </svg>
  ),
  plus: (
    <svg viewBox='0 0 24 24' width='20' height='20' aria-hidden='true' focusable='false'>
      <path fill='currentColor' d='M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z' />
    </svg>
  ),
  bill: (
    <svg viewBox='0 0 24 24' width='20' height='20' aria-hidden='true' focusable='false'>
      <path fill='currentColor' d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm1 7V3.5L18.5 9H15zM8 13h8v2H8v-2zm0 4h8v2H8v-2zm0-8h5v2H8V9z' />
    </svg>
  ),
  trash: (
    <svg viewBox='0 0 24 24' width='20' height='20' aria-hidden='true' focusable='false'>
      <path fill='currentColor' d='M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z' />
    </svg>
  ),
  deliver: (
    <svg viewBox='0 0 24 24' width='20' height='20' aria-hidden='true' focusable='false'>
      <path fill='currentColor' d='M20 8h-3V4H3v13h2a3 3 0 0 0 6 0h4a3 3 0 0 0 6 0h2v-5l-3-4zM8 18.5A1.5 1.5 0 1 1 9.5 17 1.5 1.5 0 0 1 8 18.5zm10 0a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5zM17 12V9.5h2.5l1.5 2.5H17z' />
    </svg>
  ),
  undo: (
    <svg viewBox='0 0 24 24' width='20' height='20' aria-hidden='true' focusable='false'>
      <path fill='currentColor' d='M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z' />
    </svg>
  ),
  pay: (
    <svg viewBox='0 0 24 24' width='20' height='20' aria-hidden='true' focusable='false'>
      <path fill='currentColor' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1.93.87 1.62 2.31 1.62 1.3 0 2.16-.67 2.16-1.61 0-.94-.7-1.4-2.34-1.85-2.23-.6-3.72-1.54-3.72-3.5 0-1.74 1.36-2.95 3.1-3.3V5h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.84-1.71-2.14-1.71-1.14 0-1.95.6-1.95 1.47 0 .86.7 1.3 2.45 1.8 2.38.67 3.63 1.62 3.63 3.56 0 1.84-1.38 3.08-3.13 3.43z' />
    </svg>
  ),
  paid: (
    <svg viewBox='0 0 24 24' width='20' height='20' aria-hidden='true' focusable='false'>
      <path fill='currentColor' d='M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' />
    </svg>
  ),
  save: (
    <svg viewBox='0 0 24 24' width='20' height='20' aria-hidden='true' focusable='false'>
      <path fill='currentColor' d='M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zm-5 16a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm3-10H5V5h10v4z' />
    </svg>
  )
};

export default function OrderPage() {
  const router = useRouter();
  const { fileName, copyFrom } = router.query;

  const [currentFileName, setCurrentFileName] = useState('');
  const [orderNumber, setOrderNumber] = useState('---');
  const [billFileName, setBillFileName] = useState('');
  const [status, setStatus] = useState('draft');
  const [paid, setPaid] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [flatName, setFlatName] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState(today);
  const [items, setItems] = useState([emptyItem]);
  const [loading, setLoading] = useState(false);
  const [flatNames, setFlatNames] = useState([]);
  const skipResetRef = useRef(false);

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0), [items]);
  const isDelivered = status === 'delivered';
  const canCreateAnother = Boolean(currentFileName);

  useEffect(() => {
    loadFlatNames();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    if (fileName) {
      loadOrder(String(fileName));
      return;
    }
    if (copyFrom) {
      prefillFromOrder(String(copyFrom));
      return;
    }
    if (skipResetRef.current) {
      skipResetRef.current = false;
      return;
    }
    resetOrder();
  }, [router.isReady, fileName, copyFrom]);

  async function loadFlatNames() {
    try {
      const res = await fetch('/api/flat-names');
      const data = await res.json().catch(() => []);
      if (res.ok && Array.isArray(data)) setFlatNames(data);
    } catch {
      // keep existing options
    }
  }

  function resetOrder() {
    setCurrentFileName('');
    setOrderNumber('---');
    setBillFileName('');
    setStatus('draft');
    setPaid(false);
    setCustomerName('');
    setFlatName('');
    setFlatNumber('');
    setCustomerPhone('');
    setDate(today);
    setItems([emptyItem]);
  }

  async function loadOrder(name) {
    setLoading(true);
    try {
      const res = await fetch(`/api/order?fileName=${encodeURIComponent(name)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Could not load order.');
        return;
      }
      setCurrentFileName(name);
      setOrderNumber(data.orderNumber || '---');
      setBillFileName(data.billFileName || '');
      setStatus(data.status || 'draft');
      setPaid(data.paid ?? false);
      setCustomerName(data.customerName || '');
      setFlatName(data.flatName || '');
      setFlatNumber(data.flatNumber || '');
      setCustomerPhone(data.customerPhone || '');
      setDate(data.date || today);
      setItems(Array.isArray(data.items) && data.items.length ? data.items : [emptyItem]);
    } catch (error) {
      alert('Could not load order.');
    } finally {
      setLoading(false);
    }
  }

  async function prefillFromOrder(sourceFileName) {
    setLoading(true);
    try {
      const res = await fetch(`/api/order?fileName=${encodeURIComponent(sourceFileName)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Could not load customer details.');
        resetOrder();
        return;
      }
      setCurrentFileName('');
      setOrderNumber('---');
      setBillFileName('');
      setStatus('draft');
      setPaid(false);
      setCustomerName(data.customerName || '');
      setFlatName(data.flatName || '');
      setFlatNumber(data.flatNumber || '');
      setCustomerPhone(data.customerPhone || '');
      setDate(today);
      setItems([emptyItem]);
      skipResetRef.current = true;
      router.replace('/order', undefined, { shallow: true });
    } catch (error) {
      alert('Could not create another order.');
      resetOrder();
    } finally {
      setLoading(false);
    }
  }

  function createAnotherOrder() {
    if (!currentFileName) return;
    router.push(`/order?copyFrom=${encodeURIComponent(currentFileName)}`);
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
    if (!confirm('Remove this item from the order?')) return;
    setItems(current => {
      const next = current.filter((_, idx) => idx !== index);
      return next.length ? next : [emptyItem];
    });
  }

  function collectOrderData(targetStatus, paidState = paid) {
    return {
      fileName: currentFileName || null,
      orderNumber: orderNumber === '---' ? null : orderNumber,
      billFileName: billFileName || null,
      customerName: customerName.trim(),
      flatName: flatName.trim(),
      flatNumber: flatNumber.trim(),
      customerPhone: customerPhone.trim(),
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

  function validateRequired() {
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Please enter customer name and mobile number.');
      return false;
    }
    if (!flatName.trim() || !flatNumber.trim()) {
      alert('Please enter flat name and flat number.');
      return false;
    }
    return true;
  }

  async function persistOrder(targetStatus, paidState = paid, message) {
    const payload = collectOrderData(targetStatus, paidState);
    const res = await fetch('/api/update-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(result.error || 'Unable to save order.');
      return false;
    }
    setCurrentFileName(result.fileName);
    setOrderNumber(result.orderNumber || orderNumber);
    setBillFileName(result.billFileName || billFileName);
    setStatus(result.status || targetStatus);
    setPaid(result.paid ?? paidState);
    await loadFlatNames();
    router.replace({ pathname: '/order', query: { fileName: result.fileName } }, undefined, { shallow: true });
    alert(message || (targetStatus === 'delivered' ? 'Order marked as delivered. Linked bill updated.' : 'Order draft saved. Linked draft bill created/updated.'));
    return true;
  }

  async function saveDraft() {
    if (!validateRequired()) return;
    await persistOrder('draft', paid, 'Order draft saved. Linked draft bill created/updated.');
  }

  async function markDelivered() {
    if (!validateRequired()) return;
    await persistOrder('delivered', paid, 'Order marked as delivered. Linked bill updated.');
  }

  async function unmarkDelivered() {
    if (!isDelivered) return;
    if (!confirm('Move this order back to draft?\n\nThe linked bill will also return to draft so you can edit again.')) return;
    setLoading(true);
    try {
      await persistOrder('draft', paid, 'Order moved back to draft. Linked bill updated.');
    } finally {
      setLoading(false);
    }
  }

  async function markPaid() {
    if (paid) return;
    if (!validateRequired()) return;
    await persistOrder(status, true, 'Order marked as paid. Linked bill updated.');
  }

  async function deleteCurrentOrder() {
    if (!currentFileName) {
      alert('No order selected to delete.');
      return;
    }
    if (!confirm('Warning: Delete this order permanently?\n\nThe linked draft bill will also be deleted. This cannot be undone.')) return;
    const res = await fetch('/api/delete-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: currentFileName })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert('Could not delete order: ' + (err.error || 'Unknown error'));
      return;
    }
    router.push('/?tab=orders');
  }

  return (
    <>
      <Head>
        <title>Order Editor</title>
      </Head>

      <div className='page'>
        <div className='header'>
          <div className='header-main'>
            <IconBtn href='/?tab=orders' label='Back to Orders'>{icons.back}</IconBtn>
            <a className='brand-link' href='/' aria-label='Go to home'>
              <img className='header-logo' src='/logo.png' alt='Leaf & Life logo' />
            </a>
            <div className='header-title'>
              <h1>Order Editor</h1>
              <p>Create orders for flat deliveries. Saving creates a linked draft bill automatically.</p>
            </div>
          </div>
          <div className='actions' role='toolbar' aria-label='Order actions'>
            {canCreateAnother && (
              <IconBtn onClick={createAnotherOrder} disabled={loading} label='Create Another Order'>{icons.plus}</IconBtn>
            )}
            {billFileName && (
              <IconBtn href={`/bill?fileName=${encodeURIComponent(billFileName)}`} label='Open Linked Bill'>{icons.bill}</IconBtn>
            )}
            {!isDelivered && (
              <IconBtn primary onClick={markDelivered} disabled={loading} label='Mark as Delivered'>{icons.deliver}</IconBtn>
            )}
            {isDelivered && (
              <IconBtn onClick={unmarkDelivered} disabled={loading} label='Unmark Delivered'>{icons.undo}</IconBtn>
            )}
            {!paid ? (
              <IconBtn onClick={markPaid} disabled={loading} label='Mark as Paid'>{icons.pay}</IconBtn>
            ) : (
              <IconBtn disabled label='Paid'>{icons.paid}</IconBtn>
            )}
            <IconBtn danger onClick={deleteCurrentOrder} label='Delete Order'>{icons.trash}</IconBtn>
          </div>
        </div>

        <div className='panel'>
          <div className='grid'>
            <div className='field'>
              <label>Order #</label>
              <div className='status-pill'>{orderNumber}</div>
            </div>
            <div className='field'>
              <label>Status</label>
              <div className='status-pill'>{`${status === 'delivered' ? 'Delivered' : 'Draft'} · ${paid ? 'Paid' : 'Pending'}`}</div>
            </div>
            <div className='field'>
              <label>Customer Name</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} disabled={isDelivered} placeholder='Customer name' />
            </div>
            <div className='field'>
              <label>Mobile Number</label>
              <input type='tel' value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} disabled={isDelivered} placeholder='Mobile number' />
            </div>
            <div className='field'>
              <label>Flat Name</label>
              <input
                list='flat-name-options'
                value={flatName}
                onChange={e => setFlatName(e.target.value)}
                disabled={isDelivered}
                placeholder='Select or type flat / apartment name'
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
              <input value={flatNumber} onChange={e => setFlatNumber(e.target.value)} disabled={isDelivered} placeholder='Flat number' />
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
                      <td>
                        <span className='item-line-label'>Product</span>
                        <input value={item.product} disabled={isDelivered} onChange={e => updateItem(index, 'product', e.target.value)} placeholder='Product' />
                      </td>
                      <td>
                        <span className='item-line-label'>Qty</span>
                        <input type='number' min='0' value={item.qty} disabled={isDelivered} onChange={e => updateItem(index, 'qty', e.target.value)} />
                      </td>
                      <td>
                        <span className='item-line-label'>Price</span>
                        <input type='number' step='0.01' min='0' value={item.price === '' || item.price == null ? '' : item.price} disabled={isDelivered} onChange={e => updateItem(index, 'price', e.target.value)} />
                      </td>
                      <td>
                        <span className='item-line-label'>Total</span>
                        ₹ {(Number(item.qty || 0) * Number(item.price || 0)).toFixed(2)}
                      </td>
                      <td>
                        <IconBtn danger disabled={isDelivered} onClick={() => removeItem(index)} label='Remove item'>
                          {icons.trash}
                        </IconBtn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className='button secondary add-row-btn' onClick={addItem} disabled={isDelivered}>
              <span className='btn-icon'>{icons.plus}</span>
              Add Item
            </button>
            {!isDelivered && (
              <button className='button save-draft-btn' onClick={saveDraft} disabled={loading}>
                <span className='btn-icon'>{icons.save}</span>
                Save Draft
              </button>
            )}
          </div>

          <div className='total'><span>Total</span><span>₹ {total.toFixed(2)}</span></div>
        </div>
      </div>

      <style jsx>{`
        :global(html),:global(body){margin:0;max-width:100%;overflow-x:hidden}
        :global(body){font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#f4f8f4 0%,#eaf4ea 100%);color:#223126}
        .page{max-width:1000px;margin:24px auto;padding:24px;width:100%;box-sizing:border-box;overflow-x:hidden}
        .header{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
        .header-main{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
        .header-title{min-width:0}
        .brand-link{display:inline-flex;flex-shrink:0;line-height:0}
        .header-logo{width:52px;height:52px;object-fit:contain;display:block}
        .header h1{margin:0;color:#2e7d32;font-size:28px}
        .header p{margin:6px 0 0;color:#4f6b53;max-width:580px}
        .actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:flex-end}
        :global(.icon-btn){display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;min-width:44px;min-height:44px;padding:0;border-radius:12px;border:1px solid #d7e6da;background:#f2f7f2;color:#2e7d32;cursor:pointer;text-decoration:none;flex-shrink:0;font-family:inherit;box-sizing:border-box}
        :global(.icon-btn.primary){background:#2e7d32;color:#fff;border-color:#2e7d32}
        :global(.icon-btn.danger){background:#fff;color:#c62828;border-color:#f2c7c7}
        :global(.icon-btn:disabled){opacity:.45;cursor:not-allowed}
        :global(.icon-btn svg){display:block}
        button.button,a.button{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:10px;padding:10px 14px;background:#2e7d32;color:#fff;text-decoration:none;cursor:pointer;font-weight:700;min-height:40px;font-size:15px;line-height:1.3;font-family:inherit}
        .button.secondary{background:#f2f7f2;color:#2e7d32;border:1px solid #d7e6da}
        .btn-icon{display:inline-flex;align-items:center;line-height:0}
        .btn-icon :global(svg){display:block}
        .panel{background:#fff;border-radius:18px;padding:24px;box-shadow:0 18px 40px rgba(26,61,35,.08);margin-top:18px;max-width:100%;box-sizing:border-box;overflow:hidden}
        .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}
        .field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;min-width:0}
        label{font-size:11px;color:#6b7a6f;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
        input{width:100%;padding:11px 12px;border:1px solid #dbe7de;border-radius:10px;background:#fcfdfc;box-sizing:border-box;font-size:16px;font-family:inherit;max-width:100%}
        input:focus{outline:none;border-color:#2e7d32}
        .table-shell{border:1px solid #e8efe9;border-radius:14px;overflow:hidden;background:#fff;margin-top:10px;max-width:100%}
        .add-row-btn{margin-top:12px;align-self:flex-start}
        .save-draft-btn{margin-top:10px;align-self:stretch;width:100%}
        table{width:100%;border-collapse:collapse;min-width:0}
        th,td{padding:12px 12px;border-bottom:1px solid #e8efe9;text-align:left;vertical-align:middle}
        th{background:#f5faf5;color:#2e7d32;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
        .total{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:18px;padding:14px 18px;border:1px solid #dce8de;border-radius:12px;background:#f7fbf7;width:fit-content;margin-left:auto;font-weight:700;color:#1b5e20;box-sizing:border-box}
        .status-pill{display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;border-radius:999px;background:#eef7ed;color:#2e7d32;font-weight:700}
        .item-line-label{display:none}
        @media (max-width:900px){
          .grid{grid-template-columns:1fr}
          .actions{justify-content:flex-start}
          .page{margin:0;padding:14px 12px 24px;max-width:none}
          .panel{padding:18px;margin-top:14px;border-radius:14px}
          .status-pill{justify-content:flex-start;text-align:left;width:fit-content;max-width:100%;white-space:normal}
        }
        @media (max-width:700px){
          .header{align-items:stretch;flex-direction:column;gap:12px}
          .header-main{width:100%}
          .header h1{font-size:22px}
          .header p{display:none}
          .header-logo{width:40px;height:40px}
          .actions{width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(48px,1fr));gap:8px;justify-content:stretch}
          :global(.actions .icon-btn){width:100%;height:48px;min-width:0}
          .add-row-btn,.save-draft-btn{font-size:16px;padding:12px 16px;min-height:48px;width:100%;box-sizing:border-box}
          .table-shell{border:none;background:transparent;overflow:visible}
          .table-shell table,.table-shell tbody{display:block;width:100%}
          .table-shell thead{display:none}
          .table-shell tr{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px;border:1px solid #e0ebe2;border-radius:12px;padding:12px;margin-bottom:10px;background:#fcfdfc}
          .table-shell td{display:block;border:none;padding:0;min-width:0}
          .table-shell td:nth-child(1){grid-column:1 / -1}
          .table-shell td:nth-child(4){display:flex;align-items:flex-end;font-weight:700;color:#1b5e20;padding-bottom:10px}
          .table-shell td:nth-child(5){grid-column:1 / -1;display:flex;justify-content:flex-end}
          .item-line-label{display:block;font-size:11px;color:#6b7a6f;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px}
          .total{width:100%;justify-content:space-between}
        }
      `}</style>
    </>
  );
}
