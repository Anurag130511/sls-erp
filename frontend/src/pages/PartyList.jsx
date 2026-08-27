import { useEffect, useState } from 'react';
import { api } from '../api/client';
import ExcelUpload from '../components/ExcelUpload';

const emptyForm = { name: '', contactPerson: '', address: '', gstNo: '', email: '', phone: '' };

export default function PartyList({ entity, title }) {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const load = () => api.get(`/${entity}`).then(setItems).finally(() => setLoading(false));

  useEffect(() => { load(); }, [entity]);

  const submit = async (e) => {
    e.preventDefault();
    await api.post(`/${entity}`, form);
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm('Delete this record?')) return;
    await api.del(`/${entity}/${id}`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>{title}</h1>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : `+ Add ${title.slice(0, -1)}`}
        </button>
      </div>

      <ExcelUpload entity={entity} label={`Bulk upload ${title.toLowerCase()} from Excel`} onImported={load} />

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field">
                <label>Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Contact Person</label>
                <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Address</label>
                <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="field">
                <label>GST No.</label>
                <input value={form.gstNo} onChange={(e) => setForm({ ...form, gstNo: e.target.value })} />
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <button className="btn" type="submit">Save {title.slice(0, -1)}</button>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Contact</th><th>GST No.</th><th>Email</th><th>Phone</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.name}</td>
                <td>{it.contactPerson || '-'}</td>
                <td>{it.gstNo || '-'}</td>
                <td>{it.email || '-'}</td>
                <td>{it.phone || '-'}</td>
                <td><button className="btn danger" onClick={() => remove(it.id)}>Delete</button></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>No records yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
