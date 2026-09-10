import { Redis } from '@upstash/redis';

let _redis = null;
export function getRedis() {
  if (_redis) return _redis;
  try {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      _redis = new Redis({ url, token });
      return _redis;
    }
    try { _redis = Redis.fromEnv(); return _redis; } catch { return null; }
  } catch { return null; }
}

export async function getBoard(redis) {
  if (!redis) return null;
  try {
    const data = await redis.get('leaderboard');
    if (!data) return null;
    return Array.isArray(data) ? data : JSON.parse(data);
  } catch { return null; }
}

// Users helpers
export async function getUser(redis, username) {
  if (!redis) return null;
  try {
    const key = `user:${username.toLowerCase()}`;
    const data = await redis.get(key);
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch { return null; }
}

export async function saveUser(redis, user) {
  if (!redis) return;
  await redis.set(`user:${user.username.toLowerCase()}`, JSON.stringify(user));
  // also maintain users index
  await redis.sadd('users', user.username.toLowerCase());
}

export async function listUsers(redis) {
  if (!redis) return [];
  try {
    const members = await redis.smembers('users');
    if (!members || members.length === 0) return [];
    const users = [];
    for (const u of members) {
      const data = await redis.get(`user:${u}`);
      if (data) users.push(typeof data === 'string' ? JSON.parse(data) : data);
    }
    return users;
  } catch { return []; }
}
