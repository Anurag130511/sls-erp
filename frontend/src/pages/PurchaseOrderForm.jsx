import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../api/AuthContext';
import LineItemsEditor from '../components/LineItemsEditor';

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [vendorId, setVendorId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [gstPercent, setGstPercent] = useState('5');
  const [notes, setNotes] = useState('Please send three copies of your invoice quoting reference of this order number.\nPlease notify us immediately if you are unable to ship as specified.\nAll future correspondence in respect of this order may be addressed to the person mentioned above.');
  const [lineItems, setLineItems] = useState([{ description: '', quantity: 1, unitPrice: '', itemId: null }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/vendors').then(setVendors);
    api.get('/items').then(setItems);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!vendorId) return setError('Please select a vendor.');
    setSaving(true);
    try {
      const po = await api.post('/purchase-orders', {
        vendorId: Number(vendorId),
        issueDate,
        expectedDeliveryDate: expectedDeliveryDate || null,
        gstPercent: Number(gstPercent || 0),
        notes,
        lineItems,
      });
      navigate(`/purchase-orders/${po.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header"><h1>New Purchase Order</h1></div>
      <div className="card">
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 8 }}>
            <div className="field">
              <label>Vendor *</label>
              <select required value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                <option value="">Select vendor…</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Issue Date *</label>
              <input type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Expected Delivery</label>
              <input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
            </div>
            <div className="field">
              <label>GST %</label>
              <input type="number" min="0" step="0.01" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} />
            </div>
            <div className="field">
              <label>Raised By</label>
              <input value={user ? (user.designation ? `${user.name} — ${user.designation}` : user.name) : ''} disabled style={{ background: '#F4F4F4', color: '#666' }} />
            </div>
          </div>

          <h3>Material Details</h3>
          <LineItemsEditor lineItems={lineItems} setLineItems={setLineItems} items={items} showDiscount={false} />

          <div className="field" style={{ marginTop: 16 }}>
            <label>Additional Notes (one per line)</label>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p style={{ color: '#C0392B' }}>{error}</p>}
          <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Purchase Order'}</button>
        </form>
      </div>
    </div>
  );
}
