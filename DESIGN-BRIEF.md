# GermanSplash — Design Brief

**For:** the redesign lead
**Product:** GermanSplash — a PWA vocabulary trainer for learners working through the *Menschen* German course (A1.1, A1.2, and now A2.1).
**Scope of this document:** what the app contains, every screen/part you need to design, how the app actually works, and the vibe/personality the redesign should carry.

> **Note on the design system:** none of the current styling is a constraint. The app is built on BaseWeb + Styletron with an ad-hoc theme; you have full freedom to define a new visual language, typography, color system, and component library. What must be preserved is **functionality, flows, and content** — not pixels.

---

## 1. What the product is

GermanSplash is a flashcard + quiz + exam-prep app for Persian-speaking learners of German. It ships with the full vocabulary of the *Menschen* course books pre-loaded — roughly **2,300 words across three books** (A1.1 Lektion 1–12, A1.2 Lektion 13–24, A2.1 Lektion 1–12) — and every word carries **three languages: German, English, and Persian (فارسی)**, plus grammatical article, plural, part of speech, an example sentence, and its Lektion.

It is:
- **Mobile-first**, installed as a PWA (Add to Home Screen / Install App), running full-screen with no browser chrome.
- **Offline-first.** Everything lives in IndexedDB on the device. Login is optional; when logged in, progress syncs to the cloud.
- **Trilingual by nature.** German is the study target, English is the bridge language, Persian is the learner's native language and appears everywhere — in translations, in the streak calendar (Jalali dates, RTL), and in motivational copy.

The core loop: **pick a scope → study/quiz it → earn XP → keep the streak alive → come back tomorrow.**

---

## 2. Who it's for

A Persian-speaking adult self-studying German toward the A1 certificate, using the *Menschen* textbook. They use the app in short daily sessions (5–20 minutes) on their phone, motivated by streaks, XP, and a leaderboard. They are serious about passing an exam but respond to playful, game-like feedback. The interface must feel equally credible as a study tool and as a game.

### 2.1 The framework & what it means for your design

The app is a **React 19 single-page application built with Vite**, deployed on **Vercel**. No design framework is baked in that you must design around — but here's what the implementation looks like so your deliverables land well:

- **UI library:** [BaseWeb (baseweb.design)](https://baseweb.design) + **Styletron** (CSS-in-JS). Today's components — buttons, modals, tabs, selects, toasts — come from BaseWeb, styled with a small custom theme. *Your redesign can keep, replace, or restyle this library; if you propose a different component set (or pure custom components), just say so — the note at the top of this document applies: the current design system is not a constraint.*
- **Extra custom styling:** a hand-written global stylesheet with a `gs-` prefixed class system for all the animations (tab indicator, choice tiles, calendar tiers, celebrations, bottom sheet) — these are the motion behaviors described throughout this brief and should be redesigned, not assumed.
- **Routing:** none — navigation is a state-driven tab strip (see §3.3), so every "page" you design mounts inside one shell. Your IA proposal can assume we can render anything anywhere (drawers, bottom sheets, nested screens are all feasible).
- **Icons:** currently **Lucide** (no emoji). If you prefer another icon set or custom icons, that's your call.
- **Fonts:** loaded via Google Fonts + a local Persian font file (`IRANSans`) — so **your typography must ship as web fonts for Latin and Arabic/Persian scripts**, with the Persian font applied automatically via `unicode-range`.
- **Storage:** all progress lives client-side in **IndexedDB (Dexie)**; the cloud backend (auth, progress sync, leaderboard) is Vercel serverless functions + Upstash Redis. Nothing on the backend constrains the design.
- **PWA:** built with `vite-plugin-pwa` (Workbox) — the app is installed to the home screen, runs offline, and has custom update/offline UI (§3.4). Assume **no browser chrome, ~360px-wide phones first, safe-area insets, and no hover-only interactions**.
- **Audio:** all sound effects are synthesized in code (WebAudio) — no audio files; speech uses the browser's German TTS and Speech Recognition. Any UI affordances for sound (the header toggle, listen buttons, pronunciation feedback) need designing.

In short: think of this as **a React SPA where your design becomes the source of truth** — the more explicit your component/state specs, the cleaner the rebuild.

---

## 3. Global shell — the frame you design once

### 3.1 Splash screen
The app's first impression. Currently: floating flashcard animation (an "A" and an "Ä" card), the wordmark **GermanSplash** (with "Splash" accented), tagline **"Dein Deutsch-Moment beginnt"**, a loading bar, and an editorial serif caption **"Wörter, die bleiben."** First-time visitors get a **"Los geht's"** continue button; returning visitors auto-dismiss after ~2.6s. It also doubles as the data-loading screen. *This screen sets the brand tone — treat it as the identity moment of the redesign.*

### 3.2 Header (sticky, always visible)
Contains, left to right:
- Logo tile + wordmark + a gradient **PRO** badge + a subtitle line: `MENSCHEN A1.1 + A1.2 • {N} • DE ↔ EN+FA`
- **Login pill** (logged out) or **avatar + username + dropdown** (logged in) with menu items: Profile / Add card / Logout
- **Settings button** → menu: Sounds on/off, Check for update
- **Streak chip** (flame + current streak)
- **XP chip** (black pill, zap + total XP)

It's a glassmorphic bar with blur, and it already struggles for space on small phones (actions scroll horizontally). *Redesign opportunity: the header currently carries too much; decide what belongs here vs. elsewhere.*

### 3.3 Navigation (currently a top tab strip)
There is no router and no bottom nav — a horizontally scrollable **underline tab strip** under the header, with an animated black indicator. Tabs:

| # | Tab | What it holds |
|---|-----|---------------|
| 0 | **Bücher** | Book picker, Lektion browser, scope selection, book analytics |
| 1 | **Lernen** | Flashcard study (packs of 10/20/50) |
| 2 | **Quiz** | 6 quiz modes + 4 games + quiz reports |
| 3 | **Prüfung** | Full mock exams + single-section training |
| 4 | **Streak** | Streak calendar, tiers, freezes, celebrations |
| 5 | **Suche** | Trilingual search over all words |
| 6 | **Weak (N)** | Mistake Bank — words you keep getting wrong |
| 7 | **Board** | Leaderboard (local/online) |
| 8 | **Profile** | Account, progress, stats |
| 9 | **Admin** | (only for the admin account) user management |

**Nine-to-ten tabs in a scrolling top strip is the app's biggest IA problem.** On a phone the user must scroll to see all of them, tab labels are mixed German/English, and the Weak tab shows a live count. How you regroup, hide, or restructure these (bottom nav? sections? a "Study" hub?) is one of the key design decisions you own.

### 3.4 Global overlays
- **Toast** — black pill notifications ("Pack saved +23 XP", "Synced", "Freeze used — streak protected")
- **Auth modal** — login/signup (username, optional email, password)
- **Add-card modal** — create a custom word (German/English/Persian, article, plural, example) saved into a chosen book/Lektion
- **PWA update dialog** — "New version available ✨" with an embedded changelog panel, "Update now →" / "Later"
- **Full-screen updating state** — brand mark, gradient progress bar, "Your progress stays safe"
- **Offline toast** — "Ready for offline use"
- **Celebrations** — milestone overlay and full-screen tier-unlock celebrations (see §7)

---

## 4. Screen-by-screen inventory

### 4.1 Bücher (Book library) — *the home / entry point*
Two views:

**Book list —** heading **"Wähle dein Buch"**. One large gradient card per book (A1.1 = indigo/violet, A1.2 = orange/amber, A2.1 = green/emerald), each showing publisher/ISBN, word count, a mastery percentage with seen/mastered counts, and a mastery bar. Buttons: **"Whole book — Study"** and **"Lektionen →"**. A **"Current scope"** card summarizes the active selection with **"Go to Study →"** and **"Quiz this scope"**.

**Book detail —** back button, banner with **"Study whole book" / "Study N selected →" / "Select all" / "Clear"**, then a responsive grid of **Lektion cards**: Lektion number, title, theme, mastery % + bar, words/mastered counts, status (Studied / In progress / Not started), and per-card actions **+ Add (multi-select) / Study / Quiz / 🔊 listen**. Embedded here is the **Book Analytics report** (see §4.9).

### 4.2 Lernen (Study) — *the core flashcard loop*
- **Scope bar:** current book + Lektionen, word count, weak count, book/Lektion pickers, pack size selector (10/20/50), **"Change →"** back to Bücher, **"New pack"**, due count.
- **Empty state:** "Ready for a pack?" + **"Start N-word pack"** + gender legend (der = blue, die = red, das = green).
- **Active pack:** progress bar, "Pack 3/10 • 4 answered", and the **FlashCard** — the app's most important component:
  - Front: German word (adaptive font sizing down to full sentences), article/gender, plural tag, lektion tag; **tap to flip**, **swipe left = Again / right = Known**, helper text, **Listen 🔊** (TTS) and **Example 🔊** buttons.
  - Back: English panel, Persian (RTL) panel, example sentence, **Pronunciation** button (Web Speech Recognition scores your spoken German → "Perfect!" / "Compare: …").
  - Rating row: **Again / Hard / Good / Easy** with +1/+2/+3/+5 XP.
- **Pack summary:** "Pack complete!", score, XP earned, per-word correct/wrong pills, **"Save & next pack"** / **"Discard"**.
- **Scope progress card:** seen vs. mastered dual bars with legend.

### 4.3 Quiz — *the largest, densest screen*
**Start screen:** scope selectors (book + Lektion pills), then mode cards:

| Mode | What it is | XP |
|---|---|---|
| **Dictation DE** | Hear the German word (TTS), type it exactly — umlaut keypad ä ö ü ß | +12 |
| **Artikel** | Pick der/die/das | +8 |
| **Mixed** | Mix of the above | 8–12 |
| **4-Choice** | Pick the correct English/Persian meaning from 4 tiles drawn from the same Lektion | +10 |
| **DE → فارسی** | Type the Persian meaning (RTL input) | +12 |
| **Diktat-Check** | Spelling: find the correctly/incorrectly spelled word out of 4 | +10 |

Plus a **"Lernstand"** panel (Unseen / Practiced / Weak tiles) and start buttons (Start 5/10/20).

**Games section — "Games — DE ↔ EN + فارسی":**
- **Match Dash** — 12-tile memory match, DE ↔ EN+FA, move counter, perfect bonus
- **Lightning Sprint** — 45-second rapid-fire 4-choice with a streak multiplier up to 2×
- **SatzBau (Sentence Forge)** — tap scrambled words back into a correct German sentence; per-position green/red grading, "Show answer", hint with English + Persian translation
- **WortSturm (Word Rain)** — a word falls for 6 seconds, 3 lives, pick the right meaning; arcade panic mode

**In-quiz UI:** mode label, question counter, score + XP, progress bar, Exit. Rich feedback animations: correct = green lock + auto-advance (in 4-Choice), wrong = tile elimination/shake, retry loops in typing modes.

**Quiz report (completion screen):** big accuracy %, correct/missed/XP stat tiles, accuracy bar, per-Lektion performance rows, "Strengths & Focus" callout, "Recommendation" box, "Words to review" list, and a "What's next?" action card (Practice Lektion / Review weak words / Retake / New quiz / Back to book).

### 4.4 Prüfung (Exam) — *the serious, formal mode*
A full mock-exam experience styled like a Goethe/telc A1 practice test:
- **Start:** book toggle (A1.1 Final Mock / A1.2 Final Mock), dark gradient hero with best score ("Bestleistung: 45/55 (82%)" or "Noch kein Versuch"), CTA **"Prüfung starten →"**, a breakdown of the 4 sections — **Diktation (15) · Grammatik (15) · Wortschatz (15) · Lesen (10)** — plus **"Einzelteile üben"** (single-section training, reshuffled every run). German-first copy. Honest note card: "Hören ist nicht dabei" (no listening section yet).
- **Question flow:** section kicker ("DIKTATION — Welches ist FALSCH geschrieben?"), reading passages rendered inline for Lesen, 4 custom radio options, **Zurück / Weiter → / Prüfung abgeben**, and a destructive **"Abbrechen (Fortschritt geht verloren)"**.
- **Result screen:** huge score + %, "Neue Bestleistung!" + XP bonus, per-section result rows, "Needs practice" chips (weak grammar topics / Lektions), and a full **Review** of every wrong answer with your answer, the right answer, and an explanation. Actions: **"Neu mischen & erneut versuchen" / "Schwache Wörter üben" / "Bücher"**.

### 4.5 Streak — *the most visually elaborate screen*
- **Hero:** tier icon with pop animation, giant **"N DAYS"**, tier badge, Persian line ("N روز متوالی"), progress bar to the next tier, freeze balance chip ("N فریز").
- **Stats trio:** Current / Longest / Total days.
- **Month calendar:** every day is a tile that permanently remembers which tier it was earned in — an "evolution timeline." Dual month titles (Gregorian + Jalali), RTL Persian weekday header (شنبه…), prev/next buttons labeled **قبل / بعد**. Day states: completed (tier-colored + particle effect), today (animated progress ring), frozen (ice-glass + snowflake overlay), missed (dark "cracked stone", deliberately not red/shaming), future, rest. Tap a day → **bottom sheet** with date, tier/freeze status, XP/reviews/sessions that day, and a per-mode breakdown.
- **Evolution tiers list:** Ember (1–9) → Inferno (10–29) → Thunderstorm (30–59) → Tsunami (60–89) → Hurricane (90–149) → Volcano (150–249) → Solar Storm (250–364) → Cosmic (365–729) → Legendary (730+), each with a freeze reward.
- **Freeze history** ledger: earned / used / refunded.
- **Overlays:** "Milestone reached!" dialog and one-time full-screen **tier celebrations** with copy like *"Ember ignited — Your journey begins. One day at a time."* / *"Cosmic unlocked — A galaxy expands behind your calendar. One full year."*
- **Empty state:** "Finish a pack, quiz, or game to plant your first streak day. Opening the app alone doesn't count."

### 4.6 Suche (Search)
Single trilingual search field ("Suche German, English, فارسی oder Lektion..."), book filter tags, result count, result cards (gender-tinted, article + German + English + RTL Persian, plural, Lektion, example, `custom` badge, delete button for own cards). Tapping a card speaks the word. Shows max 80 results.

### 4.7 Weak (Mistake Bank)
Red alert card: "Failed cards auto-collected." Actions: **"Practice Weak (n)"** (loads them into a study pack) and **"Quiz Weak"**. List of the words with translations, examples, listen buttons. Empty state: "No weak words yet. Cards marked 'Again' appear here."

### 4.8 Board (Leaderboard)
Black hero: "Your rank #N / M", total XP tile, XP-to-#1, Local/Online toggle, name input + Sync. Ranked rows with avatar, XP, trophies for #1–#3. Admin mode adds delete controls. (Some copy is placeholder — e.g. a hardcoded "Season ends in 12 days.")

### 4.9 Profile & Analytics
- **Logged out:** "Not logged in — Sign up to save your XP, streak and weak words online. Works offline too." + Login/Sign up buttons.
- **Logged in:** identity card (username, ADMIN badge, email, join date, book • XP • streak • reviews), Logout + Sync XP, scope progress bars, per-book mini-cards, and a stats grid: Total XP, Day streak, Weak in scope, Mastered words, Learned words, Total weak, Custom cards, Total words.
- **Book analytics** (embedded in Bücher): "BOOK REPORT" with accuracy %, stat tiles, a **14-day progress-over-time bar chart**, per-Lektion performance rows with low-confidence tags, strengths/focus callout, recommendation box, and jump buttons (Practice Lektion / Review weak words / Study book / Quiz book).

### 4.10 Admin
Only visible to the admin account: user list (XP, email, join date, streak), delete buttons, reset/refresh board.

---

## 5. How it works — flows the design must support

1. **Scope selection drives everything.** The user picks a book, then one or more Lektionen (persisted across sessions). That scope feeds Study, Quiz, the analytics, and the Weak view. *Scope is a first-class concept — every screen shows "current scope" and offers a way to change it.*

2. **Study loop (Lernen):** Scope → pack of 10/20/50 due words → flip/swipe/rate each card → SM-2 spaced repetition recalculates when each word returns (1d → 6d → 15d → 38d…) → summary → **save once at the end of the pack** (single write, keeps it fast). "Again" ratings auto-collect the word into the Mistake Bank.

3. **Quiz loop:** Scope → choose mode → 5–20 questions → immediate feedback → completion report with recommendations → jump to weak words or the next activity.

4. **Exam loop:** Choose book → 55–66 questions across 4 sections (fresh shuffle every run) → navigate freely (Zurück/Weiter) → submit → scored report with wrong-answer review → retake or go fix weak spots.

5. **The streak funnel (critical):** *every* activity — pack, quiz, exam, game — converges into one "attempt" pipeline that marks today complete (UTC day), extends the streak, possibly earns/consumes a freeze, and may trigger a milestone/tier celebration. Opening the app alone never counts. The design must make "I did something today" legible at a glance.

6. **XP economy (anti-grinding by design):** swiping cards pays only +1…+5; quizzes pay +8…+12; games pay ~+6…+40; exams pay a one-time capped bonus (max 40 XP, only on improvement). Copy in the app explicitly says "4-Choice — Most efficient way to earn!" *The design should make the higher-value, higher-effort activities feel like the rewarding ones.*

7. **Mastery:** a word is "mastered" at 3× Good with a ≥14-day interval; Lektion and book mastery percentages appear on many screens (progress bars everywhere).

8. **Local-first + optional account:** everything works offline with no login; logging in merges local progress with the cloud; the leaderboard syncs on demand.

9. **PWA lifecycle:** install prompt, offline-ready state, hourly update check, non-destructive update dialog. The design must keep progress/XP anxiety in mind — update and offline messaging always reassures "your progress is safe."

---

## 6. The vibe — what the redesign should *feel* like

**GermanSplash is a gamified study arcade with an exam-prep backbone.** The personality sits at the intersection of four things:

1. **Energetic & streak-obsessed.** The app runs on momentum: XP, streaks, tiers, multipliers, combos, celebrations. It should feel like a rhythm game for vocabulary — quick, snappy, rewarding, with constant micro-feedback (sounds, motion, counters ticking up). Motion is a core part of the identity today: sliding tab indicators, staggered card entrances, choice tiles that eliminate and lock, matched tiles that collapse, particle effects on calendar days.

2. **Serious about learning.** Underneath the arcade shell it's rigorous: SM-2 spaced repetition, a mistake bank, per-Lektion analytics, full mock exams with explanations, explicit anti-grinding rules. The tone must never feel like a toy — it should feel like a *smart coach that happens to be fun*. Exam mode in particular should feel calm, formal, and credible (it mimics a Goethe/telc test), a deliberate contrast to the games.

3. **Trilingual and culturally warm.** German is the object of study, English is the interface bridge, Persian is the emotional layer — native-language encouragement ("N روز متوالی"), Jalali calendar, RTL layouts, Persian leaderboard rivals. The redesign must treat three scripts as a first-class design material, not an afterthought: German needs room for articles/umlauts/long compounds, Persian needs proper RTL typography and its own font, and the mix should feel intentional rather than accidental.

4. **Encouraging, never punishing.** Missed days are styled "respectful, not red." Empty states are friendly invitations. Wrong answers teach. Celebrations are generous (tier unlocks get full-screen treatments with poetic copy — *"Fire expands. Ten days of dedication."*). The app celebrates consistency over perfection.

**Aesthetic anchors already present in the product** (not a constraint, just the current DNA): a near-monochrome black/white base with a few saturated accent colors; pill-shaped buttons everywhere; a frosted-glass header; gender color-coding (der = blue, die = red, das = green) used consistently as an information layer; an editorial, cream-and-serif splash screen that contrasts with the utilitarian white app; gradient-drenched hero cards (books, exams, ranks) as the "premium" moments. The brand mark is a red slash + yellow "D" form, and the palette leans red/yellow — echoing the German flag without being literal about it.

**One-sentence vibe target:** *a fast, motion-rich, trilingual study arcade — disciplined like a German exam, warm like a Persian coach, and as satisfying to keep alive as a streak.*

---

## 7. What the redesign must not break

- **Three languages on every surface**, including mixed-language sentences, RTL Persian inside LTR layouts, and Persian digits in the calendar.
- **Gender color-coding** (der/die/das) — it's a functional legend users learn.
- **The data-dense screens:** mastery bars, per-Lektion grids, calendars, analytics reports, exam reviews. These need hierarchy, not simplification-by-deletion.
- **The full state coverage:** every screen has loading, empty, error, and populated states — all need designing.
- **Installability/offline reality:** no browser-dependent patterns; large tap targets; safe-area insets; a layout that works from ~360px to desktop.
- **Accessibility:** animations already respect `prefers-reduced-motion` — keep that discipline.
- **PWA update/offline messaging** — users are protective of their streak and XP; never make them fear losing progress.

---

## 8. Known weak spots we'd like the redesign to fix

1. **Navigation:** 9–10 scrolling top tabs, mixed German/English labels, hidden tabs off-screen. The IA is due for a rethink.
2. **Header congestion:** logo, PRO badge, subtitle, auth, settings, streak, XP all compete in one bar.
3. **No onboarding:** first-time users land in the app with only a splash screen; the "what is this / where do I start" moment is missing.
4. **Inconsistent language strategy:** UI mixes German labels ("Prüfung abgeben") with English body copy ("Pick the right meaning") and Persian flourishes. Pick a rule and make it a feature.
5. **No dark mode** (on the roadmap).
6. **Dashboard-y repetition:** progress bars, XP, and streak numbers repeat on nearly every screen; a redesign could establish a clearer hierarchy of "what matters where."
7. **Desktop is an afterthought** — currently just the same 620px column centered on a gradient. There's an opportunity to design a proper large-screen experience.
8. **Placeholder/hardcoded copy** here and there (e.g. "Season ends in 12 days") that should be either made real or removed.

---

## 9. Deliverables we'd expect

1. A full **redesign of every screen and state** listed in §3–§4 (shell, splash, all 9–10 screens, all modals/overlays/celebrations).
2. A proposed **information architecture / navigation model** replacing the current tab strip.
3. A **visual language**: typography (must cover Latin + Arabic/Persian scripts), color (including the der/die/das legend and semantic states), spacing, elevation, motion principles.
4. **Key component specs**: the FlashCard (front/back/swipe/rating states), quiz answer tiles (idle/correct/wrong/eliminated), book & Lektion cards, the streak calendar tile states, analytics report modules, exam question + result screens.
5. **Responsive behavior**: phone-first, with a considered desktop layout.
6. If possible: a clickable prototype of the two core loops — **study pack → summary → save** and **quiz → report → weak words** — since those are the app's heartbeat.
