import Head from 'next/head';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { openWhatsAppChat, toTelUrl, toWhatsAppUrl } from '../lib/whatsapp';

function WhatsAppIconButton({ phone }) {
  const url = toWhatsAppUrl(phone);
  const label = url ? 'Chat on WhatsApp' : 'No mobile number';
  return (
    <button
      type='button'
      className='ll-btn secondary ll-icon-btn ll-whatsapp-btn'
      onClick={() => openWhatsAppChat(phone)}
      disabled={!url}
      aria-label={label}
      title={label}
    >
      <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden='true' focusable='false'>
        <path fill='currentColor' d='M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35zM12.04 21.8h-.01a9.77 9.77 0 0 1-4.97-1.36l-.36-.21-3.7.97 1-3.61-.23-.37a9.77 9.77 0 0 1-1.5-5.2 9.8 9.8 0 0 1 9.8-9.8 9.73 9.73 0 0 1 6.93 2.87 9.73 9.73 0 0 1 2.87 6.93 9.8 9.8 0 0 1-9.83 9.78zm8.5-18.3A11.5 11.5 0 0 0 12.03 0C5.43 0 .08 5.34.08 11.93c0 2.1.55 4.15 1.6 5.96L0 24l6.27-1.64a11.9 11.9 0 0 0 5.76 1.47h.01c6.6 0 11.95-5.35 11.95-11.94A11.87 11.87 0 0 0 20.54 3.5z' />
      </svg>
    </button>
  );
}

function CallIconButton({ phone }) {
  const url = toTelUrl(phone);
  const label = url ? 'Call customer' : 'No mobile number';
  if (!url) {
    return (
      <button
        type='button'
        className='ll-btn secondary ll-icon-btn ll-call-btn'
        disabled
        aria-label={label}
        title={label}
      >
        <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden='true' focusable='false'>
          <path fill='currentColor' d='M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z' />
        </svg>
      </button>
    );
  }
  return (
    <a
      className='ll-btn secondary ll-icon-btn ll-call-btn'
      href={url}
      aria-label={label}
      title={label}
    >
      <svg viewBox='0 0 24 24' width='16' height='16' aria-hidden='true' focusable='false'>
        <path fill='currentColor' d='M6.62 10.79a15.15 15.15 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z' />
      </svg>
    </a>
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

function MobileListCard({ href, numberLabel, name, meta, total, paidBadge, phone }) {
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
        <WhatsAppIconButton phone={phone} />
        <CallIconButton phone={phone} />
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
  const [pastOrders, setPastOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pastLoading, setPastLoading] = useState(false);
  const [pastLoaded, setPastLoaded] = useState(false);
  const [collapsedFlats, setCollapsedFlats] = useState(() => new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [itemOrdersDialog, setItemOrdersDialog] = useState(null);

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
    loadActiveOrders();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.tab;
    setTab(q === 'past' || q === 'items' ? q : 'orders');
  }, [router.isReady, router.query.tab]);

  useEffect(() => {
    if (tab === 'past') {
      loadPastOrders();
    }
  }, [tab]);

  function selectTab(nextTab) {
    setTab(nextTab);
    router.replace(
      { pathname: '/', query: nextTab === 'orders' ? {} : { tab: nextTab } },
      undefined,
      { shallow: true }
    );
  }

  async function loadActiveOrders() {
    setLoading(true);
    try {
      const ordersRes = await fetch('/api/orders?scope=active');
      const ordersData = await ordersRes.json().catch(() => ({}));
      if (!ordersRes.ok) throw new Error(ordersData.error || 'Unable to load orders.');

      const orderList = Array.isArray(ordersData) ? ordersData : [];
      setOrders(orderList.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)));
    } catch (error) {
      alert(error.message || 'Unable to load data.');
    } finally {
      setLoading(false);
    }
  }

  async function loadPastOrders() {
    if (pastLoading) return;
    setPastLoading(true);
    try {
      const ordersRes = await fetch('/api/orders?scope=past');
      const ordersData = await ordersRes.json().catch(() => ({}));
      if (!ordersRes.ok) throw new Error(ordersData.error || 'Unable to load past orders.');

      const orderList = Array.isArray(ordersData) ? ordersData : [];
      setPastOrders(
        orderList.slice().sort((a, b) => {
          const aTime = new Date(a.deliveredAt || a.updatedAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.deliveredAt || b.updatedAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        })
      );
      setPastLoaded(true);
    } catch (error) {
      alert(error.message || 'Unable to load past orders.');
    } finally {
      setPastLoading(false);
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
    () => pastOrders.filter(order => matchesSearch(order, { numberKey: 'orderNumber' })),
    [pastOrders, searchQuery]
  );

  const itemsToDeliver = useMemo(() => {
    const totals = new Map();
    for (const order of orders) {
      if (order.status === 'delivered') continue;
      for (const item of order.items || []) {
        const product = String(item.product || '').trim();
        if (!product) continue;
        const key = product.toLowerCase();
        const qty = Number(item.qty || 0);
        const existing = totals.get(key);
        if (existing) {
          existing.qty += qty;
          const orderEntry = existing.ordersByFile.get(order.fileName);
          if (orderEntry) {
            orderEntry.qty += qty;
          } else {
            existing.ordersByFile.set(order.fileName, {
              fileName: order.fileName,
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              flatName: order.flatName,
              flatNumber: order.flatNumber,
              qty
            });
          }
        } else {
          totals.set(key, {
            product,
            qty,
            ordersByFile: new Map([
              [order.fileName, {
                fileName: order.fileName,
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                flatName: order.flatName,
                flatNumber: order.flatNumber,
                qty
              }]
            ])
          });
        }
      }
    }

    const q = searchQuery.trim().toLowerCase();
    return Array.from(totals.values())
      .map(row => ({
        product: row.product,
        qty: row.qty,
        orderCount: row.ordersByFile.size,
        orders: Array.from(row.ordersByFile.values()).sort((a, b) => {
          const aNum = Number(String(a.orderNumber || '').replace(/\D/g, '')) || 0;
          const bNum = Number(String(b.orderNumber || '').replace(/\D/g, '')) || 0;
          return bNum - aNum;
        })
      }))
      .filter(row => !q || row.product.toLowerCase().includes(q))
      .sort((a, b) => a.product.localeCompare(b.product, undefined, { sensitivity: 'base' }));
  }, [orders, searchQuery]);

  const itemsToDeliverTotalQty = useMemo(
    () => itemsToDeliver.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [itemsToDeliver]
  );

  function goToOrder(fileName) {
    if (!fileName) return;
    window.location.href = `/order?fileName=${encodeURIComponent(fileName)}`;
  }

  function openItemOrders(item) {
    if (!item?.orders?.length) return;
    if (item.orders.length === 1) {
      goToOrder(item.orders[0].fileName);
      return;
    }
    setItemOrdersDialog(item);
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

  function renderOrdersTable(list, emptyMessage, { showPaid = false, sectionId = 'orders', sortBy = 'updated', isLoading = loading } = {}) {
    if (isLoading) {
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
                            <WhatsAppIconButton phone={order.customerPhone} />
                            <CallIconButton phone={order.customerPhone} />
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
                        phone={order.customerPhone}
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

  function renderItemsToDeliver() {
    if (loading) {
      return <p className='ll-empty'>Loading items…</p>;
    }
    if (itemsToDeliver.length === 0) {
      return <p className='ll-empty'>No items to deliver.</p>;
    }

    return (
      <>
        <div className='ll-table-scroll ll-desktop-only'>
          <table className='ll-table ll-items-table'>
            <thead>
              <tr>
                <th className='col-item'>Item</th>
                <th className='col-qty'>Qty</th>
                <th className='col-orders'>Orders</th>
              </tr>
            </thead>
            <tbody>
              {itemsToDeliver.map(item => (
                <tr
                  key={item.product}
                  className='ll-data-row'
                  onClick={() => openItemOrders(item)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openItemOrders(item);
                    }
                  }}
                  tabIndex={0}
                  role='link'
                  aria-label={`${item.product}, ${item.qty} to deliver across ${item.orderCount} orders`}
                >
                  <td className='col-item'>{item.product}</td>
                  <td className='col-qty'><strong>{item.qty}</strong></td>
                  <td className='col-orders'>{item.orderCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className='ll-mobile-list ll-mobile-only'>
          <div className='ll-mobile-cards ll-items-cards'>
            {itemsToDeliver.map(item => (
              <button
                key={item.product}
                type='button'
                className='ll-mobile-card ll-item-card'
                onClick={() => openItemOrders(item)}
              >
                <div className='ll-item-card-name'>{item.product}</div>
                <div className='ll-item-card-meta'>
                  <span><strong>{item.qty}</strong> to deliver</span>
                  <span>{item.orderCount} order{item.orderCount === 1 ? '' : 's'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Leaf & Life</title>
      </Head>

      {itemOrdersDialog ? (
        <div className='ll-confirm-overlay' role='presentation' onClick={() => setItemOrdersDialog(null)}>
          <div
            className='ll-confirm-modal ll-item-orders-modal'
            role='dialog'
            aria-modal='true'
            aria-labelledby='ll-item-orders-title'
            onClick={e => e.stopPropagation()}
          >
            <h2 id='ll-item-orders-title'>{itemOrdersDialog.product}</h2>
            <p>Select an order to open.</p>
            <div className='ll-item-orders-list'>
              {itemOrdersDialog.orders.map(order => (
                <button
                  key={order.fileName}
                  type='button'
                  className='ll-item-order-row'
                  onClick={() => goToOrder(order.fileName)}
                >
                  <span className='ll-item-order-num'>#{order.orderNumber || '—'}</span>
                  <span className='ll-item-order-details'>
                    <strong>{order.customerName || '—'}</strong>
                    <span>
                      {[order.flatName, order.flatNumber].filter(Boolean).join(' · ') || 'No flat'}
                    </span>
                  </span>
                  <span className='ll-item-order-qty'>Qty {order.qty}</span>
                </button>
              ))}
            </div>
            <div className='ll-confirm-actions'>
              <button type='button' className='ll-confirm-btn secondary' onClick={() => setItemOrdersDialog(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className='ll-page'>
        <header className='ll-header'>
          <div className='ll-brand'>
            <a className='ll-brand-link' href='/' aria-label='Go to home'>
              <img src='/logo.png' alt='Leaf & Life logo' />
            </a>
            <div className='ll-brand-title'>
              <h1>Leaf & Life</h1>
              <p>Orders sorted by most recent activity.</p>
            </div>
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
            placeholder={tab === 'items' ? 'Search item name' : 'Search flat name, flat #, customer, order #'}
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
          <button type='button' className={tab === 'items' ? 'll-tab active' : 'll-tab'} onClick={() => selectTab('items')}>Items to Deliver</button>
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
              {renderOrdersTable(deliveredUnpaidOrders, 'No delivered unpaid orders.', { showPaid: true, sectionId: 'orders-delivered-unpaid' })}
            </section>
          </div>
        ) : tab === 'items' ? (
          <div className='ll-grid'>
            <section className='ll-panel'>
              <h2>
                Items to be delivered
                <span className='ll-section-count'>
                  ({loading ? '…' : `${itemsToDeliver.length} items · ${itemsToDeliverTotalQty} qty`})
                </span>
              </h2>
              {renderItemsToDeliver()}
            </section>
          </div>
        ) : (
          <div className='ll-grid'>
            <section className='ll-panel'>
              <h2>Past Orders <span className='ll-section-count'>({pastLoading && !pastLoaded ? '…' : deliveredPaidOrders.length})</span></h2>
              {renderOrdersTable(deliveredPaidOrders, 'No past orders yet.', {
                sectionId: 'orders-past',
                sortBy: 'delivered',
                isLoading: pastLoading && !pastLoaded
              })}
            </section>
          </div>
        )}

        <a
          className='ll-fab'
          href='/order'
          aria-label='Create new order'
          title='Create new order'
        >
          <svg viewBox='0 0 24 24' width='28' height='28' aria-hidden='true' focusable='false'>
            <path fill='currentColor' d='M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z' />
          </svg>
        </a>
      </div>
    </>
  );
}
