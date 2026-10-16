const TOKEN_KEY = 'pe_admin_token';

export const adminToken = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } },
};

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = adminToken.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b ?? {}),
  put: (p, b) => request('PUT', p, b ?? {}),
  del: (p) => request('DELETE', p),
};

/** Entity helper mirroring the backend's generic CRUD. */
export const entity = (name) => ({
  list: (filter = {}, sort = '-created_date', limit) => {
    const q = new URLSearchParams({ ...filter, sort, ...(limit ? { limit } : {}) });
    return api.get(`/entities/${name}?${q}`);
  },
  get: (idOrSlug) => api.get(`/entities/${name}/${idOrSlug}`),
  create: (data) => api.post(`/entities/${name}`, data),
  update: (id, data) => api.put(`/entities/${name}/${id}`, data),
  remove: (id) => api.del(`/entities/${name}/${id}`),
});
