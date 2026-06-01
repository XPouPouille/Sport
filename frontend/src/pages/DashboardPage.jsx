import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const [items, setItems] = useState([]);
  const [goals, setGoals] = useState([]);
  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      api.getItems(),
      api.getGoals(),
      api.getLogs({ from: today + 'T00:00:00', to: today + 'T23:59:59' }),
    ]).then(([i, g, l]) => { setItems(i); setGoals(g); setLogs(l); }).catch(console.error);
  }, []);

  const goalMap = Object.fromEntries(goals.map(g => [g.item_id, g]));
  const todayTotals = {};
  logs.forEach(l => { todayTotals[l.item_id] = (todayTotals[l.item_id] || 0) + l.quantity; });

  const itemsWithGoals = items.filter(i => goalMap[i.id]);

  return (
    <>
      <div className="topbar">
        <h1>Dashboard</h1>
        <button className="btn btn-primary" onClick={() => navigate('/log')}>+ Enregistrer</button>
      </div>

      {itemsWithGoals.length === 0 && (
        <div className="card">
          <p className="text-muted">Aucun objectif défini. <a href="#" onClick={() => navigate('/items')}>Ajouter des exercices</a> et définir des objectifs.</p>
        </div>
      )}

      <div className="grid grid-2">
        {itemsWithGoals.map(item => {
          const goal = goalMap[item.id];
          const done = todayTotals[item.id] || 0;
          const pct = Math.min(100, Math.round((done / goal.target) * 100));
          return (
            <div key={item.id} className="card">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div className="text-muted">{item.unit} · objectif {goal.period === 'daily' ? 'quotidien' : 'hebdo'}</div>
                </div>
                <div className="stat-val" style={{ fontSize: '1.5rem' }}>{done}<span style={{ fontSize: '.85rem', color: 'var(--muted)' }}>/{goal.target}</span></div>
              </div>
              <div className="progress-wrap">
                <div className={`progress-bar ${pct >= 100 ? 'done' : ''}`} style={{ width: pct + '%' }} />
              </div>
              <div className="text-muted mt-2">{pct}% accompli</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
