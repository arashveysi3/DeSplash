// Vercel Serverless - Online Leaderboard (Vercel Free + Upstash Redis)
// Docs: npm install @upstash/redis  +  Redis.fromEnv()
// Env vars set by Vercel Upstash integration:
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
//   (also supports legacy KV_REST_API_URL / KV_REST_API_TOKEN)
// Works locally if you add those vars to .env / .env.local and restart `npm run dev`

import { Redis } from "@upstash/redis";

let memoryBoard = [
  { name: "Lena M.", xp: 4820, avatar: "LM" },
  { name: "Jonas K.", xp: 4210, avatar: "JK" },
  { name: "Sophie R.", xp: 3890, avatar: "SR" },
  { name: "Maxim B.", xp: 3450, avatar: "MB" },
];

function getRedis() {
  console.log("Initializing Redis client...");
  try {
    const url =
      process.env.KV_REST_API_URL ||
      process.env.UPSTASH_REDIS_REST_URL ||
      process.env.UPSTASH_REDIS_REST_URL;
    console.log("Redis URL:", url ? url.slice(0, 20) + "..." : "not set");
    const token =
      process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      // Try fromEnv() which auto-reads UPSTASH_ vars
      try {
        return Redis.fromEnv();
      } catch {
        return null;
      }
    }
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Simple admin check: if ADMIN_TOKEN env is set, require it for DELETE
  const adminToken = process.env.ADMIN_TOKEN || process.env.LEADERBOARD_ADMIN_TOKEN;

  let redis = null;
  try {
    redis = getRedis();
  } catch {
    redis = null;
  }

  if (req.method === "GET") {
    try {
      if (redis) {
        const data = await redis.get("leaderboard");
        if (data) {
          const arr = Array.isArray(data) ? data : JSON.parse(data);
          return res.status(200).json(arr);
        }
      }
    } catch (e) {
      console.error("redis GET error", e);
    }
    return res.status(200).json(memoryBoard);
  }

  if (req.method === "POST") {
    try {
      let body = req.body;
      if (!body || typeof body === "string") {
        try {
          body = JSON.parse(body || "{}");
        } catch {
          body = {};
        }
      }
      const { name, xp } = body || {};
      if (!name || typeof xp !== "number")
        return res.status(400).json({ error: "name and xp required" });
      const entry = {
        name: String(name).slice(0, 24),
        xp: Math.max(0, Math.floor(xp)),
        avatar: String(name).slice(0, 2).toUpperCase(),
      };
      if (redis) {
        let board = (await redis.get("leaderboard")) || memoryBoard;
        if (typeof board === "string")
          try {
            board = JSON.parse(board);
          } catch {
            board = memoryBoard;
          }
        if (!Array.isArray(board)) board = memoryBoard;
        const idx = board.findIndex(
          (b) => b.name.toLowerCase() === entry.name.toLowerCase(),
        );
        if (idx >= 0) {
          if (entry.xp > board[idx].xp) board[idx] = entry;
        } else board.push(entry);
        board = board.sort((a, b) => b.xp - a.xp).slice(0, 50);
        await redis.set("leaderboard", JSON.stringify(board));
        // also sync to user record if exists
        try {
          const uk = `user:${entry.name.toLowerCase()}`;
          const u = await redis.get(uk);
          if (u) {
            const user = typeof u === 'string' ? JSON.parse(u) : u;
            if (entry.xp > (user.xp || 0)) {
              user.xp = entry.xp;
              await redis.set(uk, JSON.stringify(user));
            }
          }
        } catch {}
        return res.status(200).json(board);
      } else {
        const idx = memoryBoard.findIndex(
          (b) => b.name.toLowerCase() === entry.name.toLowerCase(),
        );
        if (idx >= 0) {
          if (entry.xp > memoryBoard[idx].xp) memoryBoard[idx] = entry;
        } else memoryBoard.push(entry);
        memoryBoard = memoryBoard.sort((a, b) => b.xp - a.xp).slice(0, 50);
        return res.status(200).json(memoryBoard);
      }
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: String(e) });
    }
  }

  if (req.method === "DELETE") {
    try {
      const token = req.headers["x-admin-token"] || req.query?.adminToken || req.headers["x-admin-token".toLowerCase()];
      if (adminToken && token !== adminToken) return res.status(401).json({ error: "admin token required" });
      let body = req.body;
      if (!body || typeof body === "string") {
        try { body = JSON.parse(body || "{}"); } catch { body = {}; }
      }
      const name = body?.name || req.query?.name || (req.url && new URL(req.url, "http://localhost").searchParams.get("name"));
      const reset = body?.reset || req.query?.reset || (req.url && new URL(req.url, "http://localhost").searchParams.get("reset"));
      if (redis) {
        if (reset === "true" || reset === true) {
          await redis.set("leaderboard", JSON.stringify(memoryBoard));
          return res.status(200).json(memoryBoard);
        }
        if (!name) return res.status(400).json({ error: "name required or reset=true" });
        let board = (await redis.get("leaderboard")) || memoryBoard;
        if (typeof board === "string") try { board = JSON.parse(board); } catch { board = memoryBoard; }
        if (!Array.isArray(board)) board = memoryBoard;
        const before = board.length;
        board = board.filter((b) => b.name.toLowerCase() !== String(name).toLowerCase());
        if (board.length === before) return res.status(404).json({ error: "not found", board });
        await redis.set("leaderboard", JSON.stringify(board));
        return res.status(200).json(board);
      } else {
        if (reset === "true" || reset === true) {
          // reset handled by returning default
          return res.status(200).json(memoryBoard);
        }
        if (!name) return res.status(400).json({ error: "name required" });
        const before = memoryBoard.length;
        memoryBoard = memoryBoard.filter((b) => b.name.toLowerCase() !== String(name).toLowerCase());
        if (memoryBoard.length === before) return res.status(404).json({ error: "not found", board: memoryBoard });
        return res.status(200).json(memoryBoard);
      }
    } catch (e) { console.error(e); return res.status(500).json({ error: String(e) }); }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
