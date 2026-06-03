import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

export default function ItemsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', unit: 'reps' });
  const [goalForm, setGoalForm] = useState({});
  const [error, setError] = useState('');

  async function load() {
    const [i, g] = await Promise.all([api.getItems(), api.getGoals()]);
    setItems(i);
    setGoals(g);
  }

  useEffect(() => { load(); }, []);

  async function addItem(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createItem(form);
      setForm({ name: '', description: '', unit: 'reps' });
      load();
    } catch (err) { setError(err.message); }
  }

  async function removeItem(id) {
    if (!confirm('Supprimer cet exercice ?')) return;
    await api.deleteItem(id);
    load();
  }

  async function saveGoal(item_id) {
    const g = goalForm[item_id];
    if (!g?.target) return;
    await api.setGoal({ item_id, target: Number(g.target), goal_type: g.goal_type || 'min', period: g.period || 'daily' });
    load();
  }

  const goalMap = Object.fromEntries(goals.map(g => [g.item_id, g]));

  return (
    <>
      <div className="topbar"><h1>Exercices</h1></div>

      <div className="card mb-4">
        <div className="card-title">Ajouter un exercice</div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={addItem}>
          <div className="grid grid-3" style={{ gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Nom</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="ex: Pompes" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Unité</label>
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                <option value="reps">Répétitions</option>
                <option value="km">Kilomètres</option>
                <option value="min">Minutes</option>
                <option value="kg">Kilogrammes</option>
                <option value="series">Séries</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Description (opt.)</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary mt-4">Ajouter</button>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Tous les exercices</div>
        <table>
          <thead>
            <tr><th>Nom</th><th>Unité</th><th>Objectif</th><th>Type</th><th>Période</th><th></th></tr>
          </thead>
          <tbody>
            {items.map(item => {
              const g = goalMap[item.id];
              const gf = goalForm[item.id] || {
                target: g?.target ?? '',
                goal_type: g?.goal_type ?? 'min',
                period: g?.period ?? 'daily'
              };
              return (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    {item.description && <div className="text-muted">{item.description}</div>}
                  </td>
                  <td>{item.unit}</td>
                  <td>
                    <input
                      type="number" min="0.01" step="0.01" style={{ width: 80 }}
                      value={gf.target}
                      onChange={e => setGoalForm(prev => ({ ...prev, [item.id]: { ...gf, target: e.target.value } }))}
                      placeholder="—"
                    />
                  </td>
                  <td>
                    <select
                      value={gf.goal_type}
                      onChange={e => setGoalForm(prev => ({ ...prev, [item.id]: { ...gf, goal_type: e.target.value } }))}
                      style={{ minWidth: 80 }}
                    >
                      <option value="min">⬆️ Min</option>
                      <option value="max">⬇️ Max</option>
                    </select>
                  </td>
                  <td>
                    <select value={gf.period}
                      onChange={e => setGoalForm(prev => ({ ...prev, [item.id]: { ...gf, period: e.target.value } }))}>
                      <option value="daily">Quotidien</option>
                      <option value="weekly">Hebdo</option>
                    </select>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-primary btn-sm" onClick={() => saveGoal(item.id)}>Sauver</button>
                      {user?.role === 'admin' && (
                        <button className="btn btn-danger btn-sm" onClick={() => removeItem(item.id)}>✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
