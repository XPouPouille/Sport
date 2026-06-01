import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

export default function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        const res = await api.login({ email: form.email, password: form.password });
        login(res.token, res.user);
        navigate('/dashboard');
      } else {
        await api.register(form);
        setMode('login');
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-title">🏋️ Sport Tracker</div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          {mode === 'register' && (
            <div className="form-group">
              <label>Nom d'utilisateur</label>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          <button type="submit" className="btn btn-primary w-full">
            {mode === 'login' ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>
        <p className="text-muted mt-4" style={{ textAlign: 'center' }}>
          {mode === 'login' ? "Pas de compte ? " : "Déjà inscrit ? "}
          <a href="#" onClick={e => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); }}>
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </a>
        </p>
      </div>
    </div>
  );
}
