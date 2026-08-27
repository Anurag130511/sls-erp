import { useEffect, useState } from 'react';
import { api } from '../api/client';

const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function downloadReport(path, params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Download failed');
  }
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="(.+)"/);
  const filename = match ? match[1] : 'report.xlsx';
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportCard({ title, entityLabel, users, exportPath }) {
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      const params = {};
      if (userId) params.userId = userId;
      if (from) params.from = from;
      if (to) params.to = to;
      await downloadReport(exportPath, params);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="card" style={{ flex: 1 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 14 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>{entityLabel}</label>
          <select value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">All {entityLabel.toLowerCase()}s (overall)</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>From (optional)</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>To (optional)</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>
      {error && <p style={{ color: '#C0392B', fontSize: 13 }}>{error}</p>}
      <button className="btn" onClick={download} disabled={downloading}>
        {downloading ? 'Preparing…' : 'Download Excel'}
      </button>
    </div>
  );
}

export default function Reports() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users').then(setUsers).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <div className="page-header"><h1>Reports</h1></div>
      <p style={{ color: '#777', fontSize: 13, marginTop: -10, marginBottom: 20 }}>
        Export quotations or purchase orders to Excel — leave the dropdown on "All" for
        everyone's data, or pick one person to see just their records.
      </p>
      <div style={{ display: 'flex', gap: 20 }}>
        <ReportCard
          title="Quotations Report"
          entityLabel="Sales Person"
          users={users}
          exportPath="/reports/quotations"
        />
        <ReportCard
          title="Purchase Orders Report"
          entityLabel="Raised By"
          users={users}
          exportPath="/reports/purchase-orders"
        />
      </div>
    </div>
  );
}
