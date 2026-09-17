# GermanSplash 🇩🇪✨

> **Learn German the splashy way — 885+ Menschen words, SRS-powered, offline-first & genuinely fun.**

Hey there! I'm **Arash Veisi** — I built GermanSplash because I wanted a beautiful, fast way to master German vocabulary from the *Menschen A1* books (A1.1 + A1.2). No boring spreadsheets, no paywalls — just cards that stick, quizzes that challenge, and a little splash of joy every time you answer correctly.

It works fully offline as a PWA (install it to your iPhone/Android like a native app) and syncs your progress to the cloud when you're logged in. Add to home screen, open it on the train, and keep your streak alive 🔥

---

### ✨ What makes it special

- 📚 **Menschen-faithful** — 885 words from *Menschen A1.1 (Lektion 1–12) & A1.2 (Lektion 13–24)*, with German + English + فارسی (Persian), article, plural, example sentence, book & Lektion filters.
- 🧠 **SM-2 spaced repetition** — cards reappear exactly when you're about to forget them. Weak words go to the Mistake Bank automatically.
- 📦 **Pack Study** — study in focused packs (10/20/50) — we batch-save at the end so there's no lag mid-session. Swipe → Known / ← Again, or use Again/Hard/Good/Easy (now thoughtfully rebalanced!).
- 🎮 **Quizzes & Games that actually matter**
  - **Dictation** — hear German, type it exactly (ä ö ü ß matters!) — `+12 XP`
  - **Artikel** — der/die/das — `+8 XP`
  - **DE → فارسی** — type the Persian meaning — `+12 XP`
  - **4-Choice** ✨ *NEW* — pick the right English from 4 distractors from the *same* Lektion — `+10 XP` (hard to cheese!)
  - **🧩 Match Dash** — flip 12 tiles, match DE ↔ EN pairs — `+4` per pair + up to `+16` perfect bonus
  - **⚡ Lightning Sprint** — 45 seconds, rapid 4-choice, streak multiplier up to `2×` — `+6` base per correct
- 📈 **Progress you can feel** — per-Lektion & per-book mastery (seen vs mastered ★), streaks, total reviews, and a beautiful rank board.
- 🔐 **Accounts & Cloud Sync** — sign up / login, progress & stats sync via `/api/*` + Upstash Redis. Works offline via Dexie (IndexedDB) and merges on login.
- 🔍 **Suche, Weak Board & Leaderboard** — search in DE/EN/FA, practice weak words, and see where you stand (local or online).
- ➕ **Add your own cards** — custom words land in your selected book/Lektion and stay yours.
- 📲 **Stunning Update Experience** — installed PWAs don't auto-refresh: GermanSplash now detects a new live version, shows a shimmering update dialog with progress bar, and reloads in ~3s while keeping all your XP & streak safe. It also checks on app open, when you return to the tab, and every hour. You can tap ↻ in the header to check manually at any time.

> **XP Economy (rebalanced in this release):** Swiping a card now gives only `+1` (Again) / `+2` (Hard) / `+3` (Good) / `+5` (Easy). Real learning — quizzes & games — pays **3–4× more**. No more farming XP by blindly swiping!

---

### 🚀 Quick start

```bash
git clone https://github.com/<your-username>/GermanSplash.git
cd GermanSplash
npm install
npm run dev      # opens at http://localhost:5173
npm run build    # production build to dist/
npm run preview  # preview the build
```

**Env vars** (for cloud sync / auth / leaderboard — optional for local dev, falls back to in-memory):

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
JWT_SECRET=           # or ADMIN_TOKEN for fallback
ADMIN_USERNAME=admin
ADMIN_TOKEN=          # for leaderboard admin actions
```

Without Redis, everything still works locally (Dexie + in-memory board) — perfect for hacking or offline study.

---

### 📲 Install as an app (PWA / IPA)

1. Open the deployed URL (Vercel) on your iPhone/Android.
2. **iOS Safari:** Share → *Add to Home Screen* → Open — it runs standalone, full-screen, offline-ready.
3. **Android Chrome:** Install banner or Menu → *Install app*.

When I ship a new version, you'll see a **✨ New version available** sheet with a shining progress bar — tap **Update now →** and you're on the latest in seconds. No data loss.

---

### 🗂️ Project structure

```
src/
  App.jsx            # all screens: Bücher, Lernen, Quiz/Games, Suche, Weak, Board, Profile
  components/
    PWAUpdater.jsx   # stunning update dialog + progress + hourly/visibility checks
  db.js              # Dexie (IndexedDB) + initialization & Menschen seeding
  srs.js             # SM-2 + XP_MAP / QUIZ_XP / GAME_XP (balanced economy)
  auth.js            # signup/login/progress/stats helpers
  data/menschen.js   # BOOKS, LEKTION_LIST, ALL_MENSCHEN_WORDS (885)
  theme.js           # BaseWeb theme + gender colors
  main.jsx
public/
  icon-192.png / icon-512.png / favicon.svg
api/                 # Vercel serverless (leaderboard, auth, progress, stats)
menschen_a1_1_vocabulary.json / menschen_a1_2_vocabulary.json
vite.config.js       # vite-plugin-pwa (registerType: 'prompt') + dev API fallback
```

---

### 🎨 Tech stack

React 19 · Vite 8 · BaseWeb + Styletron · Dexie · vite-plugin-pwa (Workbox) · Upstash Redis · Vercel

---

### 🤝 Contributing — you're so welcome!

This is a public repo by **Arash Veisi** and I'd *love* your help to make it even better — whether it's fixing a typo in the Menschen JSON, polishing the UI, adding audio, or dreaming up the next game.

**Ways to contribute:**

- ⭐ Star the repo — it means a lot!
- 🐛 Open an issue — bug, idea, or even “I wish it had ___”
- 🔀 Open a PR — small is beautiful; no PR is too tiny
  1. Fork → `git checkout -b feat/your-idea`
  2. `npm install && npm run dev` — make sure it runs
  3. `npm run build` — must pass
  4. Commit with a clear message, push, and open a PR

**Ground rules (warm & simple):** Be kind, be curious, keep it accessible. I review every PR personally and try to respond within a day or two. New contributors are celebrated here — first PR? I'll shout you out in the changelog!

**Good first issues:** Add TTS voices, improve Persian typography, add Lektion audio, write a better onboarding, or help split the big bundle!

---

### 🛣️ Roadmap

- [ ] Lektion audio packs (real Menschen CD audio mapping)
- [ ] Sentence scramble game (word order)
- [ ] Shareable streak cards
- [ ] Export / import progress
- [ ] Dark mode

Got an idea? Open an issue — let's splash it together 💦

---

### 📄 License

MIT — free to use, remix, and learn from. If you build something cool with it, let me know!

---

<p align="center">
  Made with ❤️ by <b>Arash Veisi</b> — happy learning! <br/>
  <i>GermanSplash • Menschen Flashcards • A1.1 + A1.2</i>
</p>
