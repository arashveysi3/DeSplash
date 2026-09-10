import jwt from 'jsonwebtoken';
import { getRedis } from './_redis.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || 'germansplash-dev-secret-change-in-prod';

function getToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get('token') || req.query?.token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const redis = getRedis();
  if (!redis) return res.status(500).json({ error: 'Redis not configured' });

  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'no token' });
  let payload;
  try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: 'invalid token' }); }
  const username = payload.username.toLowerCase();
  const key = `stats:${username}`;

  if (req.method === 'GET') {
    try {
      const data = await redis.get(key);
      if (!data) return res.status(200).json({ xp: 0, streak: 0, lastStudyDate: null, totalReviews: 0 });
      const obj = typeof data === 'string' ? JSON.parse(data) : data;
      return res.status(200).json(obj);
    } catch (e) { return res.status(500).json({ error: String(e) }); }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (!body || typeof body === 'string') try { body = JSON.parse(body || '{}'); } catch { body = {}; }
    try {
      // body is stats object
      await redis.set(key, JSON.stringify(body));
      // also sync to user record for leaderboard
      const uk = `user:${username}`;
      const u = await redis.get(uk);
      if (u) {
        const user = typeof u === 'string' ? JSON.parse(u) : u;
        if (typeof body.xp === 'number') user.xp = body.xp;
        if (typeof body.streak === 'number') user.streak = body.streak;
        if (typeof body.totalReviews === 'number') user.totalReviews = body.totalReviews;
        await redis.set(uk, JSON.stringify(user));
        // update leaderboard
        let board = await redis.get('leaderboard');
        if (board && typeof board === 'string') try { board = JSON.parse(board); } catch { board = null; }
        if (Array.isArray(board)) {
          const idx = board.findIndex(b => b.name.toLowerCase() === user.username.toLowerCase());
          if (idx >= 0) board[idx].xp = user.xp;
          else board.push({ name: user.username, xp: user.xp, avatar: user.username.slice(0,2).toUpperCase() });
          board = board.sort((a,b)=> b.xp - a.xp).slice(0,50);
          await redis.set('leaderboard', JSON.stringify(board));
        }
      }
      return res.status(200).json({ ok: true });
    } catch (e) { return res.status(500).json({ error: String(e) }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
