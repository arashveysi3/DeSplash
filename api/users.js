import jwt from 'jsonwebtoken';
import { getRedis, listUsers, getUser } from './_redis.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || 'germansplash-dev-secret-change-in-prod';

async function requireAdmin(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : (req.query?.token || req.body?.token || '');
  if (!token) throw new Error('no token');
  const payload = jwt.verify(token, JWT_SECRET);
  const redis = getRedis();
  const user = await getUser(redis, payload.username);
  if (!user || !user.isAdmin) throw new Error('admin only');
  return user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const redis = getRedis();
  if (!redis) return res.status(500).json({ error: 'Redis not configured' });

  if (req.method === 'GET') {
    try {
      await requireAdmin(req);
    } catch (e) {
      return res.status(403).json({ error: String(e.message) });
    }
    const users = await listUsers(redis);
    const safe = users.map(({ passwordHash, ...u }) => u).sort((a,b)=> b.xp - a.xp);
    return res.status(200).json(safe);
  }

  if (req.method === 'DELETE') {
    try {
      await requireAdmin(req);
    } catch (e) {
      return res.status(403).json({ error: String(e.message) });
    }
    let body = req.body;
    if (!body || typeof body === 'string') try { body = JSON.parse(body||'{}'); } catch { body = {}; }
    const name = body?.username || body?.name || req.query?.username || req.query?.name || (req.url && new URL(req.url, 'http://localhost').searchParams.get('username'));
    if (!name) return res.status(400).json({ error: 'username required' });
    const key = `user:${String(name).toLowerCase()}`;
    const exists = await redis.get(key);
    if (!exists) return res.status(404).json({ error: 'not found' });
    await redis.del(key);
    await redis.srem('users', String(name).toLowerCase());
    // also remove from leaderboard
    try {
      let board = await redis.get('leaderboard');
      if (board && typeof board === 'string') board = JSON.parse(board);
      if (Array.isArray(board)) {
        board = board.filter(b => b.name.toLowerCase() !== String(name).toLowerCase());
        await redis.set('leaderboard', JSON.stringify(board));
      }
    } catch {}
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
