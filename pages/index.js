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
        <span className='ll-flat-hint'>{flatBits}</span>
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
      <div className='ll-table-scroll'>
        <table className='ll-table'>
          <thead>
            <tr>
              <th className='col-num'>Order #</th>
              <th className='col-customer'>Customer</th>
              <th className='col-flat'>Flat Name</th>
              <th className='col-flatno'>Flat #</th>
              <th className='col-date'>Date</th>
              <th className='col-qty'>Qty</th>
              <th className='col-total'>Total</th>
              <th className='col-action'>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan='8' className='ll-empty'>Loading orders…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan='8' className='ll-empty'>{emptyMessage}</td></tr>
            ) : list.map(order => (
              <tr key={order.fileName}>
                <td className='col-num'>
                  <a className='ll-number-link' href={`/order?fileName=${encodeURIComponent(order.fileName)}`}>
                    {order.orderNumber || '—'}
                  </a>
                </td>
                <td className='col-customer'>{order.customerName || '—'}</td>
                <td className='col-flat'>{order.flatName || '—'}</td>
                <td className='col-flatno'>{order.flatNumber || '—'}</td>
                <td className='col-date'>{order.date || '—'}</td>
                <td className='col-qty'>{orderTotalQty(order)}</td>
                <td className='col-total'>₹ {Number(order.total || 0).toFixed(2)}</td>
                <td className='col-action'>
                  <div className='ll-actions'>
                    <button type='button' className='ll-btn secondary' onClick={() => deleteOrder(order.fileName)}>Delete</button>
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

      <div className='ll-page'>
        <header className='ll-header'>
          <div className='ll-brand'>
            <a className='ll-brand-link' href='/' aria-label='Go to home'>
              <img src='/logo.png' alt='Leaf & Life logo' />
            </a>
            <div className='ll-brand-title'>
              <h1>Leaf & Life</h1>
              <p>Orders and bills, sorted by most recent activity.</p>
            </div>
          </div>
          <div className='ll-top-actions'>
            {tab === 'orders' ? (
              <a className='ll-btn' href='/order'>Create New Order</a>
            ) : (
              <a className='ll-btn' href='/bill'>Create New Bill</a>
            )}
            <button type='button' className='ll-btn' onClick={loadAll}>Refresh</button>
          </div>
        </header>

        <div className='ll-tabs'>
          <button type='button' className={tab === 'orders' ? 'll-tab active' : 'll-tab'} onClick={() => selectTab('orders')}>Orders</button>
          <button type='button' className={tab === 'bills' ? 'll-tab active' : 'll-tab'} onClick={() => selectTab('bills')}>Bills</button>
        </div>

        {tab === 'orders' ? (
          <div className='ll-grid'>
            <section className='ll-panel'>
              <h2>Not Delivered</h2>
              {renderOrdersTable(notDeliveredOrders, 'No undelivered orders.')}
            </section>
            <section className='ll-panel'>
              <h2>Delivered · Not Paid</h2>
              {renderOrdersTable(deliveredUnpaidOrders, 'No delivered unpaid orders.')}
            </section>
            <section className='ll-panel'>
              <h2>Delivered · Paid</h2>
              {renderOrdersTable(deliveredPaidOrders, 'No delivered paid orders.')}
            </section>
          </div>
        ) : (
          <section className='ll-panel'>
            <div className='ll-panel-header'>
              <h2>Bills</h2>
              <div className='ll-filters'>
                <label className='ll-filter'>
                  <span>Status</span>
                  <select value={billStatusFilter} onChange={e => setBillStatusFilter(e.target.value)}>
                    <option value='all'>All</option>
                    <option value='draft'>Draft</option>
                    <option value='delivered'>Delivered</option>
                  </select>
                </label>
                <label className='ll-filter'>
                  <span>Paid</span>
                  <select value={billPaidFilter} onChange={e => setBillPaidFilter(e.target.value)}>
                    <option value='all'>All</option>
                    <option value='paid'>Paid</option>
                    <option value='unpaid'>Not Paid</option>
                  </select>
                </label>
              </div>
            </div>
            <div className='ll-table-scroll'>
              <table className='ll-table bills'>
                <thead>
                  <tr>
                    <th className='col-num'>Bill #</th>
                    <th className='col-customer'>Customer</th>
                    <th className='col-date'>Date</th>
                    <th className='col-total'>Total</th>
                    <th className='col-status'>Status</th>
                    <th className='col-paid'>Paid</th>
                    <th className='col-action'>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan='7' className='ll-empty'>Loading bills…</td></tr>
                  ) : drafts.length + delivered.length === 0 ? (
                    <tr><td colSpan='7' className='ll-empty'>No bills yet.</td></tr>
                  ) : filteredBills.length === 0 ? (
                    <tr><td colSpan='7' className='ll-empty'>No bills match the selected filters.</td></tr>
                  ) : filteredBills.map(bill => (
                    <tr key={bill.fileName}>
                      <td className='col-num'>
                        <a className='ll-number-link' href={`/bill?fileName=${encodeURIComponent(bill.fileName)}`}>
                          {bill.billNumber || '—'}
                        </a>
                      </td>
                      <td className='col-customer'>{customerCell(bill)}</td>
                      <td className='col-date'>{bill.date || '—'}</td>
                      <td className='col-total'>₹ {Number(bill.total || 0).toFixed(2)}</td>
                      <td className='col-status'>
                        <span className={`ll-badge ${bill.status === 'delivered' ? 'delivered' : 'draft'}`}>
                          {bill.status === 'delivered' ? 'Delivered' : 'Draft'}
                        </span>
                      </td>
                      <td className='col-paid'>
                        <span className={`ll-badge ${bill.paid ? 'paid' : 'unpaid'}`}>
                          {bill.paid ? 'Paid' : 'Not Paid'}
                        </span>
                      </td>
                      <td className='col-action'>
                        <div className='ll-actions'>
                          <button type='button' className='ll-btn secondary' onClick={() => deleteBill(bill.fileName)}>Delete</button>
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
    </>
  );
}
