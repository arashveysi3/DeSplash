import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Dev-only in-memory fallback for /api/leaderboard so `npm run dev` works without Vercel
let devMemoryBoard = [
  { name: 'Lena M.', xp: 4820, avatar: 'LM' },
  { name: 'Jonas K.', xp: 4210, avatar: 'JK' },
  { name: 'Sophie R.', xp: 3890, avatar: 'SR' },
  { name: 'Maxim B.', xp: 3450, avatar: 'MB' },
];
function devApiPlugin() {
  return {
    name: 'dev-api-leaderboard',
    configureServer(server) {
      // Load .env (supports KV_* and UPSTASH_* from Upstash dashboard)
      const env = loadEnv(server.config.mode, process.cwd(), '');
      const getEnv = (k) => process.env[k] || env[k] || env[`VITE_${k}`];
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/leaderboard')) return next();
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') { res.statusCode = 200; return res.end(); }
        const url = getEnv('KV_REST_API_URL') || getEnv('UPSTASH_REDIS_REST_URL');
        const token = getEnv('KV_REST_API_TOKEN') || getEnv('UPSTASH_REDIS_REST_TOKEN');
        const useUpstash = !!(url && token);
        const kvGet = async (key) => {
          if (!useUpstash) return null;
          try {
            const r = await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` } });
            const j = await r.json();
            return j.result ? JSON.parse(j.result) : null;
          } catch { return null; }
        };
        const kvSet = async (key, val) => {
          if (!useUpstash) return;
          try { await fetch(`${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(val))}`, { headers: { Authorization: `Bearer ${token}` } }); } catch {}
        };
        if (req.method === 'GET') {
          try {
            if (useUpstash) {
              const data = await kvGet('leaderboard');
              if (data) { res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(data)); }
            }
          } catch {}
          res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(devMemoryBoard));
        }
        if (req.method === 'POST') {
          let body=''; for await (const c of req) body+=c;
          try {
            const { name, xp } = JSON.parse(body||'{}');
            if (!name || typeof xp !== 'number') { res.statusCode=400; return res.end(JSON.stringify({error:'name and xp required'})); }
            const entry = { name: String(name).slice(0,24), xp: Math.max(0, Math.floor(xp)), avatar: String(name).slice(0,2).toUpperCase() };
            if (useUpstash) {
              let board = (await kvGet('leaderboard')) || devMemoryBoard;
              const idx = board.findIndex(b=> b.name.toLowerCase()===entry.name.toLowerCase());
              if (idx>=0) { if(entry.xp>board[idx].xp) board[idx]=entry; } else board.push(entry);
              board = board.sort((a,b)=> b.xp - a.xp).slice(0,50);
              await kvSet('leaderboard', board);
              res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(board));
            } else {
              const idx = devMemoryBoard.findIndex(b=> b.name.toLowerCase()===entry.name.toLowerCase());
              if (idx>=0) { if(entry.xp>devMemoryBoard[idx].xp) devMemoryBoard[idx]=entry; } else devMemoryBoard.push(entry);
              devMemoryBoard = devMemoryBoard.sort((a,b)=> b.xp - a.xp).slice(0,50);
              res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(devMemoryBoard));
            }
          } catch(e){ res.statusCode=500; return res.end(JSON.stringify({error:String(e)})); }
        }
        res.statusCode=405; return res.end(JSON.stringify({error:'Method not allowed'}));
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    devApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
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
        globPatterns: ['**/*.{js,css,html,json,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60*60*24*365 } },
          },
        ],
      },
    }),
  ],
})
