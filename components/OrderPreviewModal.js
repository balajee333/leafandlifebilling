import { useEffect, useState } from 'react';

export default function OrderPreviewModal({ fileName, onClose, onOpenOrder }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fileName) return undefined;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      setOrder(null);
      try {
        const res = await fetch(`/api/order?fileName=${encodeURIComponent(fileName)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load order.');
        if (!cancelled) setOrder(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load order.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [fileName]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!fileName) return null;

  const items = Array.isArray(order?.items) ? order.items : [];
  const total = Number(order?.total) || items.reduce(
    (sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0),
    0
  );
  const statusLabel = order
    ? `${order.status === 'delivered' ? 'Delivered' : 'Draft'} · ${order.paid ? 'Paid' : 'Pending'}`
    : '';

  return (
    <div className='ll-confirm-overlay ll-order-preview-overlay' role='presentation' onClick={onClose}>
      <div
        className='ll-confirm-modal ll-order-preview-modal'
        role='dialog'
        aria-modal='true'
        aria-labelledby='ll-order-preview-title'
        onClick={event => event.stopPropagation()}
      >
        <div className='ll-order-preview-header'>
          <div>
            <h2 id='ll-order-preview-title'>
              Order #{order?.orderNumber || '—'}
            </h2>
            {statusLabel ? <p className='ll-order-preview-status'>{statusLabel}</p> : null}
          </div>
          <button type='button' className='ll-order-preview-close' onClick={onClose} aria-label='Close'>
            ×
          </button>
        </div>

        {loading ? (
          <p className='ll-empty'>Loading order…</p>
        ) : error ? (
          <p className='ll-empty'>{error}</p>
        ) : (
          <>
            <div className='ll-order-preview-meta'>
              <div><span>Customer</span><strong>{order.customerName || '—'}</strong></div>
              <div><span>Phone</span><strong>{order.customerPhone || '—'}</strong></div>
              <div><span>Flat</span><strong>{[order.flatName, order.flatNumber].filter(Boolean).join(' · ') || '—'}</strong></div>
              <div><span>Date</span><strong>{order.date || '—'}</strong></div>
            </div>

            <div className='ll-order-preview-items'>
              <div className='ll-order-preview-items-head'>
                <span>Item</span>
                <span>Qty</span>
                <span>Total</span>
              </div>
              {items.length === 0 ? (
                <p className='ll-empty'>No items</p>
              ) : items.map((item, index) => (
                <div className='ll-order-preview-item' key={`${item.product || 'item'}-${index}`}>
                  <span>{item.product || '—'}</span>
                  <span>{item.qty || 0}</span>
                  <span>₹ {(Number(item.qty || 0) * Number(item.price || 0)).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className='ll-order-preview-total'>
              <span>Total</span>
              <strong>₹ {total.toFixed(2)}</strong>
            </div>
          </>
        )}

        <div className='ll-confirm-actions'>
          <button type='button' className='ll-confirm-btn secondary' onClick={onClose}>
            Close
          </button>
          <button
            type='button'
            className='ll-confirm-btn primary'
            onClick={() => onOpenOrder?.(fileName)}
            disabled={loading || Boolean(error)}
          >
            Open Order
          </button>
        </div>
      </div>
    </div>
  );
}
