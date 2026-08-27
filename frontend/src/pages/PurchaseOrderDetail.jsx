import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';

const NEXT_STATUSES = {
  draft: ['sent', 'cancelled'],
  sent: ['confirmed', 'cancelled'],
  confirmed: ['partially_received', 'received', 'cancelled'],
  partially_received: ['received', 'cancelled'],
  received: ['closed'],
  closed: [],
  cancelled: [],
};

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState({});

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const load = () => api.get(`/purchase-orders/${id}`).then((data) => {
    setPo(data);
    const r = {};
    data.lineItems.forEach((li) => { r[li.id] = li.quantityReceived; });
    setReceipts(r);
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  const changeStatus = async (status) => {
    await api.patch(`/purchase-orders/${id}/status`, { status });
    load();
  };

  const submitReceipts = async () => {
    const payload = Object.entries(receipts).map(([lineItemId, quantityReceived]) => ({
      lineItemId: Number(lineItemId),
      quantityReceived: Number(quantityReceived),
    }));
    await api.post(`/purchase-orders/${id}/receive`, { receipts: payload });
    load();
  };

  // Same fix as QuotationDetail: a synthetic <a download> click instead
  // of window.open(), plus visible error handling — see comment there.
  const downloadPdf = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      const blob = await api.getBlob(`/purchase-orders/${id}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${po.poNumber.replace(/\//g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setDownloadError(err.message || 'Failed to download the PDF. If the server has been idle, it may be waking up — try again in about a minute.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (!po) return <p>Not found.</p>;

  const fmt = (cents) => `₹${(cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const canReceive = ['confirmed', 'partially_received'].includes(po.status);
  const raisedByLine = po.createdByName
    ? po.createdByDesignation
      ? `${po.createdByName} — ${po.createdByDesignation}`
      : po.createdByName
    : null;

  return (
    <div>
      <div className="page-header">
        <h1>{po.poNumber}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={downloadPdf} disabled={downloading}>
            {downloading ? 'Preparing…' : 'Download PDF'}
          </button>
          {(NEXT_STATUSES[po.status] || []).map((s) => (
            <button key={s} className="btn" onClick={() => changeStatus(s)}>Mark {s.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      {downloadError && (
        <p style={{ color: '#C0392B', fontSize: 13, marginTop: -12, marginBottom: 16 }}>{downloadError}</p>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>Vendor:</strong> {po.vendor?.name}<br />
            <span style={{ color: '#666', fontSize: 13 }}>{po.vendor?.address}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><strong>Issue Date:</strong> {po.issueDate}</div>
            {po.expectedDeliveryDate && <div><strong>Expected Delivery:</strong> {po.expectedDeliveryDate}</div>}
            {raisedByLine && <div><strong>Raised By:</strong> {raisedByLine}</div>}
            <span className={`badge ${po.status}`}>{po.status.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      <table className="data-table" style={{ marginBottom: 20 }}>
        <thead>
          <tr>
            <th>Material Details</th><th>Qty Ordered</th><th>Unit Price</th><th>Line Total</th>
            {canReceive && <th>Qty Received</th>}
          </tr>
        </thead>
        <tbody>
          {po.lineItems.map((li) => (
            <tr key={li.id}>
              <td>{li.description}</td>
              <td>{Number(li.quantity).toFixed(2)}</td>
              <td>{fmt(li.unitPriceCents)}</td>
              <td>{fmt(li.lineTotalCents)}</td>
              {canReceive && (
                <td>
                  <input
                    type="number" min="0" max={li.quantity} step="0.01"
                    style={{ width: 80 }}
                    value={receipts[li.id] ?? 0}
                    onChange={(e) => setReceipts({ ...receipts, [li.id]: e.target.value })}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {canReceive && (
        <button className="btn secondary" style={{ marginBottom: 20 }} onClick={submitReceipts}>Record Receipt</button>
      )}

      <div className="card" style={{ width: 320, marginLeft: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span>Subtotal</span><span>{fmt(po.subtotalCents)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span>GST @ {Number(po.gstPercent).toFixed(0)}%</span><span>{fmt(po.gstCents)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, color: 'var(--green-dark)' }}>
          <span>Grand Total</span><span>{fmt(po.totalCents)}</span>
        </div>
      </div>
    </div>
  );
}
