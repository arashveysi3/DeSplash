import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getRedis, getUser, saveUser } from '../_redis.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || 'germansplash-dev-secret-change-in-prod';
const ADMIN_USER = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const redis = getRedis();
  if (!redis) return res.status(500).json({ error: 'Redis not configured. Add Upstash KV on Vercel.' });

  let body = req.body;
  if (!body || typeof body === 'string') try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  const { username, email, password } = body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (username.length < 3 || password.length < 4) return res.status(400).json({ error: 'username min 3, password min 4' });
  if (!/^[a-zA-Z0-9_\-]+$/.test(username)) return res.status(400).json({ error: 'username alphanumeric + _-' });

  const existing = await getUser(redis, username);
  if (existing) return res.status(409).json({ error: 'username taken' });

  const hash = await bcrypt.hash(password, 10);
  const isAdmin = username.toLowerCase() === ADMIN_USER;
  const user = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    username,
    email: email || '',
    passwordHash: hash,
    xp: 0,
    streak: 0,
    totalReviews: 0,
    level: 'A1.1',
    isAdmin,
    createdAt: new Date().toISOString(),
  };
  await saveUser(redis, user);
  // init leaderboard entry
  try {
    let board = await redis.get('leaderboard');
    if (board && typeof board === 'string') board = JSON.parse(board);
    if (!Array.isArray(board)) board = [];
    board = board.filter(b => b.name.toLowerCase() !== username.toLowerCase());
    board.push({ name: username, xp: 0, avatar: username.slice(0,2).toUpperCase() });
    board = board.sort((a,b)=> b.xp - a.xp).slice(0,50);
    await redis.set('leaderboard', JSON.stringify(board));
  } catch {}

  const token = jwt.sign({ username, isAdmin }, JWT_SECRET, { expiresIn: '30d' });
  const { passwordHash, ...safe } = user;
  return res.status(200).json({ token, user: safe });
}
