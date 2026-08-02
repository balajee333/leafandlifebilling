import Head from 'next/head';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

function DeleteIconButton({ onClick, label }) {
  return (
    <button
      type='button'
      className='ll-btn secondary ll-icon-btn'
      onClick={onClick}
      aria-label={label}
      title='Delete'
    >
      <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden='true' focusable='false'>
        <path fill='currentColor' d='M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z' />
      </svg>
    </button>
  );
}

function PaidBadge({ paid }) {
  if (paid) {
    return <span className='ll-paid-badge is-paid'>Paid</span>;
  }
  return (
    <span className='ll-paid-badge is-unpaid ll-paid-icon-only' title='Pending' aria-label='Pending'>
      <svg className='ll-paid-icon' viewBox='0 0 24 24' width='18' height='18' aria-hidden='true' focusable='false'>
        <path fill='currentColor' d='M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm.75-12.5h-1.5v5.25l4.5 2.7.75-1.23-3.75-2.22z' />
      </svg>
    </span>
  );
}

function MobileListCard({ href, numberLabel, name, meta, total, paidBadge, onDelete, deleteLabel }) {
  return (
    <article className='ll-mobile-card'>
      <a className='ll-mobile-card-link' href={href}>
        <div className='ll-mobile-card-top'>
          <span className='ll-mobile-card-num'>{numberLabel}</span>
        </div>
        <div className='ll-mobile-card-name'>{name}</div>
        <div className='ll-mobile-card-meta'>
          {meta.map(item => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className='ll-mobile-card-bottom'>
          <strong>{total}</strong>
          {paidBadge}
        </div>
      </a>
      <div className='ll-mobile-card-action'>
        <DeleteIconButton label={deleteLabel} onClick={onDelete} />
      </div>
    </article>
  );
}

function FlatToggleLabel({ flatName, count, open }) {
  return (
    <>
      <span className={`ll-flat-chevron ${open ? 'is-open' : ''}`} aria-hidden='true'>
        <svg viewBox='0 0 24 24' width='16' height='16' focusable='false'>
          <path fill='currentColor' d='M9.29 6.71a1 1 0 0 0 0 1.41L13.17 12l-3.88 3.88a1 1 0 1 0 1.41 1.41l4.59-4.59a1 1 0 0 0 0-1.41L10.7 6.7a1 1 0 0 0-1.41.01z' />
        </svg>
      </span>
      <span className='ll-flat-name'>{flatName}</span>
      <span className='ll-flat-count'>({count})</span>
    </>
  );
}

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsedFlats, setCollapsedFlats] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');

  function flatGroupKey(sectionId, flatName) {
    return `${sectionId}::${flatName}`;
  }

  function isFlatOpen(sectionId, flatName) {
    return !collapsedFlats.has(flatGroupKey(sectionId, flatName));
  }

  function toggleFlat(sectionId, flatName) {
    const key = flatGroupKey(sectionId, flatName);
    setCollapsedFlats(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.tab;
    const nextTab = q === 'bills' || q === 'past' ? q : 'orders';
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

  function matchesSearch(item, { numberKey }) {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const fields = [
      item.flatName,
      item.flatNumber,
      item.customerName,
      item[numberKey]
    ];
    return fields.some(value => String(value || '').toLowerCase().includes(q));
  }

  const notDeliveredOrders = useMemo(
    () => orders.filter(order => order.status !== 'delivered' && matchesSearch(order, { numberKey: 'orderNumber' })),
    [orders, searchQuery]
  );

  const deliveredUnpaidOrders = useMemo(
    () => orders.filter(order => order.status === 'delivered' && !order.paid && matchesSearch(order, { numberKey: 'orderNumber' })),
    [orders, searchQuery]
  );

  const deliveredPaidOrders = useMemo(
    () => orders
      .filter(order => order.status === 'delivered' && order.paid && matchesSearch(order, { numberKey: 'orderNumber' }))
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.deliveredAt || a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.deliveredAt || b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      }),
    [orders, searchQuery]
  );

  const allBills = useMemo(
    () => [...drafts, ...delivered].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    ),
    [drafts, delivered]
  );

  const notDeliveredBills = useMemo(
    () => allBills.filter(bill => bill.status !== 'delivered' && matchesSearch(bill, { numberKey: 'billNumber' })),
    [allBills, searchQuery]
  );

  const deliveredUnpaidBills = useMemo(
    () => allBills.filter(bill => bill.status === 'delivered' && !bill.paid && matchesSearch(bill, { numberKey: 'billNumber' })),
    [allBills, searchQuery]
  );

  const deliveredPaidBills = useMemo(
    () => allBills.filter(bill => bill.status === 'delivered' && bill.paid && matchesSearch(bill, { numberKey: 'billNumber' })),
    [allBills, searchQuery]
  );

  function billTotalQty(bill) {
    if (!Array.isArray(bill.items)) return 0;
    return bill.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }

  function groupByFlatName(list, { sortBy = 'updated' } = {}) {
    const groups = new Map();
    for (const item of list) {
      const key = (item.flatName || '').trim() || 'No flat name';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }

    function itemTime(item) {
      if (sortBy === 'delivered') {
        return new Date(item.deliveredAt || item.updatedAt || item.createdAt || 0).getTime();
      }
      return new Date(item.updatedAt || item.createdAt || 0).getTime();
    }

    return Array.from(groups.entries())
      .map(([flatName, items]) => ({
        flatName,
        items: items.slice().sort((a, b) => itemTime(b) - itemTime(a))
      }))
      .sort((a, b) => {
        if (sortBy === 'delivered') {
          const aNewest = a.items[0] ? itemTime(a.items[0]) : 0;
          const bNewest = b.items[0] ? itemTime(b.items[0]) : 0;
          return bNewest - aNewest;
        }
        if (a.flatName === 'No flat name') return 1;
        if (b.flatName === 'No flat name') return -1;
        return a.flatName.localeCompare(b.flatName, undefined, { sensitivity: 'base' });
      });
  }

  function renderOrdersTable(list, emptyMessage, { showPaid = false, sectionId = 'orders', sortBy = 'updated' } = {}) {
    if (loading) {
      return <p className='ll-empty'>Loading orders…</p>;
    }
    if (list.length === 0) {
      return <p className='ll-empty'>{emptyMessage}</p>;
    }

    const colSpan = showPaid ? 8 : 7;
    const groups = groupByFlatName(list, { sortBy });
    return (
      <>
        <div className='ll-table-scroll ll-desktop-only'>
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
              {groups.map(group => {
                const open = isFlatOpen(sectionId, group.flatName);
                return (
                  <Fragment key={group.flatName}>
                    <tr className={`ll-flat-row ${open ? 'is-open' : 'is-collapsed'}`}>
                      <td colSpan={colSpan}>
                        <button
                          type='button'
                          className='ll-flat-toggle'
                          aria-expanded={open}
                          onClick={() => toggleFlat(sectionId, group.flatName)}
                        >
                          <FlatToggleLabel flatName={group.flatName} count={group.items.length} open={open} />
                        </button>
                      </td>
                    </tr>
                    {open && group.items.map(order => (
                      <tr
                        key={order.fileName}
                        className='ll-data-row'
                        onClick={() => { window.location.href = `/order?fileName=${encodeURIComponent(order.fileName)}`; }}
                      >
                        <td className='col-num'>
                          <span className='ll-number-text'>{order.orderNumber || '—'}</span>
                        </td>
                        <td className='col-customer'>{order.customerName || '—'}</td>
                        <td className='col-flatno'>{order.flatNumber || '—'}</td>
                        <td className='col-date'>{order.date || '—'}</td>
                        <td className='col-qty'>{orderTotalQty(order)}</td>
                        <td className='col-total'>₹ {Number(order.total || 0).toFixed(2)}</td>
                        {showPaid && (
                          <td className='col-paid'>
                            <PaidBadge paid={order.paid} />
                          </td>
                        )}
                        <td className='col-action' onClick={e => e.stopPropagation()}>
                          <div className='ll-actions'>
                            <DeleteIconButton label='Delete order' onClick={() => deleteOrder(order.fileName)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className='ll-mobile-list ll-mobile-only'>
          {groups.map(group => {
            const open = isFlatOpen(sectionId, group.flatName);
            return (
              <div className={`ll-mobile-group ${open ? 'is-open' : 'is-collapsed'}`} key={group.flatName}>
                <button
                  type='button'
                  className='ll-mobile-group-title'
                  aria-expanded={open}
                  onClick={() => toggleFlat(sectionId, group.flatName)}
                >
                  <FlatToggleLabel flatName={group.flatName} count={group.items.length} open={open} />
                </button>
                {open && (
                  <div className='ll-mobile-cards'>
                    {group.items.map(order => (
                      <MobileListCard
                        key={order.fileName}
                        href={`/order?fileName=${encodeURIComponent(order.fileName)}`}
                        numberLabel={`#${order.orderNumber || '—'}`}
                        name={order.customerName || '—'}
                        meta={[
                          `Flat ${order.flatNumber || '—'}`,
                          order.date || '—',
                          `Qty ${orderTotalQty(order)}`
                        ]}
                        total={`₹ ${Number(order.total || 0).toFixed(2)}`}
                        paidBadge={showPaid ? <PaidBadge paid={order.paid} /> : null}
                        deleteLabel='Delete order'
                        onDelete={() => deleteOrder(order.fileName)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  }

  function renderBillsTable(list, emptyMessage, { showPaid = false, sectionId = 'bills' } = {}) {
    if (loading) {
      return <p className='ll-empty'>Loading bills…</p>;
    }
    if (list.length === 0) {
      return <p className='ll-empty'>{emptyMessage}</p>;
    }

    const colSpan = showPaid ? 8 : 7;
    const groups = groupByFlatName(list);
    return (
      <>
        <div className='ll-table-scroll ll-desktop-only'>
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
              {groups.map(group => {
                const open = isFlatOpen(sectionId, group.flatName);
                return (
                  <Fragment key={group.flatName}>
                    <tr className={`ll-flat-row ${open ? 'is-open' : 'is-collapsed'}`}>
                      <td colSpan={colSpan}>
                        <button
                          type='button'
                          className='ll-flat-toggle'
                          aria-expanded={open}
                          onClick={() => toggleFlat(sectionId, group.flatName)}
                        >
                          <FlatToggleLabel flatName={group.flatName} count={group.items.length} open={open} />
                        </button>
                      </td>
                    </tr>
                    {open && group.items.map(bill => (
                      <tr
                        key={bill.fileName}
                        className='ll-data-row'
                        onClick={() => { window.location.href = `/bill?fileName=${encodeURIComponent(bill.fileName)}`; }}
                      >
                        <td className='col-num'>
                          <span className='ll-number-text'>{bill.billNumber || '—'}</span>
                        </td>
                        <td className='col-customer'>{bill.customerName || '—'}</td>
                        <td className='col-flatno'>{bill.flatNumber || '—'}</td>
                        <td className='col-date'>{bill.date || '—'}</td>
                        <td className='col-qty'>{billTotalQty(bill)}</td>
                        <td className='col-total'>₹ {Number(bill.total || 0).toFixed(2)}</td>
                        {showPaid && (
                          <td className='col-paid'>
                            <PaidBadge paid={bill.paid} />
                          </td>
                        )}
                        <td className='col-action' onClick={e => e.stopPropagation()}>
                          <div className='ll-actions'>
                            <DeleteIconButton label='Delete bill' onClick={() => deleteBill(bill.fileName)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className='ll-mobile-list ll-mobile-only'>
          {groups.map(group => {
            const open = isFlatOpen(sectionId, group.flatName);
            return (
              <div className={`ll-mobile-group ${open ? 'is-open' : 'is-collapsed'}`} key={group.flatName}>
                <button
                  type='button'
                  className='ll-mobile-group-title'
                  aria-expanded={open}
                  onClick={() => toggleFlat(sectionId, group.flatName)}
                >
                  <FlatToggleLabel flatName={group.flatName} count={group.items.length} open={open} />
                </button>
                {open && (
                  <div className='ll-mobile-cards'>
                    {group.items.map(bill => (
                      <MobileListCard
                        key={bill.fileName}
                        href={`/bill?fileName=${encodeURIComponent(bill.fileName)}`}
                        numberLabel={`#${bill.billNumber || '—'}`}
                        name={bill.customerName || '—'}
                        meta={[
                          `Flat ${bill.flatNumber || '—'}`,
                          bill.date || '—',
                          `Qty ${billTotalQty(bill)}`
                        ]}
                        total={`₹ ${Number(bill.total || 0).toFixed(2)}`}
                        paidBadge={showPaid ? <PaidBadge paid={bill.paid} /> : null}
                        deleteLabel='Delete bill'
                        onDelete={() => deleteBill(bill.fileName)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>
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
            {tab === 'bills' ? (
              <a className='ll-btn' href='/bill'>Create New Bill</a>
            ) : (
              <a className='ll-btn' href='/order'>Create New Order</a>
            )}
            <button type='button' className='ll-btn' onClick={loadAll}>Refresh</button>
          </div>
        </header>

        <div className='ll-search' role='search'>
          <svg className='ll-search-icon' viewBox='0 0 24 24' width='20' height='20' aria-hidden='true' focusable='false'>
            <path fill='currentColor' d='M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z' />
          </svg>
          <input
            type='search'
            className='ll-search-input'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={tab === 'bills'
              ? 'Search flat name, flat #, customer, bill #'
              : 'Search flat name, flat #, customer, order #'}
            aria-label='Search list'
          />
          {searchQuery ? (
            <button type='button' className='ll-search-clear' onClick={() => setSearchQuery('')} aria-label='Clear search'>
              Clear
            </button>
          ) : null}
        </div>

        <div className='ll-tabs'>
          <button type='button' className={tab === 'orders' ? 'll-tab active' : 'll-tab'} onClick={() => selectTab('orders')}>Orders</button>
          <button type='button' className={tab === 'bills' ? 'll-tab active' : 'll-tab'} onClick={() => selectTab('bills')}>Bills</button>
          <button type='button' className={tab === 'past' ? 'll-tab active' : 'll-tab'} onClick={() => selectTab('past')}>Past Orders</button>
        </div>

        {tab === 'orders' ? (
          <div className='ll-grid'>
            <section className='ll-panel'>
              <h2>Not Delivered <span className='ll-section-count'>({notDeliveredOrders.length})</span></h2>
              {renderOrdersTable(notDeliveredOrders, 'No undelivered orders.', { showPaid: true, sectionId: 'orders-not-delivered' })}
            </section>
            <section className='ll-panel'>
              <h2>Delivered · Not Paid <span className='ll-section-count'>({deliveredUnpaidOrders.length})</span></h2>
              {renderOrdersTable(deliveredUnpaidOrders, 'No delivered unpaid orders.', { sectionId: 'orders-delivered-unpaid' })}
            </section>
          </div>
        ) : tab === 'bills' ? (
          <div className='ll-grid'>
            <section className='ll-panel'>
              <h2>Not Delivered <span className='ll-section-count'>({notDeliveredBills.length})</span></h2>
              {renderBillsTable(notDeliveredBills, 'No undelivered bills.', { showPaid: true, sectionId: 'bills-not-delivered' })}
            </section>
            <section className='ll-panel'>
              <h2>Delivered · Not Paid <span className='ll-section-count'>({deliveredUnpaidBills.length})</span></h2>
              {renderBillsTable(deliveredUnpaidBills, 'No delivered unpaid bills.', { sectionId: 'bills-delivered-unpaid' })}
            </section>
            <section className='ll-panel'>
              <h2>Delivered · Paid <span className='ll-section-count'>({deliveredPaidBills.length})</span></h2>
              {renderBillsTable(deliveredPaidBills, 'No delivered paid bills.', { sectionId: 'bills-delivered-paid' })}
            </section>
          </div>
        ) : (
          <div className='ll-grid'>
            <section className='ll-panel'>
              <h2>Past Orders <span className='ll-section-count'>({deliveredPaidOrders.length})</span></h2>
              {renderOrdersTable(deliveredPaidOrders, 'No past orders yet.', { sectionId: 'orders-past', sortBy: 'delivered' })}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
