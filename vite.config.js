import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { Redis } from '@upstash/redis'

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
      const env = loadEnv(server.config.mode, process.cwd(), '');
      const getEnv = (k) => process.env[k] || env[k] || env[`VITE_${k}`];
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/leaderboard')) return next();
        console.log('[dev-api] hit', req.method, req.url);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') { res.statusCode = 200; return res.end(); }

        // Use @upstash/redis as per docs: Redis.fromEnv() or explicit url/token
        let redis = null;
        try {
          const url = getEnv('UPSTASH_REDIS_REST_URL') || getEnv('KV_REST_API_URL');
          const token = getEnv('UPSTASH_REDIS_REST_TOKEN') || getEnv('KV_REST_API_TOKEN');
          if (url && token) redis = new Redis({ url, token });
          else { try { redis = Redis.fromEnv(); } catch { redis = null; } }
          // quick ping to ensure env is valid
          if (redis && (!url || !token)) { try { await redis.ping(); } catch { redis = null; } }
        } catch { redis = null; }

        if (req.method === 'GET') {
          console.log('[dev-api] GET /api/leaderboard redis?', !!redis);
          try {
            if (redis) {
              const data = await redis.get('leaderboard');
              console.log('[dev-api] redis GET', data ? `${JSON.stringify(data).length} chars` : 'null');
              if (data) {
                const arr = Array.isArray(data) ? data : JSON.parse(data);
                res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(arr));
              }
            }
          } catch (e) { console.error('dev redis GET', e); }
          console.log('[dev-api] fallback memoryBoard', devMemoryBoard.length);
          res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(devMemoryBoard));
        }
        if (req.method === 'POST') {
          let body=''; for await (const c of req) body+=c;
          try {
            const { name, xp } = JSON.parse(body||'{}');
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
              res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(board));
            } else {
              const idx = devMemoryBoard.findIndex(b=> b.name.toLowerCase()===entry.name.toLowerCase());
              if (idx>=0) { if(entry.xp>devMemoryBoard[idx].xp) devMemoryBoard[idx]=entry; } else devMemoryBoard.push(entry);
              devMemoryBoard = devMemoryBoard.sort((a,b)=> b.xp - a.xp).slice(0,50);
              res.setHeader('Content-Type','application/json'); res.statusCode=200; return res.end(JSON.stringify(devMemoryBoard));
            }
          } catch(e){ console.error(e); res.statusCode=500; return res.end(JSON.stringify({error:String(e)})); }
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
        // Never cache leaderboard API
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkOnly',
          },
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
