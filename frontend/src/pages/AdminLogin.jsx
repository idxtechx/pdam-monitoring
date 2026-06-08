import React, { useState } from 'react';
import { Lock, User, AlertCircle, Droplet, ArrowLeft } from 'lucide-react';

const AdminLogin = ({ onLoginSuccess, onBackToPublic }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        // Save token to localStorage
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.admin));
        
        // Callback to parent App component
        onLoginSuccess();
      } else {
        setError(data.message || 'Gagal login. Username atau password salah.');
      }
    } catch (err) {
      console.error(err);
      setError('Koneksi ke server gagal. Pastikan backend server aktif.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page-bg">
      <div className="login-card">
        {/* Back Button */}
        <button 
          onClick={onBackToPublic}
          style={{
            position: 'absolute',
            top: '1.25rem',
            left: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          <ArrowLeft size={14} />
          Kembali
        </button>

        <div className="login-logo">
          <div className="login-logo-icon">
            <Droplet size={32} />
          </div>
          <h1 className="login-title">Admin PDAM</h1>
          <p className="login-subtitle">Silakan masuk untuk mengelola alat monitoring</p>
        </div>

        {error && (
          <div className="error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <div className="form-input-wrapper">
              <User size={18} />
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="form-input-wrapper">
              <Lock size={18} />
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-submit"
            disabled={submitting}
          >
            {submitting ? 'Memverifikasi...' : 'Masuk ke Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
