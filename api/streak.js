import jwt from 'jsonwebtoken';
import { getRedis } from './_redis.js';
import {
  applyStreakActivities,
  isStreakDayKey,
  normalizeStreakAttempts,
  summarizeStreak,
  utcDayKey,
} from '../src/utils/streak.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_TOKEN || 'germansplash-dev-secret-change-in-prod';
const MAX_ACTIVITIES = 200;

function getToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get('token') || req.query?.token;
}

const daysKey = (u) => `streak:${u}:days`;
const rewardsKey = (u) => `streak:${u}:rewards`;
const sessionsKey = (u) => `streak:${u}:sessions`;

function parseJson(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

function parseDays(raw) {
  const days = [];
  if (!raw || typeof raw !== 'object') return days;
  for (const [date, value] of Object.entries(raw)) {
    if (!isStreakDayKey(date)) continue;
    const d = parseJson(value);
    if (!d || (d.status !== 'completed' && d.status !== 'protected')) continue;
    days.push({
      date,
      status: d.status,
      sessions: {},
      sources: d.sources && typeof d.sources === 'object' ? d.sources : {},
      attempts: Number(d.attempts) || 0,
      xp: Number(d.xp) || 0,
      firstAt: d.firstAt ?? null,
      lastAt: d.lastAt ?? null,
      updatedAt: d.updatedAt ?? null,
    });
  }
  return days;
}

function parseRewards(raw) {
  const rewards = [];
  if (!raw || typeof raw !== 'object') return rewards;
  for (const [id, value] of Object.entries(raw)) {
    if (!/^milestone-\d+$/.test(id)) continue;
    const r = parseJson(value);
    if (!r) continue;
    rewards.push({
      id,
      milestone: Number(r.milestone) || Number(id.split('-')[1]),
      freezes: Number(r.freezes) || 0,
      createdAt: r.createdAt || 0,
    });
  }
  return rewards;
}

function deriveCounts(days, rewards) {
  return {
    earned: rewards.reduce((a, r) => a + (Number(r.freezes) || 0), 0),
    consumed: days.filter((d) => d.status === 'protected').length,
  };
}

function serializeDay(d) {
  return JSON.stringify({
    status: d.status,
    sources: d.sources || {},
    attempts: d.attempts || 0,
    xp: d.xp || 0,
    firstAt: d.firstAt ?? null,
    lastAt: d.lastAt ?? null,
    updatedAt: d.updatedAt ?? null,
  });
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
  const now = Date.now();
  const today = utcDayKey(now);

  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, 'http://localhost');
      const start = url.searchParams.get('start') || req.query?.start;
      const end = url.searchParams.get('end') || req.query?.end;
      const [rawDays, rawRewards] = await Promise.all([
        redis.hgetall(daysKey(username)),
        redis.hgetall(rewardsKey(username)),
      ]);
      const days = parseDays(rawDays);
      const rewards = parseRewards(rawRewards);
      const { earned, consumed } = deriveCounts(days, rewards);
      const summary = summarizeStreak({ days, earnedFreezes: earned, consumedFreezes: consumed, today });
      const visible = (start && end ? days.filter((d) => d.date >= start && d.date <= end) : days)
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      return res.status(200).json({
        ok: true,
        summary,
        days: visible,
        rewards: rewards.sort((a, b) => a.milestone - b.milestone),
      });
    } catch (e) { return res.status(500).json({ error: String(e) }); }
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (!body || typeof body === 'string') try { body = JSON.parse(body || '{}'); } catch { body = {}; }
    const activities = Array.isArray(body.activities) ? body.activities.slice(0, MAX_ACTIVITIES) : [];
    if (activities.length === 0) return res.status(400).json({ error: 'activities required' });
    let valid = [];
    try {
      valid = normalizeStreakAttempts(activities, now);
    } catch {
      return res.status(400).json({ error: 'invalid activities' });
    }
    if (valid.length === 0) return res.status(400).json({ error: 'no qualifying activity' });
    try {
      const [rawDays, rawRewards, seenSessions] = await Promise.all([
        redis.hgetall(daysKey(username)),
        redis.hgetall(rewardsKey(username)),
        redis.smembers(sessionsKey(username)),
      ]);
      const seen = new Set(Array.isArray(seenSessions) ? seenSessions : []);
      const days = parseDays(rawDays);
      const rewards = parseRewards(rawRewards);
      const fresh = valid.filter((a) => !seen.has(a.sessionId));
      const { earned, consumed } = deriveCounts(days, rewards);
      const applied = applyStreakActivities({
        days,
        claimedMilestones: rewards.map((r) => r.id),
        earnedFreezes: earned,
        consumedFreezes: consumed,
        activities: fresh,
        today,
        now,
      });
      // Idempotent writes: day rows keyed by date, rewards HSETNX by
      // milestone id, sessions SADD. Retries converge to the same state.
      const pipe = redis.pipeline();
      for (const d of applied.days) pipe.hset(daysKey(username), { [d.date]: serializeDay(d) });
      for (const m of applied.events.awardedMilestones) {
        pipe.hsetnx(rewardsKey(username), m.id, JSON.stringify({ milestone: m.milestone, freezes: m.freezes, createdAt: now }));
      }
      const newSessionIds = [...new Set(fresh.map((a) => a.sessionId))];
      if (newSessionIds.length) pipe.sadd(sessionsKey(username), newSessionIds[0], ...newSessionIds.slice(1));
      await pipe.exec();
      // Best-effort legacy stats/user sync so header/profile/leaderboard stay consistent.
      try {
        const skey = `stats:${username}`;
        const rawStats = await redis.get(skey);
        const stats = parseJson(rawStats) || { xp: 0, streak: 0, lastStudyDate: null, totalReviews: 0 };
        const completed = applied.days.filter((d) => d.status === 'completed').map((d) => d.date).sort();
        const latestCompleted = completed.length ? completed[completed.length - 1] : null;
        if (latestCompleted && (!stats.lastStudyDate || latestCompleted > stats.lastStudyDate)) {
          stats.lastStudyDate = latestCompleted;
        }
        stats.streak = applied.summary.current;
        stats.longestStreak = Math.max(stats.longestStreak || 0, applied.summary.longest);
        await redis.set(skey, JSON.stringify(stats));
        const uk = `user:${username}`;
        const rawUser = await redis.get(uk);
        const user = parseJson(rawUser);
        if (user) {
          user.streak = applied.summary.current;
          await redis.set(uk, JSON.stringify(user));
        }
      } catch {}
      return res.status(200).json({
        ok: true,
        summary: applied.summary,
        days: applied.days,
        rewards: applied.claimedMilestones.map((id) => {
          const known = rewards.find((r) => r.id === id);
          const milestone = known ? known.milestone : Number(id.split('-')[1]);
          const found = applied.events.awardedMilestones.find((m) => m.id === id);
          return {
            id,
            milestone,
            freezes: known ? known.freezes : (found ? found.freezes : 0),
            createdAt: known ? known.createdAt : now,
          };
        }),
        events: applied.events,
      });
    } catch (e) { return res.status(500).json({ error: String(e) }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
