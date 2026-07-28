import Head from 'next/head';
import { useEffect, useState } from 'react';

export default function Home() {
  const [drafts, setDrafts] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBills();
  }, []);

  async function loadBills() {
    setLoading(true);
    try {
      const res = await fetch('/api/bills');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Unable to load bills.');
      }
      const bills = Array.isArray(data) ? data : [];
      const sorted = bills.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
      setDrafts(sorted.filter(bill => bill.status === 'draft'));
      setDelivered(sorted.filter(bill => bill.status === 'delivered'));
    } catch (error) {
      alert(error.message || 'Unable to load bills.');
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
      loadBills();
    } catch (error) {
      alert('Could not delete bill.');
    }
  }

  return (
    <>
      <Head>
        <title>Leaf & Life Bills</title>
      </Head>

      <div className='page'>
        <header className='header'>
          <div className='brand'>
            <img src='/logo.png' alt='Leaf & Life logo' />
            <div className='brand-title'>
              <h1>Leaf & Life Bills</h1>
              <p>Drafts and delivered bills, sorted by most recent activity.</p>
            </div>
          </div>
          <div className='top-actions'>
            <a className='button' href='/bill'>Create New Bill</a>
            <button onClick={loadBills}>Refresh</button>
          </div>
        </header>

        <div className='grid'>
          <section className='panel'>
            <h2>Draft Bills</h2>
            <table>
              <thead>
                <tr><th>Bill #</th><th>Customer</th><th>Date</th><th>Total</th><th>Action</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan='5' className='empty'>Loading bills…</td></tr>
                ) : drafts.length === 0 ? (
                  <tr><td colSpan='5' className='empty'>No draft bills yet.</td></tr>
                ) : drafts.map(bill => (
                  <tr key={bill.fileName}>
                    <td>{bill.billNumber}</td>
                    <td>{bill.customerName || '—'}</td>
                    <td>{bill.date || '—'}</td>
                    <td>₹ {Number(bill.total || 0).toFixed(2)}</td>
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
                <tr><th>Bill #</th><th>Customer</th><th>Date</th><th>Total</th><th>Action</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan='5' className='empty'>Loading bills…</td></tr>
                ) : delivered.length === 0 ? (
                  <tr><td colSpan='5' className='empty'>No delivered bills yet.</td></tr>
                ) : delivered.map(bill => (
                  <tr key={bill.fileName}>
                    <td>{bill.billNumber}</td>
                    <td>{bill.customerName || '—'}</td>
                    <td>{bill.date || '—'}</td>
                    <td>₹ {Number(bill.total || 0).toFixed(2)}</td>
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
      </div>

      <style jsx>{`
        :global(body){margin:0;font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(135deg,#f4f8f4 0%,#eaf4ea 100%);color:#223126;}
        .page{max-width:1100px;margin:24px auto;padding:24px}
        .header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px}
        .brand{display:flex;align-items:center;gap:12px}
        .brand img{width:52px;height:52px;object-fit:contain}
        .brand-title h1{margin:0;color:#2e7d32}
        .brand-title p{margin:4px 0 0;color:#4f6b53}
        .top-actions{display:flex;gap:10px;flex-wrap:wrap}
        button,a.button{display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:10px;padding:10px 14px;background:#2e7d32;color:#fff;text-decoration:none;cursor:pointer;font-weight:700}
        .button.secondary{background:#f2f7f2;color:#2e7d32;border:1px solid #d7e6da}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        .panel{background:#fff;border-radius:18px;padding:18px;box-shadow:0 18px 40px rgba(26,61,35,.08)}
        .panel h2{margin:0 0 12px;font-size:18px;color:#2e7d32}
        table{width:100%;border-collapse:collapse}
        th,td{padding:12px 10px;border-bottom:1px solid #e8efe9;text-align:left}
        th{background:#f5faf5;color:#2e7d32;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
        .status{font-weight:700;padding:6px 10px;border-radius:999px;display:inline-block}
        .empty{color:#6b7a6f;font-style:italic}
        .actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
        .actions .link{display:inline-flex;align-items:center;justify-content:center;min-height:36px;padding:8px 10px;border-radius:10px;text-decoration:none;color:#2e7d32;font-weight:700}
        .actions button{min-height:36px}
        @media (max-width:800px){.grid{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}
