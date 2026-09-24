export async function signup(username, email, password) {
  const r = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'signup failed');
  localStorage.setItem('gs_token', j.token);
  localStorage.setItem('gs_username', j.user.username);
  return j;
}

export async function login(username, password) {
  const r = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'login failed');
  localStorage.setItem('gs_token', j.token);
  localStorage.setItem('gs_username', j.user.username);
  return j;
}

export async function fetchMe() {
  const token = localStorage.getItem('gs_token');
  if (!token) return null;
  const r = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.user;
}

export function logout() {
  localStorage.removeItem('gs_token');
  // keep username for display? remove as well
  // localStorage.removeItem('gs_username');
}

export async function fetchUsers() {
  const token = localStorage.getItem('gs_token');
  const r = await fetch('/api/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error('not admin');
  return await r.json();
}

export async function deleteUser(username) {
  const token = localStorage.getItem('gs_token');
  const r = await fetch(`/api/users?username=${encodeURIComponent(username)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!r.ok) throw new Error('delete failed');
  return await r.json();
}

export function getToken() { return localStorage.getItem('gs_token'); }
export function getUsername() { return localStorage.getItem('gs_username'); }

export async function fetchProgress() {
  const token = getToken();
  if (!token) return null;
  const r = await fetch('/api/progress', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return await r.json();
}
export async function saveProgress(progressMap) {
  const token = getToken();
  if (!token) return;
  await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ progress: progressMap }),
  });
}
export async function saveProgressOne(entry) {
  const token = getToken();
  if (!token) return;
  await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(entry),
  });
}
export async function fetchStatsOnline() {
  const token = getToken();
  if (!token) return null;
  const r = await fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return await r.json();
}
export async function saveStatsOnline(stats) {
  const token = getToken();
  if (!token) return;
  await fetch('/api/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(stats),
  });
}

// Authoritative streak confirmation (server-validated; null when offline).
export async function submitStreakActivity(activities) {
  const token = getToken();
  if (!token) return null;
  const r = await fetch('/api/streak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ activities }),
  });
  if (!r.ok) return null;
  return await r.json();
}
export async function fetchStreakState({ start = null, end = null } = {}) {
  const token = getToken();
  if (!token) return null;
  const qs = start && end ? `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}` : '';
  const r = await fetch(`/api/streak${qs}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return await r.json();
}
