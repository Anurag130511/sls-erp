import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/purchase-orders').then(setPos).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Purchase Orders</h1>
        <Link to="/purchase-orders/new"><button className="btn">+ New Purchase Order</button></Link>
      </div>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Number</th><th>Vendor</th><th>Raised By</th><th>Issue Date</th><th>Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {pos.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/purchase-orders/${p.id}`}>{p.poNumber}</Link></td>
                <td>{p.vendor?.name}</td>
                <td>{p.createdByName || '-'}</td>
                <td>{p.issueDate}</td>
                <td>₹{(p.totalCents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td><span className={`badge ${p.status}`}>{p.status.replace('_', ' ')}</span></td>
              </tr>
            ))}
            {pos.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>No purchase orders yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
