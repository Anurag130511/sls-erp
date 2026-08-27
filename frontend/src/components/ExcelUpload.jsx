import { useRef, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function uploadFile(path, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

async function downloadTemplate(path, filename) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// entity: 'customers' | 'vendors' | 'items' — matches the backend route prefix.
export default function ExcelUpload({ entity, label, onImported }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const data = await uploadFile(`/${entity}/import`, file);
      setResult(data);
      onImported && onImported();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="card" style={{ marginBottom: 20, background: '#F9FBF6' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <strong style={{ fontSize: 13 }}>{label || 'Bulk upload from Excel'}</strong>
          <div style={{ fontSize: 12, color: '#777' }}>Accepts .xlsx, .xls or .csv — headers matched automatically.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="btn secondary"
            onClick={() => downloadTemplate(`/${entity}/import/template`, `${entity}_template.xlsx`)}
          >
            Download template
          </button>
          <button
            type="button"
            className="btn"
            disabled={uploading}
            onClick={() => fileInputRef.current.click()}
          >
            {uploading ? 'Uploading…' : 'Upload Excel'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
        </div>
      </div>

      {error && <p style={{ color: '#C0392B', fontSize: 13, marginTop: 10 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <div style={{ color: 'var(--green-dark)', fontWeight: 600 }}>
            ✓ Imported {result.createdCount} record{result.createdCount === 1 ? '' : 's'}
            {result.skippedCount > 0 ? `, skipped ${result.skippedCount}` : ''}
          </div>
          {result.skipped && result.skipped.length > 0 && (
            <details style={{ marginTop: 6 }}>
              <summary style={{ cursor: 'pointer', color: '#777' }}>View skipped rows</summary>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: 18, color: '#888' }}>
                {result.skipped.map((s, i) => (
                  <li key={i}>Row {s.row}: {s.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
