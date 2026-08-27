import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@shoolinilifesciences.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <img src="/logo.png" alt="SLS" />
        <h2 style={{ marginTop: 0 }}>Sign in</h2>
        <form onSubmit={submit}>
          <div className="field" style={{ textAlign: 'left' }}>
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="field" style={{ textAlign: 'left' }}>
            <label>Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>
          {error && <p style={{ color: '#C0392B', fontSize: 13 }}>{error}</p>}
          <button className="btn" type="submit" style={{ width: '100%' }}>Log in</button>
        </form>
        <p style={{ fontSize: 11, color: '#999', marginTop: 16 }}>
          Run <code>npm run seed</code> in /backend to create a demo admin login.
        </p>
      </div>
    </div>
  );
}
