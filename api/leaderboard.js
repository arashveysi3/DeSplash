// Vercel Serverless - Online Leaderboard (works on Vercel Free plan)
// Free-tier options on Vercel:
//  - Vercel KV (Upstash Redis) -> add via Vercel Dashboard > Storage > KV, free 256MB / 10k cmds/day
//  - Vercel Postgres (Neon) -> free 0.5GB
// This handler tries KV first, falls back to in-memory (resets on cold start) so it works even without any storage.
// For production persistence on free plan: just create a KV store and add KV env vars (KV_REST_API_URL, KV_REST_API_TOKEN) – no code change needed.

let memoryBoard = [
  { name: 'Lena M.', xp: 4820, avatar: 'LM' },
  { name: 'Jonas K.', xp: 4210, avatar: 'JK' },
  { name: 'Sophie R.', xp: 3890, avatar: 'SR' },
  { name: 'Maxim B.', xp: 3450, avatar: 'MB' },
];

async function getKV() {
  // Support both Vercel KV (KV_REST_API_URL) and Upstash directly (UPSTASH_REDIS_REST_URL)
  // Use REST fetch directly to avoid needing @vercel/kv at build time (fixes vite:import-analysis error)
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return {
    get: async (key) => {
      try {
        const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json();
        return j.result ? JSON.parse(j.result) : null;
      } catch { return null; }
    },
    set: async (key, val) => {
      try {
        await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(val))}`, { headers: { Authorization: `Bearer ${token}` } });
      } catch {}
    },
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const kv = await getKV();

  if (req.method === 'GET') {
    try {
      if (kv) {
        const data = await kv.get('leaderboard');
        if (data) return res.status(200).json(data);
      }
    } catch {}
    return res.status(200).json(memoryBoard);
  }

  if (req.method === 'POST') {
    try {
      const { name, xp } = req.body || {};
      if (!name || typeof xp !== 'number') return res.status(400).json({ error: 'name and xp required' });
      const entry = { name: String(name).slice(0, 24), xp: Math.max(0, Math.floor(xp)), avatar: String(name).slice(0,2).toUpperCase() };
      if (kv) {
        let board = (await kv.get('leaderboard')) || memoryBoard;
        // upsert
        const idx = board.findIndex(b => b.name.toLowerCase() === entry.name.toLowerCase());
        if (idx >= 0) { if (entry.xp > board[idx].xp) board[idx] = entry; } else board.push(entry);
        board = board.sort((a,b)=> b.xp - a.xp).slice(0, 50);
        await kv.set('leaderboard', board);
        return res.status(200).json(board);
      } else {
        const idx = memoryBoard.findIndex(b => b.name.toLowerCase() === entry.name.toLowerCase());
        if (idx >= 0) { if (entry.xp > memoryBoard[idx].xp) memoryBoard[idx] = entry; } else memoryBoard.push(entry);
        memoryBoard = memoryBoard.sort((a,b)=> b.xp - a.xp).slice(0, 50);
        return res.status(200).json(memoryBoard);
      }
    } catch (e) {
      return res.status(500).json({ error: String(e) });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
