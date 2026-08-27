import { useEffect, useState } from 'react';
import { api } from '../api/client';
import ExcelUpload from '../components/ExcelUpload';

const emptyForm = { name: '', code: '', description: '', unit: 'test', unitPrice: '' };

export default function Parameters() {
  const [parameters, setParameters] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/parameters').then(setParameters).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/parameters', { ...form, unitPrice: Number(form.unitPrice || 0) });
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm('Delete this parameter?')) return;
    await api.del(`/parameters/${id}`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Parameters</h1>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add Parameter Manually'}
        </button>
      </div>
      <p style={{ color: '#777', fontSize: 13, marginTop: -10, marginBottom: 20 }}>
        Test parameters offered to customers on quotations (pH, coliform count, TDS, etc.) —
        each with its own price. Separate from the Items catalog, which is for materials
        bought from vendors on purchase orders.
      </p>

      <ExcelUpload entity="parameters" label="Bulk upload parameters from Excel" onImported={load} />

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field">
                <label>Parameter Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. pH, Total Coliform Count" />
              </div>
              <div className="field">
                <label>Code</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. PH-01" />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Description / Method</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. IS 3025 (Part 11)" />
              </div>
              <div className="field">
                <label>Unit</label>
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="field">
                <label>Price per Test (₹)</label>
                <input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
              </div>
            </div>
            <button className="btn" type="submit">Save Parameter</button>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Code</th><th>Unit</th><th>Price</th><th></th></tr>
          </thead>
          <tbody>
            {parameters.map((p) => (
              <tr key={p.id}>
                <td>{p.name}<div style={{ fontSize: 11, color: '#888' }}>{p.description}</div></td>
                <td>{p.code || '-'}</td>
                <td>{p.unit}</td>
                <td>₹{(p.unitPriceCents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td><button className="btn danger" onClick={() => remove(p.id)}>Delete</button></td>
              </tr>
            ))}
            {parameters.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>No parameters yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
