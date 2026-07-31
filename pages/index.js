import Head from 'next/head';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const allBills = useMemo(
    () => [...drafts, ...delivered].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    ),
    [drafts, delivered]
  );

  const notDeliveredBills = useMemo(
    () => allBills.filter(bill => bill.status !== 'delivered'),
    [allBills]
  );

  const deliveredUnpaidBills = useMemo(
    () => allBills.filter(bill => bill.status === 'delivered' && !bill.paid),
    [allBills]
  );

  const deliveredPaidBills = useMemo(
    () => allBills.filter(bill => bill.status === 'delivered' && bill.paid),
    [allBills]
  );

  function billTotalQty(bill) {
    if (!Array.isArray(bill.items)) return 0;
    return bill.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }

  function groupByFlatName(list) {
    const groups = new Map();
    for (const item of list) {
      const key = (item.flatName || '').trim() || 'No flat name';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    return Array.from(groups.entries())
      .sort((a, b) => {
        if (a[0] === 'No flat name') return 1;
        if (b[0] === 'No flat name') return -1;
        return a[0].localeCompare(b[0], undefined, { sensitivity: 'base' });
      })
      .map(([flatName, items]) => ({
        flatName,
        items: items.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      }));
  }

  function renderOrdersTable(list, emptyMessage, { showPaid = false } = {}) {
    if (loading) {
      return <p className='ll-empty'>Loading orders…</p>;
    }
    if (list.length === 0) {
      return <p className='ll-empty'>{emptyMessage}</p>;
    }

    const colSpan = showPaid ? 8 : 7;
    const groups = groupByFlatName(list);
    return (
      <div className='ll-table-scroll'>
        <table className='ll-table'>
          <thead>
            <tr>
              <th className='col-num'>Order #</th>
              <th className='col-customer'>Customer</th>
              <th className='col-flatno'>Flat #</th>
              <th className='col-date'>Date</th>
              <th className='col-qty'>Qty</th>
              <th className='col-total'>Total</th>
              {showPaid && <th className='col-paid'>Paid</th>}
              <th className='col-action'>Action</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <Fragment key={group.flatName}>
                <tr className='ll-flat-row'>
                  <td colSpan={colSpan}>
                    {group.flatName}
                    <span className='ll-flat-count'>({group.items.length})</span>
                  </td>
                </tr>
                {group.items.map(order => (
                  <tr key={order.fileName}>
                    <td className='col-num'>
                      <a className='ll-number-link' href={`/order?fileName=${encodeURIComponent(order.fileName)}`}>
                        {order.orderNumber || '—'}
                      </a>
                    </td>
                    <td className='col-customer'>{order.customerName || '—'}</td>
                    <td className='col-flatno'>{order.flatNumber || '—'}</td>
                    <td className='col-date'>{order.date || '—'}</td>
                    <td className='col-qty'>{orderTotalQty(order)}</td>
                    <td className='col-total'>₹ {Number(order.total || 0).toFixed(2)}</td>
                    {showPaid && (
                      <td className='col-paid'>
                        <span className={`ll-paid-badge ${order.paid ? 'is-paid' : 'is-unpaid'}`}>
                          {order.paid ? 'Paid' : 'Not Yet'}
                        </span>
                      </td>
                    )}
                    <td className='col-action'>
                      <div className='ll-actions'>
                        <button
                          type='button'
                          className='ll-btn secondary ll-icon-btn'
                          onClick={() => deleteOrder(order.fileName)}
                          aria-label='Delete order'
                          title='Delete'
                        >
                          <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden='true' focusable='false'>
                            <path fill='currentColor' d='M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z' />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderBillsTable(list, emptyMessage, { showPaid = false } = {}) {
    if (loading) {
      return <p className='ll-empty'>Loading bills…</p>;
    }
    if (list.length === 0) {
      return <p className='ll-empty'>{emptyMessage}</p>;
    }

    const colSpan = showPaid ? 8 : 7;
    const groups = groupByFlatName(list);
    return (
      <div className='ll-table-scroll'>
        <table className='ll-table'>
          <thead>
            <tr>
              <th className='col-num'>Bill #</th>
              <th className='col-customer'>Customer</th>
              <th className='col-flatno'>Flat #</th>
              <th className='col-date'>Date</th>
              <th className='col-qty'>Qty</th>
              <th className='col-total'>Total</th>
              {showPaid && <th className='col-paid'>Paid</th>}
              <th className='col-action'>Action</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <Fragment key={group.flatName}>
                <tr className='ll-flat-row'>
                  <td colSpan={colSpan}>
                    {group.flatName}
                    <span className='ll-flat-count'>({group.items.length})</span>
                  </td>
                </tr>
                {group.items.map(bill => (
                  <tr key={bill.fileName}>
                    <td className='col-num'>
                      <a className='ll-number-link' href={`/bill?fileName=${encodeURIComponent(bill.fileName)}`}>
                        {bill.billNumber || '—'}
                      </a>
                    </td>
                    <td className='col-customer'>{bill.customerName || '—'}</td>
                    <td className='col-flatno'>{bill.flatNumber || '—'}</td>
                    <td className='col-date'>{bill.date || '—'}</td>
                    <td className='col-qty'>{billTotalQty(bill)}</td>
                    <td className='col-total'>₹ {Number(bill.total || 0).toFixed(2)}</td>
                    {showPaid && (
                      <td className='col-paid'>
                        <span className={`ll-paid-badge ${bill.paid ? 'is-paid' : 'is-unpaid'}`}>
                          {bill.paid ? 'Paid' : 'Not Yet'}
                        </span>
                      </td>
                    )}
                    <td className='col-action'>
                      <div className='ll-actions'>
                        <button
                          type='button'
                          className='ll-btn secondary ll-icon-btn'
                          onClick={() => deleteBill(bill.fileName)}
                          aria-label='Delete bill'
                          title='Delete'
                        >
                          <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden='true' focusable='false'>
                            <path fill='currentColor' d='M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z' />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
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
              {renderOrdersTable(notDeliveredOrders, 'No undelivered orders.', { showPaid: true })}
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
          <div className='ll-grid'>
            <section className='ll-panel'>
              <h2>Not Delivered</h2>
              {renderBillsTable(notDeliveredBills, 'No undelivered bills.', { showPaid: true })}
            </section>
            <section className='ll-panel'>
              <h2>Delivered · Not Paid</h2>
              {renderBillsTable(deliveredUnpaidBills, 'No delivered unpaid bills.')}
            </section>
            <section className='ll-panel'>
              <h2>Delivered · Paid</h2>
              {renderBillsTable(deliveredPaidBills, 'No delivered paid bills.')}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
