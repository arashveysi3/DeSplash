# GermanSplash 🇩🇪

Learn German vocab from the *Menschen A1* course books, with spaced repetition and a handful of quiz modes that actually make you retrieve the word instead of just recognizing it.

I'm Arash Veisi, and I built this because I was working through Menschen A1.1/A1.2 myself and got tired of copying words into spreadsheets. So now there's an app that already has all 885 words in it, quizzes you the way flashcards should, and tells you when you're about to forget something before you actually forget it.

It's a PWA, so it installs on your phone and works offline. If you're logged in it'll sync your progress to the cloud too, but you don't need an account to use it.

---

### What's in it

- **All the Menschen A1 vocab** — 885 words across A1.1 (Lektion 1–12) and A1.2 (Lektion 13–24), each with German, English, and Persian translations, plus article, plural form, and an example sentence. You can filter by book or Lektion.
- **Spaced repetition (SM-2)** — cards come back right around when you're likely to forget them. Anything you keep missing gets pulled into a Mistake Bank automatically.
- **Pack-based study** — pick a pack of 10, 20, or 50 cards and go. Progress saves once at the end of the pack rather than after every card, so it doesn't lag. Swipe left/right for Again/Known, or use the four-button Again/Hard/Good/Easy rating if you want finer control.
- **Quizzes and a couple of games:**
  - Dictation — you hear the word, type it back, umlauts and ß included (+12 XP)
  - Artikel — der/die/das practice (+8 XP)
  - German → Persian typing (+12 XP)
  - 4-Choice — pick the right English translation out of four options pulled from the same Lektion, so you can't just pattern-match (+10 XP)
  - Match Dash — a 12-tile memory-match game, DE↔EN pairs (+4/pair, up to +16 for a clean run)
  - Lightning Sprint — 45 seconds of rapid-fire 4-choice questions with a streak multiplier up to 2× (+6 base per correct answer)
- **Progress tracking** — mastery per Lektion and per book, streaks, total review count, and a leaderboard if you're into that.
- **Accounts and sync** — optional login, backed by Upstash Redis on the server side. Everything's stored locally first (Dexie/IndexedDB) and merges with your account once you log in, so it works fine offline.
- **Search + weak-word review** — search across all three languages, and there's a dedicated view for words you keep getting wrong.
- **Add your own words** — drop custom cards into whatever book/Lektion you want.
- **Update handling for the installed app** — PWAs are annoying about updates since they don't auto-refresh. This one checks for a new version on open, when you switch back to the tab, and every hour, and shows a small dialog when one's ready so you can update without losing your streak or XP. There's also a manual refresh button in the header if you don't want to wait.

One thing worth calling out: the XP economy got rebalanced in this release. Swiping cards now only gives +1 to +5 XP depending on rating, and quizzes/games pay 3–4x more than that. Earlier versions let you rack up XP just by swiping through cards without really engaging, which defeated the point.

---

### Running it locally

```bash
git clone https://github.com/<your-username>/GermanSplash.git
cd GermanSplash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
npm run preview  # preview the build
```

Cloud sync, auth, and the leaderboard need a few env vars, but none of this is required for local dev — without them it just falls back to local storage and an in-memory leaderboard.

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
JWT_SECRET=           # or ADMIN_TOKEN as a fallback
ADMIN_USERNAME=admin
ADMIN_TOKEN=          # needed for leaderboard admin actions
```

---

### Installing it on your phone

1. Open the deployed site (it's on Vercel) in your phone's browser.
2. **iOS Safari:** Share → Add to Home Screen. It'll run full-screen like a native app after that.
3. **Android Chrome:** you should get an install prompt, or you can find it under the menu as "Install app."

When there's a new version, you'll see a small "update available" prompt — tap it and you're on the latest version in a few seconds, no data lost.

---

### Project layout

```
src/
  App.jsx            # all screens: Bücher, Lernen, Quiz/Games, Suche, Weak, Board, Profile
  components/
    PWAUpdater.jsx   # handles the update dialog + hourly/visibility checks
  db.js              # Dexie (IndexedDB) setup + Menschen data seeding
  srs.js             # SM-2 logic + XP values for swipes/quizzes/games
  auth.js            # signup/login/progress/stats helpers
  data/menschen.js   # BOOKS, LEKTION_LIST, ALL_MENSCHEN_WORDS (885 total)
  theme.js           # BaseWeb theme + colors for der/die/das
  main.jsx
public/
  icon-192.png / icon-512.png / favicon.svg
api/                 # Vercel serverless functions (leaderboard, auth, progress, stats)
menschen_a1_1_vocabulary.json / menschen_a1_2_vocabulary.json
vite.config.js       # vite-plugin-pwa config + dev API fallback
```

---

### Stack

React 19, Vite 8, BaseWeb + Styletron, Dexie, vite-plugin-pwa (Workbox), Upstash Redis, deployed on Vercel.

---

### Contributing

It's a small solo project so far, but I'd genuinely like help with it. Typo fixes in the vocab JSON, UI tweaks, new games, whatever — small PRs are welcome and I try to look at them within a day or two.

If you want to open one:

1. Fork the repo, branch off as `feat/your-idea`
2. `npm install && npm run dev` and confirm it runs
3. `npm run build` should pass before you push
4. Open the PR with a description of what changed and why

If you're not sure whether something's worth a PR, open an issue first and we can talk it through. First-time contributors are welcome — you don't need to know the codebase inside out to fix a typo or suggest something.

Some things I know need work if you're looking for ideas: TTS audio for the words, better Persian font rendering, splitting up the JS bundle (it's gotten a bit big), and the onboarding flow could use some love.

---

### Roadmap

- [ ] Audio for each Lektion (mapped to the actual Menschen CD audio)
- [ ] A sentence-scramble game for word order
- [ ] Shareable streak cards
- [ ] Export/import for your progress
- [ ] Dark mode

If there's something you want that's not here, open an issue.

---

### License

MIT. Use it, fork it, learn from it — if you build something with it I'd like to hear about it.

---

<p align="center">
  Built by <b>Arash Veisi</b><br/>
  GermanSplash — Menschen Flashcards, A1.1 + A1.2
</p>
