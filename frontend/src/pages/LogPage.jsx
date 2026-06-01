import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { api } from '../api.js';

export default function LogPage() {
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({ item_id: '', quantity: '', note: '' });
  const [date, setDate] = useState(new Date());
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function load(d) {
    const items = await api.getItems();
    setItems(items);
    const from = new Date(d); from.setHours(0, 0, 0, 0);
    const to = new Date(d); to.setHours(23, 59, 59, 999);
    const logs = await api.getLogs({ from: from.toISOString(), to: to.toISOString() });
    setLogs(logs);
  }

  useEffect(() => { load(date); }, []);

  async function submit(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      const logDate = new Date(date);
      logDate.setHours(new Date().getHours(), new Date().getMinutes());
      await api.createLog({ ...form, quantity: Number(form.quantity), logged_at: logDate.toISOString() });
      setSuccess('Entrée enregistrée !');
      setForm(f => ({ ...f, quantity: '', note: '' }));
      load(date);
    } catch (err) { setError(err.message); }
  }

  async function deleteLog(id) {
    await api.deleteLog(id);
    load(date);
  }

  async function changeDate(d) {
    setDate(d);
    load(d);
  }

  const selectedItem = items.find(i => i.id === Number(form.item_id));

  return (
    <>
      <div className="topbar"><h1>Enregistrer une séance</h1></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-title">Nouvelle entrée</div>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label>Date</label>
              <DatePicker selected={date} onChange={changeDate} dateFormat="dd/MM/yyyy" className="w-full" />
            </div>
            <div className="form-group">
              <label>Exercice</label>
              <select value={form.item_id} onChange={e => setForm(f => ({ ...f, item_id: e.target.value }))} required>
                <option value="">-- Choisir --</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Quantité {selectedItem ? `(${selectedItem.unit})` : ''}</label>
              <input type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Note (opt.)</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="ex: fatigue, bonne forme..." />
            </div>
            <button type="submit" className="btn btn-primary w-full">Enregistrer</button>
          </form>
        </div>

        <div className="card">
          <div className="card-title">Entrées du {date.toLocaleDateString('fr-FR')}</div>
          {logs.length === 0 ? (
            <p className="text-muted">Aucune entrée ce jour.</p>
          ) : (
            <table>
              <thead><tr><th>Exercice</th><th>Quantité</th><th>Note</th><th></th></tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td>{l.item_name}</td>
                    <td>{l.quantity} {l.unit}</td>
                    <td className="text-muted">{l.note || '—'}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => deleteLog(l.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
