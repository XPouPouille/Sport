const BASE = '/api';

function headers() {
  const token = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function request(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  login: (data) => request('POST', '/auth/login', data),
  register: (data) => request('POST', '/auth/register', data),
  getUsers: () => request('GET', '/users'),
  deleteUser: (id) => request('DELETE', `/users/${id}`),
  patchUserRole: (id, role) => request('PATCH', `/users/${id}/role`, { role }),
  getItems: () => request('GET', '/items'),
  createItem: (data) => request('POST', '/items', data),
  deleteItem: (id) => request('DELETE', `/items/${id}`),
  getGoals: () => request('GET', '/goals'),
  setGoal: (data) => request('POST', '/goals', data),
  getLogs: (params = {}) => request('GET', '/logs?' + new URLSearchParams(params)),
  createLog: (data) => request('POST', '/logs', data),
  deleteLog: (id) => request('DELETE', `/logs/${id}`),
  getStats: (item_id, period, user_id = 'me') => request('GET', `/stats?item_id=${item_id}&period=${period}&user_id=${user_id}`),
};
