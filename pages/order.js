import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

const today = new Date().toISOString().slice(0, 10);
const emptyItem = { product: '', qty: 1, price: '' };

export default function OrderPage() {
  const router = useRouter();
  const { fileName } = router.query;

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

  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0), [items]);
  const isDelivered = status === 'delivered';

  useEffect(() => {
    if (!router.isReady) return;
    if (fileName) {
      loadOrder(fileName);
    } else {
      resetOrder();
    }
  }, [router.isReady, fileName]);

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
      return;
    }
    setCurrentFileName(result.fileName);
    setOrderNumber(result.orderNumber || orderNumber);
    setBillFileName(result.billFileName || billFileName);
    setStatus(result.status || targetStatus);
    setPaid(result.paid ?? paidState);
    router.replace({ pathname: '/order', query: { fileName: result.fileName } }, undefined, { shallow: true });
    alert(message || (targetStatus === 'delivered' ? 'Order marked as delivered.' : 'Order draft saved. Linked draft bill created/updated.'));
  }

  async function saveDraft() {
    if (!validateRequired()) return;
    await persistOrder('draft', paid, 'Order draft saved. Linked draft bill created/updated.');
  }

  async function markDelivered() {
    if (!validateRequired()) return;
    await persistOrder('delivered', paid, 'Order marked as delivered. Linked bill updated.');
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
          <div>
            <h1>Order Editor</h1>
            <p>Create orders for flat deliveries. Saving creates a linked draft bill automatically.</p>
          </div>
          <div className='actions'>
            <a className='button secondary' href='/?tab=orders'>Back to Orders</a>
            {billFileName && (
              <a className='button secondary' href={`/bill?fileName=${encodeURIComponent(billFileName)}`}>Open Linked Bill</a>
            )}
            <button className='button secondary delete-action' onClick={deleteCurrentOrder}>Delete Order</button>
            {!isDelivered && <button className='button secondary' onClick={saveDraft} disabled={loading}>Save Draft</button>}
            {!isDelivered && <button className='button' onClick={markDelivered} disabled={loading}>Mark as Delivered</button>}
            {!paid ? (
              <button className='button secondary' onClick={markPaid} disabled={loading}>Mark as Paid</button>
            ) : (
              <button className='button secondary' disabled>Paid</button>
            )}
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
              <div className='status-pill'>{`${status === 'delivered' ? 'Delivered' : 'Draft'} · ${paid ? 'Paid' : 'Not Paid Yet'}`}</div>
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
              <input value={flatName} onChange={e => setFlatName(e.target.value)} disabled={isDelivered} placeholder='Flat / apartment name' />
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
                      <td><input value={item.product} disabled={isDelivered} onChange={e => updateItem(index, 'product', e.target.value)} placeholder='Product' /></td>
                      <td><input type='number' min='0' value={item.qty} disabled={isDelivered} onChange={e => updateItem(index, 'qty', e.target.value)} /></td>
                      <td><input type='number' step='0.01' min='0' value={item.price === '' || item.price == null ? '' : item.price} disabled={isDelivered} onChange={e => updateItem(index, 'price', e.target.value)} /></td>
                      <td>₹ {(Number(item.qty || 0) * Number(item.price || 0)).toFixed(2)}</td>
                      <td><button className='delete-btn' type='button' disabled={isDelivered} onClick={() => removeItem(index)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className='button secondary add-row-btn' onClick={addItem} disabled={isDelivered}>+ Add Item</button>
          </div>

          <div className='total'><span>Total</span><span>₹ {total.toFixed(2)}</span></div>
        </div>
      </div>

      <style jsx>{`
        :global(body){margin:0;font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#f4f8f4 0%,#eaf4ea 100%);color:#223126}
        .page{max-width:1000px;margin:24px auto;padding:24px}
        .header{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
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
        table{width:100%;border-collapse:collapse}
        th,td{padding:12px 12px;border-bottom:1px solid #e8efe9;text-align:left}
        th{background:#f5faf5;color:#2e7d32;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
        .delete-btn{background:#fff;color:#c62828;border:1px solid #f2c7c7;padding:8px 10px;border-radius:10px}
        .total{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:18px;padding:14px 18px;border:1px solid #dce8de;border-radius:12px;background:#f7fbf7;width:fit-content;margin-left:auto;font-weight:700;color:#1b5e20}
        .status-pill{display:inline-flex;align-items:center;justify-content:center;padding:8px 14px;border-radius:999px;background:#eef7ed;color:#2e7d32;font-weight:700}
        @media (max-width:900px){
          .grid{grid-template-columns:1fr}
          .actions{justify-content:flex-start}
          .page{margin:0 auto;padding:16px}
          .panel{padding:18px;margin-top:14px}
          .status-pill{justify-content:flex-start;text-align:left;width:fit-content;max-width:100%;white-space:normal}
        }
        @media (max-width:700px){
          .header{align-items:flex-start;flex-direction:column}
          .actions{width:100%;justify-content:flex-start;gap:8px}
          .actions button,.actions a.button{width:100%;box-sizing:border-box;font-size:16px;padding:12px 16px;min-height:48px;line-height:1.35}
          .add-row-btn{font-size:16px;padding:12px 16px;min-height:48px}
          .table-shell{overflow-x:auto;-webkit-overflow-scrolling:touch}
          .table-shell table{min-width:520px}
          .total{width:100%;justify-content:space-between;box-sizing:border-box}
          input{font-size:16px}
        }
      `}</style>
    </>
  );
}
