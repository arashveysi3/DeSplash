import jwt from 'jsonwebtoken';
import { getRedis, getUser } from '../_redis.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || 'germansplash-dev-secret-change-in-prod';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const redis = getRedis();
  if (!redis) return res.status(500).json({ error: 'Redis not configured' });

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : (req.query?.token || '');
  if (!token) return res.status(401).json({ error: 'no token' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await getUser(redis, payload.username);
    if (!user) return res.status(404).json({ error: 'user not found' });
    const { passwordHash, ...safe } = user;
    return res.status(200).json({ user: safe });
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}
