import { useEffect, useState } from 'react';
import { api } from '../api/client';
import ExcelUpload from '../components/ExcelUpload';

const emptyForm = { name: '', sku: '', description: '', unit: 'unit', unitPrice: '' };

export default function Items() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/items').then(setItems).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/items', { ...form, unitPrice: Number(form.unitPrice || 0) });
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm('Delete this item?')) return;
    await api.del(`/items/${id}`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Item Catalog</h1>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add Item Manually'}
        </button>
      </div>

      <ExcelUpload entity="items" label="Bulk upload items from Excel" onImported={load} />

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field">
                <label>Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="field">
                <label>SKU</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="field">
                <label>Unit</label>
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="field">
                <label>Unit Price (₹)</label>
                <input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
              </div>
            </div>
            <button className="btn" type="submit">Save Item</button>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>SKU</th><th>Unit</th><th>Unit Price</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.name}<div style={{ fontSize: 11, color: '#888' }}>{it.description}</div></td>
                <td>{it.sku || '-'}</td>
                <td>{it.unit}</td>
                <td>₹{(it.unitPriceCents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td><button className="btn danger" onClick={() => remove(it.id)}>Delete</button></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>No items yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
