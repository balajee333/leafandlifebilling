import Head from 'next/head';
import { useEffect, useState } from 'react';

export default function Home() {
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [ordersRes, billsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/bills')
      ]);
      const ordersData = await ordersRes.json().catch(() => ({}));
      const billsData = await billsRes.json().catch(() => ({}));
      if (!ordersRes.ok) throw new Error(ordersData.error || 'Unable to load orders.');
      if (!billsRes.ok) throw new Error(billsData.error || 'Unable to load bills.');

      const orderList = Array.isArray(ordersData) ? ordersData : [];
      setOrders(orderList.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)));

      const bills = Array.isArray(billsData) ? billsData : [];
      const sorted = bills.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
      setDrafts(sorted.filter(bill => bill.status === 'draft'));
      setDelivered(sorted.filter(bill => bill.status === 'delivered'));
    } catch (error) {
      alert(error.message || 'Unable to load data.');
    } finally {
      setLoading(false);
    }
  }

  async function deleteBill(fileName) {
    if (!confirm('Delete this bill? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/delete-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('Could not delete bill: ' + (err.error || 'Unknown error'));
        return;
      }
      loadAll();
    } catch (error) {
      alert('Could not delete bill.');
    }
  }

  async function deleteOrder(fileName) {
    if (!confirm('Delete this order? Linked draft bill will also be deleted.')) return;
    try {
      const res = await fetch('/api/delete-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('Could not delete order: ' + (err.error || 'Unknown error'));
        return;
      }
      loadAll();
    } catch (error) {
      alert('Could not delete order.');
    }
  }

  function customerCell(bill) {
    const flatBits = [bill.flatName, bill.flatNumber].filter(Boolean).join(' · ');
    if (!flatBits) return bill.customerName || '—';
    return (
      <span>
        {bill.customerName || '—'}
        <span className='flat-hint'>{flatBits}</span>
      </span>
    );
  }

  return (
    <>
      <Head>
        <title>Leaf & Life</title>
      </Head>

      <div className='page'>
        <header className='header'>
          <div className='brand'>
            <img src='/logo.png' alt='Leaf & Life logo' />
            <div className='brand-title'>
              <h1>Leaf & Life</h1>
              <p>Orders and bills, sorted by most recent activity.</p>
            </div>
          </div>
          <div className='top-actions'>
            {tab === 'orders' ? (
              <a className='button' href='/order'>Create New Order</a>
            ) : (
              <a className='button' href='/bill'>Create New Bill</a>
            )}
            <button onClick={loadAll}>Refresh</button>
          </div>
        </header>

        <div className='tabs'>
          <button className={tab === 'orders' ? 'tab active' : 'tab'} onClick={() => setTab('orders')}>Orders</button>
          <button className={tab === 'bills' ? 'tab active' : 'tab'} onClick={() => setTab('bills')}>Bills</button>
        </div>

        {tab === 'orders' ? (
          <section className='panel'>
            <h2>Orders</h2>
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Flat Name</th>
                  <th>Flat #</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Paid</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan='9' className='empty'>Loading orders…</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan='9' className='empty'>No orders yet.</td></tr>
                ) : orders.map(order => (
                  <tr key={order.fileName}>
                    <td>{order.orderNumber || '—'}</td>
                    <td>{order.customerName || '—'}</td>
                    <td>{order.flatName || '—'}</td>
                    <td>{order.flatNumber || '—'}</td>
                    <td>{order.date || '—'}</td>
                    <td>₹ {Number(order.total || 0).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${order.status === 'delivered' ? 'delivered' : 'draft'}`}>
                        {order.status === 'delivered' ? 'Delivered' : 'Not Delivered'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${order.paid ? 'paid' : 'unpaid'}`}>
                        {order.paid ? 'Paid' : 'Not Paid Yet'}
                      </span>
                    </td>
                    <td>
                      <div className='actions'>
                        <a className='link' href={`/order?fileName=${encodeURIComponent(order.fileName)}`}>Open</a>
                        <button className='button secondary' onClick={() => deleteOrder(order.fileName)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          <div className='grid'>
            <section className='panel'>
              <h2>Draft Bills</h2>
              <table>
                <thead>
                  <tr><th>Bill #</th><th>Customer</th><th>Date</th><th>Total</th><th>Paid</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan='6' className='empty'>Loading bills…</td></tr>
                  ) : drafts.length === 0 ? (
                    <tr><td colSpan='6' className='empty'>No draft bills yet.</td></tr>
                  ) : drafts.map(bill => (
                    <tr key={bill.fileName}>
                      <td>{bill.billNumber}</td>
                      <td>{customerCell(bill)}</td>
                      <td>{bill.date || '—'}</td>
                      <td>₹ {Number(bill.total || 0).toFixed(2)}</td>
                      <td><span className={`badge ${bill.paid ? 'paid' : 'unpaid'}`}>{bill.paid ? 'Paid' : 'Not Paid'}</span></td>
                      <td>
                        <div className='actions'>
                          <a className='link' href={`/bill?fileName=${encodeURIComponent(bill.fileName)}`}>Open</a>
                          <button className='button secondary' onClick={() => deleteBill(bill.fileName)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className='panel'>
              <h2>Delivered Bills</h2>
              <table>
                <thead>
                  <tr><th>Bill #</th><th>Customer</th><th>Date</th><th>Total</th><th>Paid</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan='6' className='empty'>Loading bills…</td></tr>
                  ) : delivered.length === 0 ? (
                    <tr><td colSpan='6' className='empty'>No delivered bills yet.</td></tr>
                  ) : delivered.map(bill => (
                    <tr key={bill.fileName}>
                      <td>{bill.billNumber}</td>
                      <td>{customerCell(bill)}</td>
                      <td>{bill.date || '—'}</td>
                      <td>₹ {Number(bill.total || 0).toFixed(2)}</td>
                      <td><span className={`badge ${bill.paid ? 'paid' : 'unpaid'}`}>{bill.paid ? 'Paid' : 'Not Paid'}</span></td>
                      <td>
                        <div className='actions'>
                          <a className='link' href={`/bill?fileName=${encodeURIComponent(bill.fileName)}`}>Open</a>
                          <button className='button secondary' onClick={() => deleteBill(bill.fileName)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}
      </div>

      <style jsx>{`
        :global(body){margin:0;font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#f4f8f4 0%,#eaf4ea 100%);color:#223126;}
        .page{max-width:1100px;margin:24px auto;padding:24px}
        .header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
        .brand{display:flex;align-items:center;gap:12px}
        .brand img{width:52px;height:52px;object-fit:contain}
        .brand-title h1{margin:0;color:#2e7d32}
        .brand-title p{margin:4px 0 0;color:#4f6b53}
        .top-actions{display:flex;gap:10px;flex-wrap:wrap}
        .tabs{display:flex;gap:8px;margin-bottom:18px}
        .tab{border:1px solid #d7e6da;background:#f2f7f2;color:#2e7d32;border-radius:10px;padding:10px 16px;font-weight:700;cursor:pointer}
        .tab.active{background:#2e7d32;color:#fff;border-color:#2e7d32}
        button,a.button{display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:10px;padding:10px 14px;background:#2e7d32;color:#fff;text-decoration:none;cursor:pointer;font-weight:700}
        .button.secondary{background:#f2f7f2;color:#2e7d32;border:1px solid #d7e6da}
        .grid{display:grid;grid-template-columns:1fr;gap:18px}
        .panel{background:#fff;border-radius:18px;padding:18px;box-shadow:0 18px 40px rgba(26,61,35,.08)}
        .panel h2{margin:0 0 12px;font-size:18px;color:#2e7d32}
        table{width:100%;border-collapse:collapse}
        th,td{padding:12px 10px;border-bottom:1px solid #e8efe9;text-align:left;vertical-align:top}
        th{background:#f5faf5;color:#2e7d32;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
        .empty{color:#6b7a6f;font-style:italic}
        .actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .actions .link{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:8px 10px;border-radius:10px;text-decoration:none;color:#2e7d32;font-weight:700}
        .actions button{min-height:36px}
        .badge{display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700}
        .badge.paid,.badge.delivered{background:#2e7d32;color:#fff}
        .badge.unpaid,.badge.draft{background:#f2f7f2;color:#2e7d32;border:1px solid #d7e6da}
        .flat-hint{display:block;margin-top:4px;font-size:12px;color:#6b7a6f}
        @media (max-width:800px){.grid{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}
