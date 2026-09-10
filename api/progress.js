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
  const key = `progress:${username}`;

  if (req.method === 'GET') {
    try {
      const data = await redis.get(key);
      if (!data) return res.status(200).json({});
      const obj = typeof data === 'string' ? JSON.parse(data) : data;
      return res.status(200).json(obj);
    } catch (e) { return res.status(500).json({ error: String(e) }); }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (!body || typeof body === 'string') try { body = JSON.parse(body || '{}'); } catch { body = {}; }
    // body is { progress: {id: {...}} } or single {id, ...}
    try {
      if (body.progress && typeof body.progress === 'object') {
        await redis.set(key, JSON.stringify(body.progress));
        return res.status(200).json({ ok: true });
      }
      if (body.id) {
        const current = await redis.get(key);
        let obj = current ? (typeof current === 'string' ? JSON.parse(current) : current) : {};
        obj[String(body.id)] = body;
        await redis.set(key, JSON.stringify(obj));
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: 'progress or id required' });
    } catch (e) { return res.status(500).json({ error: String(e) }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
