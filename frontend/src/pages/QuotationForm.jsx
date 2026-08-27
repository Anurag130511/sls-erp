import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../api/AuthContext';
import LineItemsEditor from '../components/LineItemsEditor';

export default function QuotationForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [parameters, setParameters] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState('');
  const [terms, setTerms] = useState('This quotation is valid until the date shown above.\nPrices are exclusive of applicable taxes unless stated otherwise.');
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unitPrice: '', discount: 0, parameterId: null }]);
  const [gstApplicable, setGstApplicable] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/customers').then(setCustomers);
    api.get('/parameters').then(setParameters);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!customerId) return setError('Please select a customer.');
    setSaving(true);
    try {
      const q = await api.post('/quotations', {
        customerId: Number(customerId),
        issueDate,
        expiryDate: expiryDate || null,
        terms,
        lineItems,
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
      <div className="card">
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 8 }}>
            <div className="field">
              <label>Customer *</label>
              <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select customer…</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Issue Date *</label>
              <input type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Valid Until</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Sales Person</label>
              <input value={salesPersonDisplay} disabled style={{ background: '#F4F4F4', color: '#666' }} />
            </div>
          </div>

          <h3>Samples &amp; Parameters</h3>
          <LineItemsEditor
            lineItems={lineItems}
            setLineItems={setLineItems}
            items={parameters}
            showDiscount
            catalogLabel="Parameter (optional)"
            descriptionLabel="Sample Name"
            idField="parameterId"
          />

          <div className="field" style={{ marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={gstApplicable}
                onChange={(e) => setGstApplicable(e.target.checked)}
              />
              Include GST (18%)
            </label>
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label>Terms &amp; Notes (one per line)</label>
            <textarea rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} />
          </div>

          {error && <p style={{ color: '#C0392B' }}>{error}</p>}
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Quotation'}</button>
        </form>
      </div>
    </div>
  );
}
