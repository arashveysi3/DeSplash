import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getRedis, getUser } from '../_redis.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || 'germansplash-dev-secret-change-in-prod';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const redis = getRedis();
  if (!redis) return res.status(500).json({ error: 'Redis not configured' });

  let body = req.body;
  if (!body || typeof body === 'string') try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  const { username, password } = body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  const user = await getUser(redis, username);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });

  const token = jwt.sign({ username: user.username, isAdmin: !!user.isAdmin }, JWT_SECRET, { expiresIn: '30d' });
  const { passwordHash, ...safe } = user;
  return res.status(200).json({ token, user: safe });
}
