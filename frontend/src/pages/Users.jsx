import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../api/AuthContext';

const emptyForm = { name: '', email: '', password: '', role: 'manager', designation: '' };
const ROLE_HELP = {
  admin: 'Full access, including managing other users',
  manager: 'Can create and edit quotations, purchase orders, customers, vendors, items',
  viewer: 'Read-only access',
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => api.get('/users').then(setUsers).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const changeRole = async (u, role) => {
    try {
      await api.put(`/users/${u.id}`, { role });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const editDesignation = async (u) => {
    const newDesignation = prompt(`Set designation for ${u.name}:`, u.designation || '');
    if (newDesignation === null) return;
    try {
      await api.put(`/users/${u.id}`, { designation: newDesignation });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const remove = async (u) => {
    if (!confirm(`Remove ${u.name}'s login? They won't be able to sign in anymore.`)) return;
    try {
      await api.del(`/users/${u.id}`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const resetPassword = async (u) => {
    const newPassword = prompt(`Set a new password for ${u.name}${u.id === currentUser.id ? ' (you)' : ''}:`);
    if (!newPassword) return;
    try {
      await api.put(`/users/${u.id}`, { password: newPassword });
      alert('Password updated.');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Users</h1>
        <button className="btn" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>
      <p style={{ color: '#777', fontSize: 13, marginTop: -10, marginBottom: 20 }}>
        Each person should have their own login — avoid sharing one account across a team.
        Name and designation show on quotations and purchase orders they create.
      </p>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="field">
                <label>Full Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="field">
                <label>Designation</label>
                <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Sales Executive, Lab Manager" />
              </div>
              <div className="field">
                <label>Email *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="field">
                <label>Temporary Password *</label>
                <input required type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="They can use this to log in" />
              </div>
              <div className="field">
                <label>Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="viewer">Viewer</option>
                </select>
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{ROLE_HELP[form.role]}</div>
              </div>
            </div>
            {error && <p style={{ color: '#C0392B' }}>{error}</p>}
            <button className="btn" type="submit">Create User</button>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Designation</th><th>Email</th><th>Role</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}{u.id === currentUser.id && <span style={{ color: '#999', fontSize: 11 }}> (you)</span>}</td>
                <td>
                  <span style={{ cursor: 'pointer' }} onClick={() => editDesignation(u)} title="Click to edit">
                    {u.designation || <span style={{ color: '#aaa' }}>— set —</span>}
                  </span>
                </td>
                <td>{u.email}</td>
                <td>
                  <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} style={{ width: 'auto', padding: '4px 8px' }}>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td>
                  <button className="btn secondary" style={{ marginRight: 8 }} onClick={() => resetPassword(u)}>Reset Password</button>
                  {u.id !== currentUser.id && (
                    <button className="btn danger" onClick={() => remove(u)}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
