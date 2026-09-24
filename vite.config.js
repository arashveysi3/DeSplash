import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { Redis } from '@upstash/redis'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { applyStreakActivities, isStreakDayKey, normalizeStreakAttempts, summarizeStreak, utcDayKey } from './src/utils/streak.js'

// Auto-generate changelog.json from git commits for PWA updater
function changelogPlugin() {
  const generate = () => {
    try {
      const outPath = path.resolve(process.cwd(), 'public/changelog.json')
      let commits = []
      try {
        const log = execSync('git log --oneline -15 --no-merges --pretty=format:"%h%x1f%s%x1f%an%x1f%ar%x1f%H"', { encoding: 'utf-8' }).trim()
        if (log) {
          commits = log.split('\n').filter(Boolean).map(line => {
            const [hash, subject, author, date, fullHash] = line.split('\x1f')
            return {
              hash,
              fullHash,
              subject,
              author,
              date,
              url: `https://github.com/arashveysi3/DeSplash/commit/${hash}`
            }
          })
        }
      } catch {}
      // fallback to existing file if git fails (e.g. no .git in prod)
      if (!commits.length) {
        try {
          const existing = JSON.parse(fs.readFileSync(outPath, 'utf-8'))
          commits = existing.commits || []
        } catch {}
      }
      const version = commits[0]?.hash || 'dev'
      const payload = {
        version,
        generatedAt: new Date().toISOString(),
        repo: 'https://github.com/arashveysi3/DeSplash',
        commits
      }
      fs.mkdirSync(path.dirname(outPath), { recursive: true })
      fs.writeFileSync(outPath, JSON.stringify(payload, null, 2))
      // also ensure dist copy if dist exists (for already-built cases)
      const distPath = path.resolve(process.cwd(), 'dist/changelog.json')
      if (fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
        try { fs.writeFileSync(distPath, JSON.stringify(payload, null, 2)) } catch {}
      }
    } catch (e) {
      console.warn('[changelog] failed', e?.message)
    }
  }
  return {
    name: 'changelog-generator',
    buildStart: generate,
    configureServer(server) {
      // regenerate on dev start
      generate()
    }
  }
}

// Dev-only in-memory fallback for /api/* so `npm run dev` works without Vercel
let devMemoryBoard = [
  { name: 'Lena M.', xp: 4820, avatar: 'LM' },
  { name: 'Jonas K.', xp: 4210, avatar: 'JK' },
  { name: 'Sophie R.', xp: 3890, avatar: 'SR' },
  { name: 'Maxim B.', xp: 3450, avatar: 'MB' },
];
function devApiPlugin() {
  return {
    name: 'dev-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      const getEnv = (k) => process.env[k] || env[k] || env[`VITE_${k}`];
      const JWT_SECRET = getEnv('JWT_SECRET') || getEnv('ADMIN_TOKEN') || 'germansplash-dev-secret-change-in-prod';
      const ADMIN_USER = (getEnv('ADMIN_USERNAME') || 'admin').toLowerCase();
      const getRedis = () => {
        try {
          const url = getEnv('UPSTASH_REDIS_REST_URL') || getEnv('KV_REST_API_URL');
          const token = getEnv('UPSTASH_REDIS_REST_TOKEN') || getEnv('KV_REST_API_TOKEN');
          if (url && token) return new Redis({ url, token });
          try { return Redis.fromEnv(); } catch { return null; }
        } catch { return null; }
      };
      const getUser = async (redis, username) => {
        if (!redis) return null;
        const data = await redis.get(`user:${username.toLowerCase()}`);
        return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
      };
      const saveUser = async (redis, user) => {
        await redis.set(`user:${user.username.toLowerCase()}`, JSON.stringify(user));
        await redis.sadd('users', user.username.toLowerCase());
      };

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        const urlObj = new URL(req.url, 'http://localhost');
        const path = urlObj.pathname;
        console.log('[dev-api] hit', req.method, req.url);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');
        if (req.method === 'OPTIONS') { res.statusCode = 200; return res.end(); }

        let redis = null;
        try { redis = getRedis(); } catch { redis = null; }

        // helper to read body
        const readBody = async () => {
          let b = ''; for await (const c of req) b += c;
          if (!b) return {};
          try { return JSON.parse(b); } catch { return {}; }
        };

        // /api/leaderboard
        if (path === '/api/leaderboard') {
          if (req.method === 'GET') {
            try {
              if (redis) {
                const data = await redis.get('leaderboard');
                if (data) {
                  const arr = Array.isArray(data) ? data : JSON.parse(data);
                  res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(arr));
                }
              }
            } catch (e) { console.error('dev redis GET', e); }
            res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(devMemoryBoard));
          }
          if (req.method === 'POST') {
            const body = await readBody();
            const { name, xp } = body;
            if (!name || typeof xp !== 'number') { res.statusCode=400; return res.end(JSON.stringify({error:'name and xp required'})); }
            const entry = { name: String(name).slice(0,24), xp: Math.max(0, Math.floor(xp)), avatar: String(name).slice(0,2).toUpperCase() };
            if (redis) {
              let board = await redis.get('leaderboard');
              if (board && typeof board === 'string') try { board = JSON.parse(board); } catch { board = null; }
              if (!Array.isArray(board)) board = devMemoryBoard;
              const idx = board.findIndex(b=> b.name.toLowerCase()===entry.name.toLowerCase());
              if (idx>=0) { if(entry.xp>board[idx].xp) board[idx]=entry; } else board.push(entry);
              board = board.sort((a,b)=> b.xp - a.xp).slice(0,50);
              await redis.set('leaderboard', JSON.stringify(board));
              try { const uk=`user:${entry.name.toLowerCase()}`; const u=await redis.get(uk); if(u){ const user=typeof u==='string'?JSON.parse(u):u; if(entry.xp>(user.xp||0)){ user.xp=entry.xp; await redis.set(uk, JSON.stringify(user)); } } } catch {}
              res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(board));
            } else {
              const idx = devMemoryBoard.findIndex(b=> b.name.toLowerCase()===entry.name.toLowerCase());
              if (idx>=0) { if(entry.xp>devMemoryBoard[idx].xp) devMemoryBoard[idx]=entry; } else devMemoryBoard.push(entry);
              devMemoryBoard = devMemoryBoard.sort((a,b)=> b.xp - a.xp).slice(0,50);
              res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(devMemoryBoard));
            }
          }
          if (req.method === 'DELETE') {
            const adminToken = getEnv('ADMIN_TOKEN') || getEnv('LEADERBOARD_ADMIN_TOKEN');
            const token = req.headers['x-admin-token'] || urlObj.searchParams.get('adminToken') || urlObj.searchParams.get('admin');
            if (adminToken && token !== adminToken) { res.statusCode=401; return res.end(JSON.stringify({error:'admin token required'})); }
            const body = await readBody();
            const name = body?.name || urlObj.searchParams.get('name');
            const reset = body?.reset || urlObj.searchParams.get('reset');
            if (reset==='true' || reset===true) {
              const def = [
                { name: 'Lena M.', xp: 4820, avatar: 'LM' },
                { name: 'Jonas K.', xp: 4210, avatar: 'JK' },
                { name: 'Sophie R.', xp: 3890, avatar: 'SR' },
                { name: 'Maxim B.', xp: 3450, avatar: 'MB' },
              ];
              if (redis) await redis.set('leaderboard', JSON.stringify(def));
              else devMemoryBoard = def;
              const board = redis ? (await redis.get('leaderboard') || def) : devMemoryBoard;
              const arr = Array.isArray(board) ? board : JSON.parse(board);
              res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(arr));
            }
            if (!name) { res.statusCode=400; return res.end(JSON.stringify({error:'name required'})); }
            if (redis) {
              let board = await redis.get('leaderboard');
              if (board && typeof board === 'string') try{ board=JSON.parse(board);}catch{board=null;}
              if (!Array.isArray(board)) board = devMemoryBoard;
              const before = board.length;
              board = board.filter(b=> b.name.toLowerCase() !== String(name).toLowerCase());
              if (board.length===before) { res.statusCode=404; return res.end(JSON.stringify({error:'not found', board})); }
              await redis.set('leaderboard', JSON.stringify(board));
              res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(board));
            } else {
              const before = devMemoryBoard.length;
              devMemoryBoard = devMemoryBoard.filter(b=> b.name.toLowerCase() !== String(name).toLowerCase());
              if (devMemoryBoard.length===before) { res.statusCode=404; return res.end(JSON.stringify({error:'not found', board:devMemoryBoard})); }
              res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(devMemoryBoard));
            }
          }
          res.statusCode=405; return res.end(JSON.stringify({error:'Method not allowed'}));
        }

        // /api/auth/signup
        if (path === '/api/auth/signup' && req.method === 'POST') {
          if (!redis) { res.statusCode=500; return res.end(JSON.stringify({error:'Redis not configured'})); }
          const body = await readBody();
          const { username, email, password } = body;
          if (!username || !password) { res.statusCode=400; return res.end(JSON.stringify({error:'username and password required'})); }
          if (username.length < 3 || password.length < 4) { res.statusCode=400; return res.end(JSON.stringify({error:'username min 3, password min 4'})); }
          if (!/^[a-zA-Z0-9_\-]+$/.test(username)) { res.statusCode=400; return res.end(JSON.stringify({error:'username alphanumeric + _-'})); }
          const existing = await getUser(redis, username);
          if (existing) { res.statusCode=409; return res.end(JSON.stringify({error:'username taken'})); }
          const hash = await bcrypt.hash(password, 10);
          const isAdmin = username.toLowerCase() === ADMIN_USER;
          const user = { id: Date.now().toString(36)+Math.random().toString(36).slice(2,6), username, email: email||'', passwordHash: hash, xp:0, streak:0, totalReviews:0, level:'A1.1', isAdmin, createdAt: new Date().toISOString() };
          await saveUser(redis, user);
          let board = await redis.get('leaderboard');
          if (board && typeof board === 'string') board = JSON.parse(board);
          if (!Array.isArray(board)) board = devMemoryBoard;
          board = board.filter(b=> b.name.toLowerCase() !== username.toLowerCase());
          board.push({ name: username, xp:0, avatar: username.slice(0,2).toUpperCase() });
          board = board.sort((a,b)=> b.xp - a.xp).slice(0,50);
          await redis.set('leaderboard', JSON.stringify(board));
          const token = jwt.sign({ username, isAdmin }, JWT_SECRET, { expiresIn: '30d' });
          const { passwordHash, ...safe } = user;
          res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify({ token, user: safe }));
        }

        // /api/auth/login
        if (path === '/api/auth/login' && req.method === 'POST') {
          if (!redis) { res.statusCode=500; return res.end(JSON.stringify({error:'Redis not configured'})); }
          const body = await readBody();
          const { username, password } = body;
          if (!username || !password) { res.statusCode=400; return res.end(JSON.stringify({error:'username and password required'})); }
          const user = await getUser(redis, username);
          if (!user) { res.statusCode=401; return res.end(JSON.stringify({error:'invalid credentials'})); }
          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) { res.statusCode=401; return res.end(JSON.stringify({error:'invalid credentials'})); }
          const token = jwt.sign({ username: user.username, isAdmin: !!user.isAdmin }, JWT_SECRET, { expiresIn: '30d' });
          const { passwordHash, ...safe } = user;
          res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify({ token, user: safe }));
        }

        // /api/auth/me
        if (path === '/api/auth/me' && req.method === 'GET') {
          if (!redis) { res.statusCode=500; return res.end(JSON.stringify({error:'Redis not configured'})); }
          const auth = req.headers.authorization || '';
          const token = auth.startsWith('Bearer ') ? auth.slice(7) : urlObj.searchParams.get('token');
          if (!token) { res.statusCode=401; return res.end(JSON.stringify({error:'no token'})); }
          try {
            const payload = jwt.verify(token, JWT_SECRET);
            const user = await getUser(redis, payload.username);
            if (!user) { res.statusCode=404; return res.end(JSON.stringify({error:'user not found'})); }
            const { passwordHash, ...safe } = user;
            res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify({ user: safe }));
          } catch { res.statusCode=401; return res.end(JSON.stringify({error:'invalid token'})); }
        }

        // /api/users
        if (path === '/api/users') {
          if (!redis) { res.statusCode=500; return res.end(JSON.stringify({error:'Redis not configured'})); }
          const auth = req.headers.authorization || '';
          const token = auth.startsWith('Bearer ') ? auth.slice(7) : urlObj.searchParams.get('token');
          try {
            const payload = jwt.verify(token, JWT_SECRET);
            const caller = await getUser(redis, payload.username);
            if (!caller || !caller.isAdmin) throw new Error('admin only');
          } catch (e) { res.statusCode=403; return res.end(JSON.stringify({error: String(e.message)})); }
          if (req.method === 'GET') {
            const members = await redis.smembers('users');
            const users = [];
            for (const u of members || []) {
              const d = await redis.get(`user:${u}`);
              if (d) users.push(typeof d==='string'?JSON.parse(d):d);
            }
            const safe = users.map(({passwordHash, ...u})=>u).sort((a,b)=> b.xp - a.xp);
            res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(safe));
          }
          if (req.method === 'DELETE') {
            const body = await readBody();
            const name = body?.username || body?.name || urlObj.searchParams.get('username') || urlObj.searchParams.get('name');
            if (!name) { res.statusCode=400; return res.end(JSON.stringify({error:'username required'})); }
            const key = `user:${String(name).toLowerCase()}`;
            const exists = await redis.get(key);
            if (!exists) { res.statusCode=404; return res.end(JSON.stringify({error:'not found'})); }
            await redis.del(key);
            await redis.srem('users', String(name).toLowerCase());
            let board = await redis.get('leaderboard');
            if (board && typeof board === 'string') board = JSON.parse(board);
            if (Array.isArray(board)) {
              board = board.filter(b=> b.name.toLowerCase() !== String(name).toLowerCase());
              await redis.set('leaderboard', JSON.stringify(board));
            }
            res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify({ok:true}));
          }
          res.statusCode=405; return res.end(JSON.stringify({error:'Method not allowed'}));
        }

        // /api/progress
        if (path === '/api/progress') {
          const auth = req.headers.authorization || '';
          const token = auth.startsWith('Bearer ') ? auth.slice(7) : urlObj.searchParams.get('token');
          if (!token) { res.statusCode=401; return res.end(JSON.stringify({error:'no token'})); }
          try {
            const payload = jwt.verify(token, JWT_SECRET);
            const username = payload.username.toLowerCase();
            const key = `progress:${username}`;
            if (req.method === 'GET') {
              const data = await redis.get(key);
              const obj = data ? (typeof data==='string'?JSON.parse(data):data) : {};
              res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(obj));
            }
            if (req.method === 'POST') {
              const body = await readBody();
              if (body.progress && typeof body.progress === 'object') {
                await redis.set(key, JSON.stringify(body.progress));
                res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify({ok:true}));
              }
              if (body.id) {
                const cur = await redis.get(key);
                let obj = cur ? (typeof cur==='string'?JSON.parse(cur):cur) : {};
                obj[String(body.id)] = body;
                await redis.set(key, JSON.stringify(obj));
                res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify({ok:true}));
              }
              res.statusCode=400; return res.end(JSON.stringify({error:'progress or id required'}));
            }
          } catch (e) { res.statusCode=401; return res.end(JSON.stringify({error:'invalid token'})); }
          res.statusCode=405; return res.end(JSON.stringify({error:'Method not allowed'}));
        }

        // /api/stats
        if (path === '/api/stats') {
          const auth = req.headers.authorization || '';
          const token = auth.startsWith('Bearer ') ? auth.slice(7) : urlObj.searchParams.get('token');
          if (!token) { res.statusCode=401; return res.end(JSON.stringify({error:'no token'})); }
          try {
            const payload = jwt.verify(token, JWT_SECRET);
            const username = payload.username.toLowerCase();
            const key = `stats:${username}`;
            if (req.method === 'GET') {
              const data = await redis.get(key);
              const obj = data ? (typeof data==='string'?JSON.parse(data):data) : { xp:0, streak:0, lastStudyDate:null, totalReviews:0 };
              res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(obj));
            }
            if (req.method === 'POST') {
              const body = await readBody();
              await redis.set(key, JSON.stringify(body));
              // sync to user
              const uk = `user:${username}`;
              const u = await redis.get(uk);
              if (u) {
                const user = typeof u==='string'?JSON.parse(u):u;
                if (typeof body.xp==='number') user.xp = body.xp;
                if (typeof body.streak==='number') user.streak = body.streak;
                if (typeof body.totalReviews==='number') user.totalReviews = body.totalReviews;
                await redis.set(uk, JSON.stringify(user));
                let board = await redis.get('leaderboard');
                if (board && typeof board==='string') board = JSON.parse(board);
                if (Array.isArray(board)) {
                  const idx = board.findIndex(b=> b.name.toLowerCase()===user.username.toLowerCase());
                  if (idx>=0) board[idx].xp = user.xp; else board.push({name:user.username, xp:user.xp, avatar:user.username.slice(0,2).toUpperCase()});
                  board = board.sort((a,b)=> b.xp - a.xp).slice(0,50);
                  await redis.set('leaderboard', JSON.stringify(board));
                }
              }
              res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify({ok:true}));
            }
          } catch (e) { res.statusCode=401; return res.end(JSON.stringify({error:'invalid token'})); }
          res.statusCode=405; return res.end(JSON.stringify({error:'Method not allowed'}));
        }

        // /api/streak (authoritative streak, mirrors api/streak.js)
        if (path === '/api/streak') {
          if (!redis) { res.statusCode=500; return res.end(JSON.stringify({error:'Redis not configured'})); }
          const sAuth = req.headers.authorization || '';
          const sToken = sAuth.startsWith('Bearer ') ? sAuth.slice(7) : urlObj.searchParams.get('token');
          if (!sToken) { res.statusCode=401; return res.end(JSON.stringify({error:'no token'})); }
          let sPayload;
          try { sPayload = jwt.verify(sToken, JWT_SECRET); } catch { res.statusCode=401; return res.end(JSON.stringify({error:'invalid token'})); }
          const sUser = sPayload.username.toLowerCase();
          const sNow = Date.now();
          const sToday = utcDayKey(sNow);
          const dKey = `streak:${sUser}:days`, rKey = `streak:${sUser}:rewards`, sessKey = `streak:${sUser}:sessions`;
          const parseStreakJson = (v) => { if (v == null) return null; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return null; } };
          const loadDays = async () => {
            const raw = await redis.hgetall(dKey); const days = [];
            if (raw && typeof raw === 'object') for (const [date, value] of Object.entries(raw)) {
              if (!isStreakDayKey(date)) continue;
              const d = parseStreakJson(value);
              if (!d || (d.status !== 'completed' && d.status !== 'protected')) continue;
              days.push({ date, status: d.status, sessions: {}, sources: (d.sources && typeof d.sources === 'object') ? d.sources : {}, attempts: Number(d.attempts) || 0, xp: Number(d.xp) || 0, firstAt: d.firstAt ?? null, lastAt: d.lastAt ?? null, updatedAt: d.updatedAt ?? null });
            }
            return days;
          };
          const loadRewards = async () => {
            const raw = await redis.hgetall(rKey); const out = [];
            if (raw && typeof raw === 'object') for (const [id, value] of Object.entries(raw)) {
              if (!/^milestone-\d+$/.test(id)) continue;
              const r = parseStreakJson(value);
              if (!r) continue;
              out.push({ id, milestone: Number(r.milestone) || Number(id.split('-')[1]), freezes: Number(r.freezes) || 0, createdAt: r.createdAt || 0 });
            }
            return out;
          };
          if (req.method === 'GET') {
            const start = urlObj.searchParams.get('start'), end = urlObj.searchParams.get('end');
            const days = await loadDays(); const rewards = await loadRewards();
            const earned = rewards.reduce((a,r)=> a + (Number(r.freezes)||0), 0);
            const consumed = days.filter((d)=> d.status==='protected').length;
            const summary = summarizeStreak({ days, earnedFreezes: earned, consumedFreezes: consumed, today: sToday });
            const visible = (start && end ? days.filter((d)=> d.date>=start && d.date<=end) : days).sort((a,b)=> (a.date<b.date?-1:1));
            res.setHeader('Content-Type','application/json'); res.statusCode=200;
            return res.end(JSON.stringify({ ok:true, summary, days:visible, rewards:rewards.sort((a,b)=> a.milestone-b.milestone) }));
          }
          if (req.method === 'POST') {
            const body = await readBody();
            const activities = Array.isArray(body.activities) ? body.activities.slice(0, 200) : [];
            if (!activities.length) { res.statusCode=400; return res.end(JSON.stringify({error:'activities required'})); }
            let valid = [];
            try { valid = normalizeStreakAttempts(activities, sNow); } catch { res.statusCode=400; return res.end(JSON.stringify({error:'invalid activities'})); }
            if (!valid.length) { res.statusCode=400; return res.end(JSON.stringify({error:'no qualifying activity'})); }
            const days = await loadDays(); const rewards = await loadRewards();
            let seen = await redis.smembers(sessKey); if (!Array.isArray(seen)) seen = [];
            const seenSet = new Set(seen);
            const fresh = valid.filter((a)=> !seenSet.has(a.sessionId));
            const earned = rewards.reduce((a,r)=> a + (Number(r.freezes)||0), 0);
            const consumed = days.filter((d)=> d.status==='protected').length;
            const applied = applyStreakActivities({ days, claimedMilestones: rewards.map((r)=> r.id), earnedFreezes: earned, consumedFreezes: consumed, activities: fresh, today: sToday, now: sNow });
            for (const d of applied.days) await redis.hset(dKey, { [d.date]: JSON.stringify({ status: d.status, sources: d.sources || {}, attempts: d.attempts || 0, xp: d.xp || 0, firstAt: d.firstAt ?? null, lastAt: d.lastAt ?? null, updatedAt: d.updatedAt ?? null }) });
            for (const m of applied.events.awardedMilestones) { try { await redis.hsetnx(rKey, m.id, JSON.stringify({ milestone: m.milestone, freezes: m.freezes, createdAt: sNow })); } catch {} }
            const newSess = [...new Set(fresh.map((a)=> a.sessionId))];
            if (newSess.length) await redis.sadd(sessKey, newSess[0], ...newSess.slice(1));
            try {
              const skey = `stats:${sUser}`;
              const rawStats = await redis.get(skey);
              const stats = parseStreakJson(rawStats) || { xp:0, streak:0, lastStudyDate:null, totalReviews:0 };
              const completed = applied.days.filter((d)=> d.status==='completed').map((d)=> d.date).sort();
              const latest = completed.length ? completed[completed.length-1] : null;
              if (latest && (!stats.lastStudyDate || latest > stats.lastStudyDate)) stats.lastStudyDate = latest;
              stats.streak = applied.summary.current;
              stats.longestStreak = Math.max(stats.longestStreak || 0, applied.summary.longest);
              await redis.set(skey, JSON.stringify(stats));
            } catch {}
            res.setHeader('Content-Type','application/json'); res.statusCode=200;
            return res.end(JSON.stringify({ ok:true, summary: applied.summary, days: applied.days, rewards: applied.claimedMilestones.map((id)=> { const known = rewards.find((r)=> r.id===id); const found = applied.events.awardedMilestones.find((m)=> m.id===id); return { id, milestone: known ? known.milestone : Number(id.split('-')[1]), freezes: known ? known.freezes : (found ? found.freezes : 0), createdAt: known ? known.createdAt : sNow }; }), events: applied.events }));
          }
          res.statusCode=405; return res.end(JSON.stringify({error:'Method not allowed'}));
        }

        return next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    changelogPlugin(),
    devApiPlugin(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'GermanSplash - Menschen Flashcards',
        short_name: 'GermanSplash',
        description: 'Premium German Flashcard PWA - 1000+ Menschen vocab with SRS, offline-first',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,svg,png,woff,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          { urlPattern: /^\/api\/.*/i, handler: 'NetworkOnly' },
          { urlPattern: /\/changelog\.json$/i, handler: 'NetworkFirst', options: { cacheName: 'changelog-cache', networkTimeoutSeconds: 4, expiration: { maxEntries: 3, maxAgeSeconds: 60*60 } } },
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60*60*24*365 } } },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
