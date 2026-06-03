import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

export default function ProfilePage() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ phone: '', telegram_chat_id: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '';

  useEffect(() => {
    api.getProfile().then(p => {
      setForm({ phone: p.phone || '', telegram_chat_id: p.telegram_chat_id || '' });
    }).catch(console.error);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const updated = await api.updateProfile(form);
      setSuccess('Profil mis à jour.');
      // Update localStorage user
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, phone: updated.phone, telegram_chat_id: updated.telegram_chat_id }));
    } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="topbar"><h1>Mon profil</h1></div>

      <div className="card" style={{ maxWidth: 480 }}>
        <div className="card-title">Informations</div>
        <div className="form-group">
          <label>Nom d'utilisateur</label>
          <input value={user?.username || ''} disabled style={{ opacity: .6 }} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input value={user?.email || ''} disabled style={{ opacity: .6 }} />
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label>Téléphone</label>
            <input
              type="tel" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+33 6 00 00 00 00"
            />
          </div>

          <div className="form-group">
            <label>Telegram Chat ID</label>
            <input
              value={form.telegram_chat_id}
              onChange={e => setForm(f => ({ ...f, telegram_chat_id: e.target.value }))}
              placeholder="ex: 123456789"
            />
            {botUsername && (
              <div className="text-muted mt-2">
                Pour obtenir votre Chat ID : ouvrir{' '}
                <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer">
                  @{botUsername}
                </a>{' '}
                sur Telegram et envoyer <code>/start</code>
              </div>
            )}
            {!botUsername && (
              <div className="text-muted mt-2">
                Ouvrez le bot Sport Tracker sur Telegram et envoyez <code>/start</code> pour obtenir votre Chat ID.
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary">Enregistrer</button>
        </form>
      </div>
    </>
  );
}
