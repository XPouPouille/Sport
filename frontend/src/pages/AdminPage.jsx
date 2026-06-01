import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { Navigate } from 'react-router-dom';

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  async function load() {
    const u = await api.getUsers();
    setUsers(u);
  }

  useEffect(() => { load(); }, []);

  async function toggleRole(u) {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Passer ${u.username} en ${newRole} ?`)) return;
    try {
      await api.patchUserRole(u.id, newRole);
      load();
    } catch (err) { setError(err.message); }
  }

  async function deleteUser(u) {
    if (!confirm(`Supprimer l'utilisateur ${u.username} ?`)) return;
    try {
      await api.deleteUser(u.id);
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="topbar"><h1>Administration</h1></div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="card">
        <div className="card-title">Utilisateurs ({users.length})</div>
        <table>
          <thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Inscrit le</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.username}</td>
                <td className="text-muted">{u.email}</td>
                <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                <td className="text-muted">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleRole(u)}>
                      {u.role === 'admin' ? '↓ user' : '↑ admin'}
                    </button>
                    {u.id !== user.id && (
                      <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u)}>Supprimer</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
