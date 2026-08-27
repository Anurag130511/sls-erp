import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/documents').then(setDocs).finally(() => setLoading(false));
  }, []);

  // Same fix as the quotation/PO detail pages: a synthetic <a download>
  // click instead of window.open(), plus visible error handling, so a
  // failure is never silent.
  const download = async (doc) => {
    setDownloadingId(doc.id);
    setError('');
    try {
      const blob = await api.getBlob(`/documents/${doc.id}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.documentNumber.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message || 'Failed to download the PDF. If the server has been idle, it may be waking up — try again in about a minute.');
    } finally {
      setDownloadingId(null);
    }
  };

  const openSource = (doc) => {
    const path = doc.docType === 'quotation' ? '/quotations' : '/purchase-orders';
    return `${path}/${doc.documentId}`;
  };

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <div className="page-header">
        <h1>Documents</h1>
      </div>
      <p style={{ color: '#777', fontSize: 13, marginTop: -10, marginBottom: 20 }}>
        Every PDF you've generated is saved here — download it again anytime without
        recreating it.
      </p>
      {error && <p style={{ color: '#C0392B', fontSize: 13, marginBottom: 16 }}>{error}</p>}
      <table className="data-table">
        <thead>
          <tr><th>Number</th><th>Type</th><th>Party</th><th>Size</th><th>Last Generated</th><th></th></tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <td><Link to={openSource(d)}>{d.documentNumber}</Link></td>
              <td>{d.docType === 'quotation' ? 'Quotation' : 'Purchase Order'}</td>
              <td>{d.partyName || '-'}</td>
              <td>{d.fileSizeBytes ? `${Math.round(d.fileSizeBytes / 1024)} KB` : '-'}</td>
              <td>{new Date(d.updatedAt).toLocaleString()}</td>
              <td>
                <button className="btn secondary" onClick={() => download(d)} disabled={downloadingId === d.id}>
                  {downloadingId === d.id ? 'Preparing…' : 'Download'}
                </button>
              </td>
            </tr>
          ))}
          {docs.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>
              No PDFs generated yet — open a quotation or purchase order and click "Download PDF".
            </td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
