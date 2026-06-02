import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const PERIODS = [
  { key: 'all', label: 'Global' },
  { key: '1y',  label: '1 an' },
  { key: '6m',  label: '6 mois' },
  { key: '3m',  label: '3 mois' },
  { key: '1m',  label: '1 mois' },
  { key: '1w',  label: '1 semaine' },
];

export default function StatsPage() {
  const { user } = useAuth();
  const [items, setItems]               = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [period, setPeriod]             = useState('1m');
  const [stats, setStats]               = useState([]);
  const [goals, setGoals]               = useState([]);
  const [userScope, setUserScope]       = useState('me');   // 'me' | 'all' | '<id>'
  const [users, setUsers]               = useState([]);

  useEffect(() => {
    const promises = [api.getItems(), api.getGoals()];
    if (user?.role === 'admin') promises.push(api.getUsers());
    Promise.all(promises).then(([i, g, u]) => {
      setItems(i);
      setGoals(g);
      if (u) setUsers(u);
      if (i.length > 0) setSelectedItem(i[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedItem) return;
    api.getStats(selectedItem.id, period, userScope).then(setStats).catch(console.error);
  }, [selectedItem, period, userScope]);

  const goalMap = Object.fromEntries(goals.map(g => [g.item_id, g]));
  const goal = (userScope === 'me') ? goalMap[selectedItem?.id] : null;

  const totalPeriod = stats.reduce((s, r) => s + Number(r.total), 0);
  const avgDay = stats.length ? Math.round(totalPeriod / stats.length) : 0;

  // Label scope for chart
  const scopeLabel = userScope === 'me'
    ? user?.username
    : userScope === 'all'
      ? 'Tous les utilisateurs'
      : users.find(u => String(u.id) === userScope)?.username || userScope;

  const chartData = {
    labels: stats.map(r => new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })),
    datasets: [
      {
        label: `${selectedItem?.name || ''} — ${scopeLabel}`,
        data: stats.map(r => Number(r.total)),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.12)',
        fill: true,
        tension: 0.3,
        pointRadius: stats.length > 60 ? 0 : 3,
      },
      ...(goal ? [{
        label: `Objectif (${goal.target} ${goal.period === 'daily' ? '/jour' : '/semaine'})`,
        data: stats.map(() => goal.target),
        borderColor: '#22c55e',
        borderDash: [6, 4],
        backgroundColor: 'transparent',
        pointRadius: 0,
      }] : []),
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#94a3b8' } },
    },
    scales: {
      x: { ticks: { color: '#94a3b8', maxTicksLimit: 10 }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' }, beginAtZero: true },
    },
  };

  return (
    <>
      <div className="topbar"><h1>Statistiques</h1></div>

      <div className="card mb-4">
        <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>

          {/* Exercice */}
          <select
            value={selectedItem?.id || ''}
            onChange={e => setSelectedItem(items.find(i => i.id === Number(e.target.value)))}
            style={{ minWidth: 160 }}
          >
            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>

          {/* Scope utilisateur — visible pour tous */}
          <div className="period-tabs">
            <button
              className={`period-tab ${userScope === 'me' ? 'active' : ''}`}
              onClick={() => setUserScope('me')}
            >
              👤 Mon suivi
            </button>
            <button
              className={`period-tab ${userScope === 'all' ? 'active' : ''}`}
              onClick={() => setUserScope('all')}
            >
              👥 Tous
            </button>
            {/* Admin : sélecteur par utilisateur spécifique */}
            {user?.role === 'admin' && users.length > 0 && (
              <select
                style={{ marginLeft: 4 }}
                value={['me', 'all'].includes(userScope) ? '' : userScope}
                onChange={e => e.target.value && setUserScope(e.target.value)}
              >
                <option value="">— Utilisateur spécifique —</option>
                {users.map(u => (
                  <option key={u.id} value={String(u.id)}>{u.username}</option>
                ))}
              </select>
            )}
          </div>

          {/* Période */}
          <div className="period-tabs">
            {PERIODS.map(p => (
              <button
                key={p.key}
                className={`period-tab ${period === p.key ? 'active' : ''}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-3 mb-4">
        <div className="stat-tile">
          <div className="stat-val">{totalPeriod}</div>
          <div className="stat-label">Total période ({selectedItem?.unit})</div>
        </div>
        <div className="stat-tile">
          <div className="stat-val">{avgDay}</div>
          <div className="stat-label">Moyenne / jour actif</div>
        </div>
        <div className="stat-tile">
          <div className="stat-val">{stats.length}</div>
          <div className="stat-label">Jours enregistrés</div>
        </div>
      </div>

      <div className="card">
        {stats.length === 0
          ? <p className="text-muted">Aucune donnée pour cette période.</p>
          : <Line data={chartData} options={chartOptions} />
        }
      </div>
    </>
  );
}
