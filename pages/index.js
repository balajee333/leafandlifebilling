import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billStatusFilter, setBillStatusFilter] = useState('all');
  const [billPaidFilter, setBillPaidFilter] = useState('all');

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const nextTab = router.query.tab === 'bills' ? 'bills' : 'orders';
    setTab(nextTab);
  }, [router.isReady, router.query.tab]);

  function selectTab(nextTab) {
    setTab(nextTab);
    router.replace(
      { pathname: '/', query: nextTab === 'orders' ? {} : { tab: nextTab } },
      undefined,
      { shallow: true }
    );
  }

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
    if (!confirm('Warning: Delete this bill permanently?\n\nThis cannot be undone.')) return;
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
    if (!confirm('Warning: Delete this order permanently?\n\nThe linked draft bill will also be deleted. This cannot be undone.')) return;
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

  function orderTotalQty(order) {
    if (!Array.isArray(order.items)) return 0;
    return order.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }

  const notDeliveredOrders = useMemo(
    () => orders.filter(order => order.status !== 'delivered'),
    [orders]
  );

  const deliveredUnpaidOrders = useMemo(
    () => orders.filter(order => order.status === 'delivered' && !order.paid),
    [orders]
  );

  const deliveredPaidOrders = useMemo(
    () => orders.filter(order => order.status === 'delivered' && order.paid),
    [orders]
  );

  function matchesPaidFilter(item, filter) {
    if (filter === 'paid' && !item.paid) return false;
    if (filter === 'unpaid' && item.paid) return false;
    return true;
  }

  const filteredBills = useMemo(() => {
    const all = [...drafts, ...delivered].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    );
    return all.filter(bill => {
      if (billStatusFilter === 'delivered' && bill.status !== 'delivered') return false;
      if (billStatusFilter === 'draft' && bill.status === 'delivered') return false;
      return matchesPaidFilter(bill, billPaidFilter);
    });
  }, [drafts, delivered, billStatusFilter, billPaidFilter]);

  function renderOrdersTable(list, emptyMessage) {
    return (
      <div className='table-scroll'>
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Flat Name</th>
              <th>Flat #</th>
              <th>Date</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan='8' className='empty'>Loading orders…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan='8' className='empty'>{emptyMessage}</td></tr>
            ) : list.map(order => (
              <tr key={order.fileName}>
                <td>
                  <a className='number-link' href={`/order?fileName=${encodeURIComponent(order.fileName)}`}>
                    {order.orderNumber || '—'}
                  </a>
                </td>
                <td>{order.customerName || '—'}</td>
                <td>{order.flatName || '—'}</td>
                <td>{order.flatNumber || '—'}</td>
                <td>{order.date || '—'}</td>
                <td>{orderTotalQty(order)}</td>
                <td>₹ {Number(order.total || 0).toFixed(2)}</td>
                <td>
                  <div className='actions'>
                    <button className='button secondary' onClick={() => deleteOrder(order.fileName)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
            <a className='brand-link' href='/' aria-label='Go to home'>
              <img src='/logo.png' alt='Leaf & Life logo' />
            </a>
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
          <button className={tab === 'orders' ? 'tab active' : 'tab'} onClick={() => selectTab('orders')}>Orders</button>
          <button className={tab === 'bills' ? 'tab active' : 'tab'} onClick={() => selectTab('bills')}>Bills</button>
        </div>

        {tab === 'orders' ? (
          <div className='grid'>
            <section className='panel'>
              <h2>Not Delivered</h2>
              {renderOrdersTable(notDeliveredOrders, 'No undelivered orders.')}
            </section>
            <section className='panel'>
              <h2>Delivered · Not Paid</h2>
              {renderOrdersTable(deliveredUnpaidOrders, 'No delivered unpaid orders.')}
            </section>
            <section className='panel'>
              <h2>Delivered · Paid</h2>
              {renderOrdersTable(deliveredPaidOrders, 'No delivered paid orders.')}
            </section>
          </div>
        ) : (
          <section className='panel'>
            <div className='panel-header'>
              <h2>Bills</h2>
              <div className='filters'>
                <label className='filter'>
                  <span>Status</span>
                  <select value={billStatusFilter} onChange={e => setBillStatusFilter(e.target.value)}>
                    <option value='all'>All</option>
                    <option value='draft'>Draft</option>
                    <option value='delivered'>Delivered</option>
                  </select>
                </label>
                <label className='filter'>
                  <span>Paid</span>
                  <select value={billPaidFilter} onChange={e => setBillPaidFilter(e.target.value)}>
                    <option value='all'>All</option>
                    <option value='paid'>Paid</option>
                    <option value='unpaid'>Not Paid</option>
                  </select>
                </label>
              </div>
            </div>
            <div className='table-scroll'>
              <table>
                <thead>
                  <tr>
                    <th>Bill #</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Paid</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan='7' className='empty'>Loading bills…</td></tr>
                  ) : drafts.length + delivered.length === 0 ? (
                    <tr><td colSpan='7' className='empty'>No bills yet.</td></tr>
                  ) : filteredBills.length === 0 ? (
                    <tr><td colSpan='7' className='empty'>No bills match the selected filters.</td></tr>
                  ) : filteredBills.map(bill => (
                    <tr key={bill.fileName}>
                      <td>
                        <a className='number-link' href={`/bill?fileName=${encodeURIComponent(bill.fileName)}`}>
                          {bill.billNumber || '—'}
                        </a>
                      </td>
                      <td>{customerCell(bill)}</td>
                      <td>{bill.date || '—'}</td>
                      <td>₹ {Number(bill.total || 0).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${bill.status === 'delivered' ? 'delivered' : 'draft'}`}>
                          {bill.status === 'delivered' ? 'Delivered' : 'Draft'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${bill.paid ? 'paid' : 'unpaid'}`}>
                          {bill.paid ? 'Paid' : 'Not Paid'}
                        </span>
                      </td>
                      <td>
                        <div className='actions'>
                          <button className='button secondary' onClick={() => deleteBill(bill.fileName)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <style jsx>{`
        :global(body){margin:0;font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#f4f8f4 0%,#eaf4ea 100%);color:#223126;}
        .page{max-width:1100px;margin:24px auto;padding:24px}
        .header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
        .brand{display:flex;align-items:center;gap:12px}
        .brand-link{display:inline-flex;flex-shrink:0;line-height:0}
        .brand img{width:52px;height:52px;object-fit:contain;display:block}
        .brand-title h1{margin:0;color:#2e7d32}
        .brand-title p{margin:4px 0 0;color:#4f6b53}
        .top-actions{display:flex;gap:10px;flex-wrap:wrap}
        .tabs{display:flex;gap:8px;margin-bottom:18px;width:100%}
        .tab{border:1px solid #d7e6da;background:#f2f7f2;color:#2e7d32;border-radius:10px;padding:10px 16px;font-weight:700;cursor:pointer;flex:1}
        .tab.active{background:#2e7d32;color:#fff;border-color:#2e7d32}
        button,a.button{display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:10px;padding:10px 14px;background:#2e7d32;color:#fff;text-decoration:none;cursor:pointer;font-weight:700}
        .button.secondary{background:#f2f7f2;color:#2e7d32;border:1px solid #d7e6da}
        .grid{display:grid;grid-template-columns:1fr;gap:18px}
        .panel{background:#fff;border-radius:18px;padding:18px;box-shadow:0 18px 40px rgba(26,61,35,.08)}
        .panel h2{margin:0 0 12px;font-size:18px;color:#2e7d32}
        .panel-header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
        .panel-header h2{margin:0}
        .filters{display:flex;gap:12px;flex-wrap:wrap}
        .filter{display:flex;flex-direction:column;gap:4px;font-size:11px;color:#6b7a6f;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
        .filter select{min-width:150px;padding:8px 10px;border:1px solid #dbe7de;border-radius:10px;background:#fcfdfc;color:#223126;font-weight:600;text-transform:none;letter-spacing:0;font-size:13px}
        table{width:100%;border-collapse:collapse}
        th,td{padding:12px 10px;border-bottom:1px solid #e8efe9;text-align:left;vertical-align:top}
        th{background:#f5faf5;color:#2e7d32;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
        .empty{color:#6b7a6f;font-style:italic}
        .actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .actions button{min-height:36px}
        .number-link{color:#2e7d32;font-weight:700;text-decoration:underline;text-underline-offset:2px}
        .number-link:hover{color:#1b5e20}
        .badge{display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700}
        .badge.paid,.badge.delivered{background:#2e7d32;color:#fff}
        .badge.unpaid,.badge.draft{background:#f2f7f2;color:#2e7d32;border:1px solid #d7e6da}
        .flat-hint{display:block;margin-top:4px;font-size:12px;color:#6b7a6f}
        .table-scroll{width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
        .table-scroll table{min-width:720px}
        @media (max-width:800px){
          .page{margin:0 auto;padding:16px}
          .header{align-items:flex-start}
          .brand{width:100%}
          .brand-title h1{font-size:22px}
          .brand-title p{font-size:13px}
          .top-actions{width:100%}
          .top-actions a,.top-actions button{flex:1;min-width:0}
          .tabs{width:100%}
          .tab{flex:1}
          .panel{padding:14px;border-radius:14px}
          .panel-header{align-items:stretch;flex-direction:column}
          .filters{width:100%}
          .filter{flex:1;min-width:140px}
          .filter select{width:100%;min-width:0;box-sizing:border-box}
          .actions{flex-direction:column;align-items:stretch}
          .actions .link,.actions button{width:100%;justify-content:center}
          th,td{padding:10px 8px;font-size:13px}
          .grid{grid-template-columns:1fr}
        }
        @media (max-width:480px){
          .page{padding:12px}
          .brand img{width:44px;height:44px}
          .table-scroll table{min-width:640px}
        }
      `}</style>
    </>
  );
}
