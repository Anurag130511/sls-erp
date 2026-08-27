import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/quotations').then(setQuotations).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Quotations</h1>
        <Link to="/quotations/new"><button className="btn">+ New Quotation</button></Link>
      </div>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Number</th><th>Customer</th><th>Sales Person</th><th>Issue Date</th><th>Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {quotations.map((q) => (
              <tr key={q.id}>
                <td><Link to={`/quotations/${q.id}`}>{q.quotationNumber}</Link></td>
                <td>{q.customer?.name}</td>
                <td>{q.salesPersonName || '-'}</td>
                <td>{q.issueDate}</td>
                <td>₹{(q.totalCents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td><span className={`badge ${q.status}`}>{q.status}</span></td>
              </tr>
            ))}
            {quotations.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>No quotations yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
