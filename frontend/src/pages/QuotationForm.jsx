import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../api/AuthContext';
import SampleParameterEditor from '../components/SampleParameterEditor';

const emptySample = () => ({ sampleName: '', parameters: [{ parameterId: null, description: '', unitPrice: '' }] });

export default function QuotationForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [terms, setTerms] = useState('This quotation is valid until the date shown above.\nPrices are exclusive of applicable taxes unless stated otherwise.');
  const [samples, setSamples] = useState([emptySample()]);
  const [discount, setDiscount] = useState('0');
  const [gstApplicable, setGstApplicable] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/customers').then(setCustomers);
    api.get('/parameters').then(setParameters);
  }, []);

  const updateSample = (idx, nextSample) => {
    const next = [...samples];
    next[idx] = nextSample;
    setSamples(next);
  };

  const addSample = () => setSamples([...samples, emptySample()]);
  const removeSample = (idx) => setSamples(samples.filter((_, i) => i !== idx));

  // Running totals shown live on the form, before the server's own calc.
  const subtotal = samples.reduce(
    (sum, s) => sum + s.parameters.reduce((pSum, p) => pSum + Number(p.unitPrice || 0), 0),
    0
  );
  const afterDiscount = subtotal - Number(discount || 0);
  const gstAmount = gstApplicable ? afterDiscount * 0.18 : 0;
  const grandTotal = afterDiscount + gstAmount;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!customerId) return setError('Please select a customer.');
    for (const s of samples) {
      if (!s.sampleName.trim()) return setError('Every sample needs a name.');
      if (s.parameters.length === 0) return setError(`Add at least one parameter for "${s.sampleName}".`);
    }
    setSaving(true);
    try {
      const q = await api.post('/quotations', {
        customerId: Number(customerId),
        issueDate,
        expiryDate: expiryDate || null,
        terms,
        samples,
        discount: Number(discount || 0),
        gstApplicable,
        gstPercent: 18,
      });
      navigate(`/quotations/${q.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const salesPersonDisplay = user
    ? user.designation ? `${user.name} — ${user.designation}` : user.name
    : '';

  return (
    <div>
      <div className="page-header"><h1>New Quotation</h1></div>

      <form onSubmit={submit}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Customer *</label>
              <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select customer…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Issue Date *</label>
              <input type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Valid Until</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Sales Person</label>
              <input value={salesPersonDisplay} disabled style={{ background: '#F4F4F4', color: '#666' }} />
            </div>
          </div>
        </div>

        <h3>Samples &amp; Parameters</h3>
        {samples.map((sample, idx) => (
          <SampleParameterEditor
            key={idx}
            sample={sample}
            sampleIndex={idx}
            onChange={(next) => updateSample(idx, next)}
            onRemoveSample={() => removeSample(idx)}
            canRemoveSample={samples.length > 1}
            catalogParameters={parameters}
          />
        ))}
        <button type="button" className="btn secondary" onClick={addSample} style={{ marginBottom: 20 }}>
          + Add Sample
        </button>

        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 8 }}>
            <div className="field">
              <label>Overall Discount (₹)</label>
              <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginTop: 22 }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={gstApplicable}
                  onChange={(e) => setGstApplicable(e.target.checked)}
                />
                Include GST (18%)
              </label>
            </div>
          </div>

          <div style={{ width: 300, marginLeft: 'auto', fontSize: 13, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Discount</span><span>-₹{Number(discount || 0).toFixed(2)}</span>
            </div>
            {gstApplicable && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>GST @ 18%</span><span>₹{gstAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--green-dark)' }}>
              <span>Total</span><span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="field">
            <label>Terms &amp; Notes (one per line)</label>
            <textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>

          {error && <p style={{ color: '#C0392B' }}>{error}</p>}
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Quotation'}
          </button>
        </div>
      </form>
    </div>
  );
}
