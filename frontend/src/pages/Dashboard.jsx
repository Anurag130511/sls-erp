import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Dashboard() {
  const [quotations, setQuotations] = useState([]);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/quotations'), api.get('/purchase-orders')])
      .then(([q, p]) => {
        setQuotations(q);
        setPos(p);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;

  const openQuotations = quotations.filter((q) => ['draft', 'sent'].includes(q.status));
  const pendingPOs = pos.filter((p) => !['received', 'closed', 'cancelled'].includes(p.status));

  const cardStyle = { flex: 1, textAlign: 'center' };
  const numStyle = { fontSize: 32, fontWeight: 700, color: 'var(--green-dark)', margin: '6px 0' };

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
        <div className="card" style={cardStyle}>
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Open Quotations</div>
          <div style={numStyle}>{openQuotations.length}</div>
          <Link to="/quotations">View all</Link>
        </div>
        <div className="card" style={cardStyle}>
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Pending Purchase Orders</div>
          <div style={numStyle}>{pendingPOs.length}</div>
          <Link to="/purchase-orders">View all</Link>
        </div>
        <div className="card" style={cardStyle}>
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Total Quotations</div>
          <div style={numStyle}>{quotations.length}</div>
        </div>
        <div className="card" style={cardStyle}>
          <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Total Purchase Orders</div>
          <div style={numStyle}>{pos.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        <div className="card" style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0 }}>Recent Quotations</h3>
          {quotations.slice(0, 5).map((q) => (
            <div key={q.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-light)', fontSize: 13 }}>
              <Link to={`/quotations/${q.id}`}>{q.quotationNumber}</Link> — {q.customer?.name} — <span className={`badge ${q.status}`}>{q.status}</span>
            </div>
          ))}
          {quotations.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>No quotations yet.</p>}
        </div>
        <div className="card" style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0 }}>Recent Purchase Orders</h3>
          {pos.slice(0, 5).map((p) => (
            <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--gray-light)', fontSize: 13 }}>
              <Link to={`/purchase-orders/${p.id}`}>{p.poNumber}</Link> — {p.vendor?.name} — <span className={`badge ${p.status}`}>{p.status.replace('_', ' ')}</span>
            </div>
          ))}
          {pos.length === 0 && <p style={{ color: '#999', fontSize: 13 }}>No purchase orders yet.</p>}
        </div>
      </div>
    </div>
  );
}
