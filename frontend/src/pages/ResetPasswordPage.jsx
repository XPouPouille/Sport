import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [valid, setValid] = useState(null); // null=loading, true, false
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setValid(false); return; }
    api.validateResetToken(token)
      .then(r => { setValid(true); setUsername(r.username); })
      .catch(() => setValid(false));
  }, [token]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) { setError(err.message); }
  }

  if (valid === null) return <div className="auth-wrap"><p className="text-muted">Vérification...</p></div>;

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-title">🔑 Nouveau mot de passe</div>

        {!valid && (
          <>
            <div className="alert alert-error">Lien invalide ou expiré.</div>
            <p className="text-muted mt-4" style={{ textAlign: 'center' }}>
              <a href="/login">Retour à la connexion</a>
            </p>
          </>
        )}

        {valid && !done && (
          <form onSubmit={submit}>
            <p className="text-muted mb-4">Bonjour <strong>{username}</strong>, choisissez un nouveau mot de passe.</p>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label>Nouveau mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="form-group">
              <label>Confirmer</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
            </div>
            <button type="submit" className="btn btn-primary w-full">Enregistrer</button>
          </form>
        )}

        {done && (
          <div className="alert alert-success">
            Mot de passe mis à jour ! Redirection vers la connexion...
          </div>
        )}
      </div>
    </div>
  );
}
