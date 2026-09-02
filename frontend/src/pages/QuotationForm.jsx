import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../api/AuthContext';
import SampleParameterEditor from '../components/SampleParameterEditor';

const emptySample = () => ({
  sampleName: '',
  parameters: [{ parameterId: null, description: '', charges: '', combineWithPrevious: false }],
  sampleQty: 1,
  sampleCount: 1,
});

// Rebuilds the samples/parameters UI shape from a saved quotation's flat
// (one-row-per-parameter) lineItems — grouping first by sampleIndex,
// then by pricingGroupIndex within each sample. The first parameter in
// a pricing group carries that group's price; any others are marked
// combineWithPrevious so the editor shows them sharing it, matching
// exactly how the data was entered originally.
function samplesFromLineItems(lineItems) {
  const bySample = [];
  for (const li of [...lineItems].sort((a, b) => a.sortOrder - b.sortOrder)) {
    let sample = bySample.find((s) => s.sampleIndex === li.sampleIndex);
    if (!sample) {
      sample = {
        sampleIndex: li.sampleIndex,
        sampleName: li.sampleName,
        sampleQty: Number(li.sampleQty),
        sampleCount: Number(li.sampleCount),
        parameters: [],
        _groups: [],
      };
      bySample.push(sample);
    }
    let group = sample._groups.find((g) => g.pricingGroupIndex === li.pricingGroupIndex);
    const isFirstInGroup = !group;
    if (!group) {
      group = { pricingGroupIndex: li.pricingGroupIndex };
      sample._groups.push(group);
    }
    sample.parameters.push({
      parameterId: null,
      description: li.parameterName,
      charges: isFirstInGroup ? (li.chargesPerSampleCents / 100).toString() : '',
      combineWithPrevious: !isFirstInGroup,
    });
  }
  return bySample.map(({ _groups, sampleIndex, ...rest }) => rest);
}

export default function QuotationForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // present only when editing an existing draft
  const isEditMode = Boolean(id);
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [subject, setSubject] = useState('');
  const [terms, setTerms] = useState('');
  const [samples, setSamples] = useState([emptySample()]);
  const [discountPercent, setDiscountPercent] = useState('0');
  const [gstApplicable, setGstApplicable] = useState(true);
  const [quotationNumber, setQuotationNumber] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    api.get('/customers').then(setCustomers);
    api.get('/parameters').then(setParameters);
  }, []);

  useEffect(() => {
    if (!isEditMode) return;
    api.get(`/quotations/${id}`).then((q) => {
      setQuotationNumber(q.quotationNumber);
      setCustomerId(String(q.customerId));
      setIssueDate(q.issueDate);
      setExpiryDate(q.expiryDate || '');
      setSubject(q.subject || '');
      setTerms(q.terms || '');
      setDiscountPercent(String(q.discountPercent || 0));
      setGstApplicable(Boolean(q.gstApplicable));
      setSamples(samplesFromLineItems(q.lineItems));
    }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [id, isEditMode]);

  const updateSample = (idx, nextSample) => {
    const next = [...samples];
    next[idx] = nextSample;
    setSamples(next);
  };

  const addSample = () => setSamples([...samples, emptySample()]);
  const removeSample = (idx) => setSamples(samples.filter((_, i) => i !== idx));

  // Running totals shown live on the form, before the server's own calc.
  const sampleTotal = (s) => {
    let perUnit = 0;
    s.parameters.forEach((p, i) => {
      if (i === 0 || !p.combineWithPrevious) perUnit += Number(p.charges || 0);
    });
    return perUnit * Number(s.sampleQty || 1) * Number(s.sampleCount || 1);
  };
  const subtotal = samples.reduce((sum, s) => sum + sampleTotal(s), 0);
  const discountAmount = subtotal * (Number(discountPercent || 0) / 100);
  const afterDiscount = subtotal - discountAmount;
  const gstAmount = gstApplicable ? afterDiscount * 0.18 : 0;
  const grandTotal = afterDiscount + gstAmount;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!customerId) return setError('Please select a customer.');
    for (const s of samples) {
      if (!s.sampleName.trim()) return setError('Every sample needs a name.');
      if (s.parameters.length === 0 || s.parameters.some((p) => !p.description.trim())) {
        return setError(`Add at least one parameter for "${s.sampleName}".`);
      }
    }
    setSaving(true);
    try {
      const payload = {
        customerId: Number(customerId),
        issueDate,
        expiryDate: expiryDate || null,
        subject,
        terms,
        samples,
        discountPercent: Number(discountPercent || 0),
        gstApplicable,
        gstPercent: 18,
      };
      const q = isEditMode ? await api.put(`/quotations/${id}`, payload) : await api.post('/quotations', payload);
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

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <div className="page-header"><h1>{isEditMode ? `Edit ${quotationNumber}` : 'New Quotation'}</h1></div>

      <form onSubmit={submit}>
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
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
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Quotation for Water Testing Services" />
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
              <label>Overall Discount (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} />
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
            {Number(discountPercent || 0) > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Discount ({Number(discountPercent).toFixed(2).replace(/\.?0+$/, '')}%)</span><span>-₹{discountAmount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Total after Discount</span><span>₹{afterDiscount.toFixed(2)}</span>
                </div>
              </>
            )}
            {gstApplicable && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>GST @ 18%</span><span>₹{gstAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--green-dark)' }}>
              <span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="field">
            <label>Additional Terms (optional, one per line — added below the standard terms)</label>
            <textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>

          {error && <p style={{ color: '#C0392B' }}>{error}</p>}
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEditMode ? 'Save Changes' : 'Save Quotation'}
          </button>
        </div>
      </form>
    </div>
  );
}
