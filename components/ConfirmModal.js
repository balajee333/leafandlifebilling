import { useEffect } from 'react';

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape' && !busy) onCancel?.();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className='ll-confirm-overlay' role='presentation' onClick={busy ? undefined : onCancel}>
      <div
        className='ll-confirm-modal'
        role='dialog'
        aria-modal='true'
        aria-labelledby='ll-confirm-title'
        onClick={event => event.stopPropagation()}
      >
        <h2 id='ll-confirm-title'>{title}</h2>
        <p>{message}</p>
        <div className='ll-confirm-actions'>
          <button type='button' className='ll-confirm-btn secondary' onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type='button'
            className={`ll-confirm-btn ${danger ? 'danger' : 'primary'}`}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>

      <style jsx>{`
        .ll-confirm-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(24, 40, 28, 0.45);
          box-sizing: border-box;
        }
        .ll-confirm-modal {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 18px;
          border: 1px solid #e3ece4;
          box-shadow: 0 24px 48px rgba(26, 61, 35, 0.18);
          padding: 22px 22px 18px;
          box-sizing: border-box;
        }
        .ll-confirm-modal h2 {
          margin: 0;
          font-size: 20px;
          color: #1b5e20;
        }
        .ll-confirm-modal p {
          margin: 10px 0 0;
          color: #4f6b53;
          line-height: 1.5;
          white-space: pre-line;
        }
        .ll-confirm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 22px;
          flex-wrap: wrap;
        }
        .ll-confirm-btn {
          border: none;
          border-radius: 10px;
          padding: 10px 16px;
          min-height: 42px;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }
        .ll-confirm-btn.secondary {
          background: #f2f7f2;
          color: #2e7d32;
          border: 1px solid #d7e6da;
        }
        .ll-confirm-btn.primary {
          background: #2e7d32;
          color: #fff;
        }
        .ll-confirm-btn.danger {
          background: #c62828;
          color: #fff;
        }
        .ll-confirm-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        @media print {
          .ll-confirm-overlay {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
