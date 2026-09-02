import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';

const NEXT_STATUSES = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [],
  rejected: ['draft'],
  expired: ['draft'],
};

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [revising, setRevising] = useState(false);

  const load = () => api.get(`/quotations/${id}`).then(setQuotation).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const changeStatus = async (status) => {
    await api.patch(`/quotations/${id}/status`, { status });
    load();
  };

  // Creates an editable copy of a quotation that's already been sent —
  // the original is left untouched, so anyone who already has a copy of
  // it isn't affected. Jumps straight into editing the new draft.
  const reviseQuotation = async () => {
    setRevising(true);
    try {
      const revised = await api.post(`/quotations/${id}/revise`);
      navigate(`/quotations/${revised.id}/edit`);
    } catch (err) {
      alert(err.message);
    } finally {
      setRevising(false);
    }
  };

  // Uses a synthetic <a download> click rather than window.open() — many
  // browsers (especially mobile Safari) silently block window.open() when
  // it happens after an await, since it no longer looks like a direct
  // result of the user's click. This pattern avoids that, and errors are
  // now shown on screen instead of failing invisibly.
  const downloadPdf = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      const blob = await api.getBlob(`/quotations/${id}/pdf`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${quotation.quotationNumber.replace(/\//g, '-')}.pdf`;
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
  if (!quotation) return <p>Not found.</p>;

  const fmt = (cents) => `₹${(cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const salesPersonLine = quotation.salesPersonName
    ? quotation.salesPersonDesignation
      ? `${quotation.salesPersonName} — ${quotation.salesPersonDesignation}`
      : quotation.salesPersonName
    : null;

  return (
    <div>
      <div className="page-header">
        <h1>{quotation.quotationNumber}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={downloadPdf} disabled={downloading}>
            {downloading ? 'Preparing…' : 'Download PDF'}
          </button>
          {quotation.status === 'draft' && (
            <Link to={`/quotations/${id}/edit`}><button className="btn secondary">Edit</button></Link>
          )}
          {quotation.status !== 'draft' && (
            <button className="btn secondary" onClick={reviseQuotation} disabled={revising}>
              {revising ? 'Creating revision…' : 'Revise'}
            </button>
          )}
          {(NEXT_STATUSES[quotation.status] || []).map((s) => (
            <button key={s} className="btn" onClick={() => changeStatus(s)}>Mark {s}</button>
          ))}
        </div>
      </div>

      {quotation.revisionOf && (
        <p style={{ fontSize: 13, color: '#777', marginTop: -12, marginBottom: 16 }}>
          Revision {quotation.revisionNumber} of{' '}
          <Link to={`/quotations/${quotation.revisionOf.id}`}>{quotation.revisionOf.quotationNumber}</Link>
        </p>
      )}

      {downloadError && (
        <p style={{ color: '#C0392B', fontSize: 13, marginTop: -12, marginBottom: 16 }}>{downloadError}</p>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <strong>Customer:</strong> {quotation.customer?.name}<br />
            <span style={{ color: '#666', fontSize: 13 }}>{quotation.customer?.address}</span>
            {quotation.subject && <div style={{ marginTop: 6, fontSize: 13 }}><strong>Subject:</strong> {quotation.subject}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><strong>Issue Date:</strong> {quotation.issueDate}</div>
            {quotation.expiryDate && <div><strong>Valid Until:</strong> {quotation.expiryDate}</div>}
            {salesPersonLine && <div><strong>Sales Person:</strong> {salesPersonLine}</div>}
            <span className={`badge ${quotation.status}`}>{quotation.status}</span>
          </div>
        </div>
      </div>

      <table className="data-table" style={{ marginBottom: 20 }}>
        <thead>
          <tr>
            <th>Sr. No.</th><th>Sample Name</th><th>Parameter</th>
            <th>Sample Qty.</th><th>Charges/Sample</th><th>Sample Count</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const sorted = [...quotation.lineItems].sort((a, b) => a.sortOrder - b.sortOrder);
            const groups = [];
            for (const li of sorted) {
              let group = groups.find((g) => g.sampleIndex === li.sampleIndex);
              if (!group) {
                group = { sampleIndex: li.sampleIndex, sampleName: li.sampleName, rows: [] };
                groups.push(group);
              }
              group.rows.push(li);
            }

            let srNo = 0;
            return groups.flatMap((group) => {
              const sampleRowCount = group.rows.length;

              const pricingGroups = [];
              for (const li of group.rows) {
                let pg = pricingGroups.find((g) => g.pricingGroupIndex === li.pricingGroupIndex);
                if (!pg) {
                  pg = { pricingGroupIndex: li.pricingGroupIndex, rows: [] };
                  pricingGroups.push(pg);
                }
                pg.rows.push(li);
              }

              let sampleRowsRendered = 0;
              return pricingGroups.flatMap((pg) => {
                const pgRowCount = pg.rows.length;
                const isCombined = pg.rows[0]?.isCombinedPricing;
                const pgTotalCents = pg.rows.reduce((sum, li) => sum + li.lineTotalCents, 0);

                return pg.rows.map((li, i) => {
                  srNo++;
                  const firstInSample = sampleRowsRendered === 0;
                  const firstInGroup = i === 0;
                  sampleRowsRendered++;
                  return (
                    <tr key={li.id}>
                      <td>{srNo}</td>
                      {firstInSample && <td rowSpan={sampleRowCount}>{group.sampleName}</td>}
                      <td>{li.parameterName}</td>
                      {firstInSample && <td rowSpan={sampleRowCount}>{Number(li.sampleQty).toFixed(0)}</td>}
                      {isCombined
                        ? (firstInGroup && <td rowSpan={pgRowCount}>{fmt(pg.rows[0].chargesPerSampleCents)}</td>)
                        : <td>{fmt(li.chargesPerSampleCents)}</td>}
                      {firstInSample && <td rowSpan={sampleRowCount}>{Number(li.sampleCount).toFixed(0)}</td>}
                      {isCombined
                        ? (firstInGroup && <td rowSpan={pgRowCount} style={{ fontWeight: 700 }}>{fmt(pgTotalCents)}</td>)
                        : <td>{fmt(li.lineTotalCents)}</td>}
                  </tr>
                );
              });
            });
          });
          })()}
        </tbody>
      </table>

      <div className="card" style={{ width: 320, marginLeft: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span>Subtotal</span><span>{fmt(quotation.subtotalCents)}</span>
        </div>
        {Number(quotation.discountPercent) > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Discount ({Number(quotation.discountPercent)}%)</span><span>-{fmt(quotation.discountCents)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Total after Discount</span><span>{fmt(quotation.subtotalCents - quotation.discountCents)}</span>
            </div>
          </>
        )}
        {quotation.gstApplicable && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span>GST @ {Number(quotation.gstPercent).toFixed(0)}%</span><span>{fmt(quotation.gstCents)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, color: 'var(--green-dark)' }}>
          <span>Grand Total</span><span>{fmt(quotation.totalCents)}</span>
        </div>
      </div>
    </div>
  );
}
