import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Tabs, Tab } from 'baseui/tabs-motion';
import { Block } from 'baseui/block';
import { HeadingLevel } from 'baseui/heading';
import { Notification } from 'baseui/notification';
import { db, initDB, getStats, COMPETITORS, getAllWords, addCustomWord, deleteCustomWord, fetchOnlineLeaderboard, submitOnlineScore, deleteOnlineScore, resetOnlineBoard, recordQuizAttempts, getQuizAttempts, recordLearningActivity, applyLearningXp, mergeServerStreak } from './db';
import { signup, login, fetchMe, logout, fetchUsers, deleteUser, fetchProgress, saveProgress, saveProgressOne, fetchStatsOnline, saveStatsOnline, submitStreakActivity, fetchStreakState } from './auth';
import { getMilestoneForStreak } from './utils/streak.js';
import { sm2, qualityFromLabel, XP_MAP, QUIZ_XP, GAME_XP } from './srs';
import { calcQuizReport } from './utils/analytics.js';
import { todayKey, dayStartOf, buildExposureIndex, partitionPool, orderFallback, takeUpTo, selectGameSet } from './utils/selection.js';
import { BOOKS, ALL_MENSCHEN_WORDS, lektionenForBook } from './data/menschen.js';
import PWAUpdater from './components/PWAUpdater.jsx';
import SplashScreen from './components/SplashScreen.jsx';
import Header from './components/layout/Header.jsx';
import AddCardModal from './components/modals/AddCardModal.jsx';
import AuthModal from './components/modals/AuthModal.jsx';
import BuecherTab from './components/tabs/BuecherTab.jsx';
import LernenTab from './components/tabs/LernenTab.jsx';
import QuizTab from './components/tabs/QuizTab.jsx';
import StreakTab from './components/tabs/StreakTab.jsx';
import SucheTab from './components/tabs/SucheTab.jsx';
import WeakTab from './components/tabs/WeakTab.jsx';
import BoardTab from './components/tabs/BoardTab.jsx';
import ProfileTab from './components/tabs/ProfileTab.jsx';
import AdminTab from './components/tabs/AdminTab.jsx';
import { speakGerman } from './utils/speak.js';
import { playCorrect, playIncorrect, playPackComplete, playQuizComplete, playGameWin, playGameOver, playMatchPair, playXp, playStreak, playTap, primeAudio } from './utils/sounds.js';
import {
  BookOpen,
  GraduationCap,
  Brain,
  Flame,
  Search,
  Target,
  Trophy,
  User,
  ShieldCheck,
  CheckCircle2,
  ICON_SIZES,
} from './components/icons.jsx';

function NavLabel({ icon: Icon, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Icon size={ICON_SIZES.nav} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span>{label}</span>
    </span>
  );
}

// --- helpers: shuffle & vocab presentation ---
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function shuffleIfMulti(lektions, arr) {
  if (lektions && lektions.length > 1) return shuffleArray(arr);
  return arr;
}
// Decide if a word's german string is a full sentence vs vocab item
// Vocabulary items are short (<=3-4 tokens) or nouns/verbs with article; educational sentences are longer and contain sentence punctuation
function isVocabLike(word) {
  if (!word || !word.german) return true;
  const g = word.german.trim();
  // slash alternatives like "die Großmutter / die Oma" are considered vocab phrases, keep them
  if (g.includes('/')) {
    const parts = g.split('/').map(s=>s.trim()).filter(Boolean);
    // if each alternative is short (<=3 tokens), treat as vocab phrase
    if (parts.every(p=> p.split(/\s+/).length <= 4)) return true;
  }
  const tokens = g.split(/\s+/).filter(Boolean);
  // short entries are vocab
  if (tokens.length <= 4) return true;
  // nouns with article that are still vocab even if long? rare — treat as vocab if type is noun and first token is article
  if (word.type === 'noun' && tokens.length <= 5) return true;
  // if it looks like a sentence (contains ? ! . and many tokens) -> not vocab
  const hasSentencePunct = /[?!.]$/.test(g) || g.includes('?') || (g.includes('.') && tokens.length > 5);
  if (hasSentencePunct && tokens.length > 5) return false;
  // long "other" phrases that are actually vocabulary lists (e.g., "ich / du / Sie") are short per slash check above, else consider vocab if only pronouns
  if (tokens.length > 6) return false;
  return true;
}
function isEducationalSentence(word) {
  return !isVocabLike(word);
}
function filterVocabForGames(words) {
  // keep custom words and short vocab; exclude long educational sentences from vocab games
  return words.filter(w=> isVocabLike(w));
}
function getVocabDisplayGerman(word) {
  if (!word) return '';
  // For vocab contexts, if the entry is a sentence but contains a clear target vocab word that is also a separate entry,
  // we prefer to show the shortest meaningful phrase. For now, handle slash: show first alternative for compactness.
  const g = word.german || '';
  if (g.includes(' / ')) {
    // for vocab games, show first variant to keep card compact and avoid slash clutter
    // but preserve full for educational context elsewhere
    return g.split(' / ')[0].trim();
  }
  return g;
}

// --- distractor scoring (semantic relevance) ---
function scoreDistractor(target, candidate) {
  let score = 0;
  // same type is strongest signal (noun vs verb vs other)
  if ((candidate.type || 'other') === (target.type || 'other')) score += 10;
  if ((candidate.pos || 'other') === (target.pos || 'other')) score += 4;
  // same lektion = topical relevance
  if (candidate.lektion === target.lektion) score += 12;
  else if (candidate.book === target.book) score += 3;
  // same article for nouns => grammatical plausibility
  if (target.article && candidate.article && target.article === candidate.article) score += 6;
  // lexical overlap in English meanings
  const tEn = (target.meaning_en || target.english || '').toLowerCase();
  const cEn = (candidate.meaning_en || candidate.english || '').toLowerCase();
  const tTokens = tEn.split(/[\s\(\)\/,;.-]+/).filter(s=> s.length>2);
  const cTokens = cEn.split(/[\s\(\)\/,;.-]+/).filter(s=> s.length>2);
  let shared = 0;
  for (const tok of tTokens) if (cTokens.includes(tok)) shared++;
  score += shared * 5;
  // penalize very short vs long mismatch slightly is ok, but prefer similar length
  const lenDiff = Math.abs(tEn.length - cEn.length);
  if (lenDiff < 8) score += 2;
  else if (lenDiff > 20) score -= 1;
  // prefer words that are not identical obviously handled outside, but penalize identical english
  if (tEn && cEn && tEn === cEn) score -= 100;
  // same first letter bonus (often similar semantic field coincidence? small)
  if (tEn[0] && cEn[0] && tEn[0] === cEn[0]) score += 0.5;
  return score;
}
function selectPlausibleDistractors(targetWord, pool, need = 3) {
  const candidates = pool.filter(w => w.id !== targetWord.id && (w.meaning_en || w.english));
  // score all
  const scored = candidates.map(w => {
    const en = w.meaning_en || w.english;
    const fa = w.meaning_fa || '';
    return { w, en, fa, score: scoreDistractor(targetWord, w) + Math.random()*1.5 };
  });
  scored.sort((a,b)=> b.score - a.score);
  // filter unique english
  const uniq = [];
  const seen = new Set();
  const targetEn = (targetWord.meaning_en || targetWord.english || '').toLowerCase().trim();
  for (const s of scored) {
    const key = s.en.toLowerCase().trim();
    if (key === targetEn) continue;
    if (seen.has(key)) continue;
    if (!s.en || s.en.trim()==='') continue;
    seen.add(key);
    uniq.push({ en: s.en, fa: s.fa, id: s.w.id });
    if (uniq.length >= need) break;
  }
  // fallback if not enough
  while (uniq.length < need) {
    const poolAny = pool.filter(w=> w.id!==targetWord.id);
    const rnd = poolAny[Math.floor(Math.random()*poolAny.length)];
    if (!rnd) break;
    const en = rnd.meaning_en || rnd.english || '—';
    const low = en.toLowerCase().trim();
    if (low === targetEn || seen.has(low)) continue;
    seen.add(low);
    uniq.push({ en, fa: rnd.meaning_fa||'', id: rnd.id });
  }
  return uniq;
}

export default function App() {
  const [activeKey, setActiveKey] = useState('0');
  const [splashPhase, setSplashPhase] = useState('visible');
  const [splashCanContinue, setSplashCanContinue] = useState(false);
  const [isFirstLaunch] = useState(() => {
    try { return !localStorage.getItem('gs_splash_seen'); } catch { return false; }
  });
  const [stats, setStats] = useState({ xp: 0, streak: 0, lastStudyDate: null, totalReviews: 0 });
  const [search, setSearch] = useState('');
  const [progressMap, setProgressMap] = useState({});
  const [weakIds, setWeakIds] = useState(new Set());
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [dbReady, setDbReady] = useState(false);
  const [toast, setToast] = useState(null);
  const [streakRefreshKey, setStreakRefreshKey] = useState(0);
  const [pendingCelebration, setPendingCelebration] = useState(null);
  const [allWords, setAllWords] = useState(ALL_MENSCHEN_WORDS);
  const [showAdd, setShowAdd] = useState(false);
  const [newCard, setNewCard] = useState({ german: '', english: '', englishFa: '', article: '', plural: '', level: 'Custom', book: '', lektion: '', example: '', exampleEn: '' });
  const [onlineBoard, setOnlineBoard] = useState(null);
  const [onlineError, setOnlineError] = useState(null);
  const [username, setUsername] = useState(() => localStorage.getItem('gs_username') || '');
  const [useOnline, setUseOnline] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('gs_admin_token') || '');
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('gs_token') || '');
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [usersList, setUsersList] = useState([]);

  // Animated splash screen: doubles as the loading screen while the DB initializes.
  // First launch: waits for the user to tap "Los geht's" (no auto-skip).
  // Returning launches: auto-dismisses once the loading bar has filled.
  useEffect(() => {
    if (splashPhase === 'hidden') return;
    if (!isFirstLaunch) {
      const leaveTimer = window.setTimeout(() => setSplashPhase('leaving'), 2600);
      const hideTimer = window.setTimeout(() => setSplashPhase('hidden'), 3300);
      return () => {
        window.clearTimeout(leaveTimer);
        window.clearTimeout(hideTimer);
      };
    }
    if (dbReady) {
      const readyTimer = window.setTimeout(() => setSplashCanContinue(true), 2600);
      return () => window.clearTimeout(readyTimer);
    }
  }, [isFirstLaunch, dbReady, splashPhase]);

  const handleSplashContinue = () => {
    try { localStorage.setItem('gs_splash_seen', '1'); } catch {}
    setSplashPhase('leaving');
    window.setTimeout(() => setSplashPhase('hidden'), 700);
  };

  // Book / Lektion scope — multi-select support
  const [selectedBook, setSelectedBook] = useState(() => localStorage.getItem('gs_book') || 'a1.1');
  const [selectedLektions, setSelectedLektions] = useState(() => {
    try {
      const raw = localStorage.getItem('gs_lektions');
      if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
    } catch {}
    const legacy = localStorage.getItem('gs_lektion');
    if (legacy && legacy !== 'all') return [legacy];
    return [];
  });
  const [bookView, setBookView] = useState(null);
  const [flipped, setFlipped] = useState(false);

  // quiz state
  const [quizMode, setQuizMode] = useState('mixed');
  const [quizQueue, setQuizQueue] = useState([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0, xp: 0 });
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizArtikelChoice, setQuizArtikelChoice] = useState('');
  const [quizBook, setQuizBook] = useState(() => localStorage.getItem('gs_quiz_book') || 'a1.1');
  const [quizLektions, setQuizLektions] = useState(() => {
    try {
      const raw = localStorage.getItem('gs_quiz_lektions');
      if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) return arr; }
    } catch {}
    const legacy = localStorage.getItem('gs_quiz_lektion');
    if (legacy && legacy !== 'all') return [legacy];
    return [];
  });
  // 4-answer choice quiz
  const [choiceOptions, setChoiceOptions] = useState([]);
  const [choicePick, setChoicePick] = useState('');
  // choice interaction states (correct/wrong behavior + animations)
  const [choiceEliminated, setChoiceEliminated] = useState(new Set());
  const [choiceCorrectLocked, setChoiceCorrectLocked] = useState(false);
  const [choiceCorrectEn, setChoiceCorrectEn] = useState(null);
  const [choiceTransition, setChoiceTransition] = useState('idle'); // idle | exiting | entering (initial bottom-up) | returning (side-in after correct)
  const [questionFade, setQuestionFade] = useState(false);
  const [choiceAnimKey, setChoiceAnimKey] = useState(0);
  const choiceProcessedRef = useRef(false);
  // quiz submission idempotency guard
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const quizSubmitLockRef = useRef(false);
  const quizProcessedIdxRef = useRef(-1);
  const nextLockRef = useRef(false);
  // === Quiz analytics (Issue #2): per-question attempts for the report + history ===
  // quizDetailRef is the source of truth for the completion report.
  const quizDetailRef = useRef([]);
  const quizSessionRef = useRef(null);
  const choiceWrongRef = useRef(0);
  const [lastQuizReport, setLastQuizReport] = useState(null); // { report, meta }
  const [showQuizReport, setShowQuizReport] = useState(false);
  const [quizHistory, setQuizHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  // Match Dash game — DE vs EN+FA (no spoiler)
  const [matchBoard, setMatchBoard] = useState([]);
  const [matchPicks, setMatchPicks] = useState([]);
  const [matchMatched, setMatchMatched] = useState(0);
  const [matchMoves, setMatchMoves] = useState(0);
  const [matchStarted, setMatchStarted] = useState(false);
  const [matchDone, setMatchDone] = useState(false);
  const [matchXp, setMatchXp] = useState(0);
  const [matchFadingIds, setMatchFadingIds] = useState(new Set());
  const [matchShakeIds, setMatchShakeIds] = useState(new Set());
  const [matchWrongIds, setMatchWrongIds] = useState(new Set());
  const [matchHiddenIds, setMatchHiddenIds] = useState(new Set());
  // Lightning Sprint — DE prompt -> EN+FA options
  const [sprintActive, setSprintActive] = useState(false);
  const [sprintQueue, setSprintQueue] = useState([]);
  const [sprintIdx, setSprintIdx] = useState(0);
  const [sprintOptions, setSprintOptions] = useState([]);
  const [sprintTime, setSprintTime] = useState(45);
  const [sprintScore, setSprintScore] = useState({ correct:0, total:0, streak:0, best:0, xp:0 });
  const [sprintFeedback, setSprintFeedback] = useState(null);
  // === NEW GAMES ===
  // SatzBau — Sentence Forge
  const [satzQueue, setSatzQueue] = useState([]);
  const [satzIdx, setSatzIdx] = useState(0);
  const [satzBuilt, setSatzBuilt] = useState([]);
  const [satzPool, setSatzPool] = useState([]);
  const [satzFeedback, setSatzFeedback] = useState(null);
  const [satzScore, setSatzScore] = useState({ correct:0, total:0, xp:0 });
  const [satzActive, setSatzActive] = useState(false);
  // WortSturm — Word Rain
  const [rainQueue, setRainQueue] = useState([]);
  const [rainIdx, setRainIdx] = useState(0);
  const [rainOptions, setRainOptions] = useState([]);
  const [rainTime, setRainTime] = useState(6);
  const [rainLives, setRainLives] = useState(3);
  const [rainScore, setRainScore] = useState({ correct:0, total:0, streak:0, best:0, xp:0 });
  const [rainActive, setRainActive] = useState(false);
  const [rainFeedback, setRainFeedback] = useState(null);

  // pack study
  const [packWords, setPackWords] = useState([]);
  const [packIdx, setPackIdx] = useState(0);
  const [packAnswers, setPackAnswers] = useState([]);
  const [packSize, setPackSize] = useState(10);
  const [showPackSummary, setShowPackSummary] = useState(false);
  const [pendingProgress, setPendingProgress] = useState({});
  const [isSavingPack, setIsSavingPack] = useState(false);

  useEffect(()=>{ localStorage.setItem('gs_book', selectedBook); },[selectedBook]);
  useEffect(()=>{ localStorage.setItem('gs_lektions', JSON.stringify(selectedLektions)); },[selectedLektions]);
  useEffect(()=>{ localStorage.setItem('gs_quiz_book', quizBook); },[quizBook]);
  useEffect(()=>{ localStorage.setItem('gs_quiz_lektions', JSON.stringify(quizLektions)); },[quizLektions]);

  const loadProgressForUser = useCallback(async (token) => {
    if (token) {
      try {
        const serverProgress = await fetchProgress();
        if (serverProgress && Object.keys(serverProgress).length > 0) {
          const map = {};
          const weak = new Set();
          Object.values(serverProgress).forEach((p) => {
            map[p.id] = p;
            if (p.lapses > 0 || (p.ease && p.ease < 1.8)) weak.add(p.id);
          });
          setProgressMap(map);
          setWeakIds(weak);
          return;
        } else {
          const local = await db.progress.toArray();
          if (local.length > 0) {
            const obj = {}; local.forEach(p=> obj[p.id]=p);
            try { await saveProgress(obj); } catch {}
            const map = {}; const weak = new Set();
            local.forEach((p) => { map[p.id]=p; if (p.lapses>0 || (p.ease && p.ease<1.8)) weak.add(p.id); });
            setProgressMap(map); setWeakIds(weak);
            return;
          }
          setProgressMap({}); setWeakIds(new Set()); return;
        }
      } catch {}
    }
    const allProg = await db.progress.toArray();
    const map = {};
    const weak = new Set();
    allProg.forEach((p) => {
      map[p.id] = p;
      if (p.lapses > 0 || (p.ease && p.ease < 1.8)) weak.add(p.id);
    });
    setProgressMap(map);
    setWeakIds(weak);
  }, []);

  const loadStatsForUser = useCallback(async (token) => {
    if (token) {
      try {
        const serverStats = await fetchStatsOnline();
        if (serverStats && typeof serverStats.xp === 'number') {
          setStats(serverStats);
          // Union-merge the server-authoritative streak so cross-device and
          // cross-session history stays consistent.
          try {
            const serverStreak = await fetchStreakState();
            if (serverStreak?.ok) {
              const merged = await mergeServerStreak(serverStreak);
              if (merged?.stats) { setStats(merged.stats); return merged.stats; }
            }
          } catch {}
          return serverStats;
        } else {
          const s = await getStats();
          if (s.xp > 0 || s.streak > 0) {
            try { await saveStatsOnline(s); } catch {}
          }
          setStats(s);
          return s;
        }
      } catch {}
    }
    const s = await getStats();
    setStats(s);
    return s;
  }, []);

  useEffect(() => {
    (async () => {
      await initDB();
      try {
        const wordsFromDB = await getAllWords();
        if (wordsFromDB.length > 0) setAllWords(wordsFromDB);
        else setAllWords(ALL_MENSCHEN_WORDS);
      } catch { setAllWords(ALL_MENSCHEN_WORDS); }
      const t = localStorage.getItem('gs_token');
      if (t) {
        try {
          const u = await fetchMe();
          if (u) {
            setAuthUser(u);
            setUsername(u.username);
            setAuthToken(t);
            await loadStatsForUser(t);
            await loadProgressForUser(t);
          } else {
            await loadStatsForUser(null);
            await loadProgressForUser(null);
          }
        } catch {
          await loadStatsForUser(null);
          await loadProgressForUser(null);
        }
      } else {
        await loadStatsForUser(null);
        await loadProgressForUser(null);
      }
      setDbReady(true);
      fetchOnlineLeaderboard().then(b => { if (b) { setOnlineBoard(b); setUseOnline(true); } }).catch(()=>{});
      const savedName = localStorage.getItem('gs_username');
      if (savedName) setUsername(savedName);
    })();
  }, [loadProgressForUser, loadStatsForUser]);

  useEffect(() => {
    if (!dbReady) return;
    (async () => {
      if (authUser) {
        await loadStatsForUser(authToken);
        await loadProgressForUser(authToken);
      } else {
        await loadStatsForUser(null);
        await loadProgressForUser(null);
      }
      setPackWords([]); setPackIdx(0); setFlipped(false);
    })();
  }, [authUser, authToken, dbReady, loadProgressForUser, loadStatsForUser]);

  // === Quiz history (Issue #2): single bulk read, filtered in memory — no N+1 ===
  const reloadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const rows = await getQuizAttempts(3000);
      setQuizHistory(rows);
    } catch {
      setHistoryError('History unavailable — quiz reports still work for new quizzes.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    reloadHistory();
  }, [dbReady, reloadHistory]);

  // Persist attempts (fire-and-forget safe) and optimistically extend in-memory history.
  // This is the single funnel for streak credit: packs, quizzes and games all
  // converge here, and streak days are derived from these persisted attempts —
  // opening/viewing/refreshing never reaches this layer.
  const handleStreakEvents = useCallback((events) => {
    if (!events) return;
    if (events.protectedDates?.length) {
      setToast('Freeze used — streak protected');
      setTimeout(()=> setToast(null), 2200);
    }
    const latest = events.awardedMilestones?.[events.awardedMilestones.length - 1];
    if (latest) setPendingCelebration({ ...latest, ...getMilestoneForStreak(latest.milestone) });
  }, []);
  const persistAttempts = useCallback((entries) => {
    if (!entries || entries.length === 0) return;
    setQuizHistory((prev) => [...entries.map((e) => ({ ...e, correct: !!e.correct })), ...prev].slice(0, 3000));
    recordLearningActivity(entries).then(async (result) => {
      if (!result?.ok || !result?.stats) return;
      if (authToken) {
        // Server is authoritative when logged in: confirm, union-merge, render that.
        try {
          const server = await submitStreakActivity(entries);
          if (server?.ok) {
            const merged = await mergeServerStreak(server);
            if (merged?.stats) {
              setStats(merged.stats);
              const mergedEvents = (merged.events?.awardedMilestones?.length || merged.events?.protectedDates?.length)
                ? merged.events
                : result.events;
              handleStreakEvents(mergedEvents);
              setStreakRefreshKey((k) => k + 1);
              return;
            }
          }
        } catch {}
      }
      setStats(result.stats);
      handleStreakEvents(result.events);
      setStreakRefreshKey((k) => k + 1);
    }).catch(() => {
      recordQuizAttempts(entries).catch(() => {});
    });
  }, [authToken, handleStreakEvents]);

  // === Shared repetition selector (Quiz Frequency fix) ===
  // Single exposure index over ALL recorded appearances (quiz, games, packs),
  // aggregated once per render — no N+1, no per-candidate history scans.
  // Day key follows the app's UTC-day convention; recomputed every render so
  // midnight rollover is picked up without reloads.
  const exposureDay = todayKey();
  const exposureIndex = useMemo(
    () => buildExposureIndex(quizHistory, dayStartOf(exposureDay)),
    [quizHistory, exposureDay],
  );
  const selectionCtx = useMemo(
    () => ({ progressMap, weakIds, exposure: exposureIndex }),
    [progressMap, weakIds, exposureIndex],
  );
  // Ref mirror for timer effects: reading selectionCtx directly in the rain
  // interval would restart the countdown on every recorded answer.
  const selectionCtxRef = useRef(selectionCtx);
  useEffect(() => { selectionCtxRef.current = selectionCtx; });

  // scope words helper — multi-lektion (canonical: word belongs only to its first lesson)
  const scopeWords = useMemo(()=>{
    const book = selectedBook;
    const leks = selectedLektions;
    if (!book) return allWords;
    let w = allWords.filter(x=> x.book === book);
    if (leks && leks.length > 0) w = w.filter(x=> leks.includes(x.lektion));
    if (search.trim()) {
      const q = search.toLowerCase();
      w = w.filter(x => x.german.toLowerCase().includes(q) || (x.meaning_en||x.english||'').toLowerCase().includes(q) || (x.meaning_fa||'').includes(q) || x.lektion.toLowerCase().includes(q) || (x.appearsInLessons||[]).join(' ').toLowerCase().includes(q) || (x.canonicalLesson||'').toLowerCase().includes(q));
    }
    return w;
  }, [allWords, selectedBook, selectedLektions, search]);

  const quizScopeWords = useMemo(()=>{
    let w = allWords.filter(x=> x.book === quizBook);
    if (quizLektions && quizLektions.length > 0) w = w.filter(x=> quizLektions.includes(x.lektion));
    return w;
  }, [allWords, quizBook, quizLektions]);

  const filteredWordsForSearch = useMemo(() => {
    let w = allWords;
    if (search.trim()) {
      const q = search.toLowerCase();
      w = w.filter((x) => x.german.toLowerCase().includes(q) || (x.meaning_en||x.english||'').toLowerCase().includes(q) || (x.meaning_fa||'').includes(q) || (x.level||'').toLowerCase().includes(q) || (x.lektion||'').toLowerCase().includes(q) || (x.appearsInLessons||[]).join(' ').toLowerCase().includes(q) || (x.canonicalLesson||'').toLowerCase().includes(q) || (x.page||'').toLowerCase().includes(q));
    }
    return w;
  }, [allWords, search]);

  const studyQueue = useMemo(() => {
    if (!scopeWords.length) return [];
    const today = Date.now();
    // Shared eligibility first: strong words at their daily cap are excluded
    // (weak/new/learning are never capped). Capped words return only as fallback.
    const { eligible, capped } = partitionPool(scopeWords, selectionCtx);
    let newCount = 0;
    const withScore = eligible.map(({ w, status }) => {
      const p = progressMap[w.id];
      const due = p?.due || 0;
      const isNew = status === 'new';
      const lapses = p?.lapses || 0;
      const ease = p?.ease ?? 2.5;
      const interval = p?.interval || 0;
      const lastReview = p?.lastReview || 0;
      const daysSinceReview = lastReview ? (today - lastReview) / 86400000 : 999;
      let score = 0;
      if (due === 0 || isNew) {
        score = 1e9 - (isNew ? newCount++ : 0);
      } else {
        const overdueDays = Math.max(0, (today - due) / 86400000);
        score = overdueDays * 1000;
      }
      score += lapses * 500;
      score += (2.5 - ease) * 200;
      if (interval > 0 && interval < 7) score += (7 - interval) * 50;
      if (daysSinceReview > 14) score += 100;
      if (weakIds.has(w.id)) score += 300;
      return { w, score, isNew, status, due };
    });
    withScore.sort((a, b) => {
      // Reinforcement order preserved (due/weak/learning by SRS score),
      // but new/unseen now outrank familiar-strong instead of trailing last.
      const tier = (x) => (x.isNew ? 1 : x.status === 'strong' ? 2 : 0);
      if (tier(a) !== tier(b)) return tier(a) - tier(b);
      return b.score - a.score;
    });
    let res = withScore.map((x) => x.w);
    // Multi-Lektion: shuffle new words segment so lesson order doesn't dominate (due words keep SRS order)
    if (selectedLektions.length > 1) {
      const newIds = new Set(withScore.filter((x) => x.isNew).map((x) => x.w.id));
      const duePart = res.filter((w) => !newIds.has(w.id));
      const newPart = res.filter((w) => newIds.has(w.id));
      const shuffledNew = shuffleArray(newPart);
      // also shuffle duePart lightly if it still resembles lesson order — but keep SRS priority, so only shuffle within same score bands?
      // For true cross-lesson randomness, shuffle duePart when it contains many lessons and no strong score differences
      // We keep duePart as is to respect SRS, shuffle only newPart for now
      res = [...duePart, ...shuffledNew];
    }
    // Graceful fallback so small/capped pools never yield empty packs.
    if (capped.length > 0) res = [...res, ...orderFallback(capped).map((e) => e.w)];
    return res;
  }, [scopeWords, progressMap, weakIds, selectedLektions, selectionCtx]);

  // pack logic
  const sessionReviewedIds = useRef(new Set());
  const sessionDay = useRef(new Date().toISOString().slice(0,10));
  const prevScopeKey = useRef(`${selectedBook}::${selectedLektions.join(',')}`);
  useEffect(()=>{
    const key = `${selectedBook}::${selectedLektions.join(',')}`;
    if (prevScopeKey.current !== key) {
      prevScopeKey.current = key;
      sessionReviewedIds.current.clear();
      setPackWords([]); setPackIdx(0); setPackAnswers([]); setPendingProgress({}); setShowPackSummary(false); setFlipped(false);
    }
  },[selectedBook, selectedLektions]);

  const startNewPack = useCallback(() => {
    primeAudio();
    playTap();
    const today = new Date().toISOString().slice(0,10);
    if (sessionDay.current !== today) { sessionDay.current = today; sessionReviewedIds.current.clear(); }
    const available = studyQueue.filter(w => !sessionReviewedIds.current.has(w.id));
    let pack = available.slice(0, packSize);
    // Multi-lesson: shuffle pack order so presentation isn't lesson-by-lesson
    if (selectedLektions.length > 1) {
      pack = shuffleArray(pack);
    }
    if (pack.length === 0) {
      setToast(available.length === 0 ? 'No more words in this scope — try another Lektion or whole book' : 'All words reviewed');
      setTimeout(()=> setToast(null),1800);
      return;
    }
    setPackWords(pack);
    setPackIdx(0);
    setPackAnswers([]);
    setPendingProgress({});
    setShowPackSummary(false);
    setFlipped(false);
    setTranscript('');
  }, [studyQueue, packSize, selectedLektions]);

  const handlePackRate = useCallback((label) => {
    const word = packWords[packIdx];
    if (!word) return;
    primeAudio();
    if (label === 'Again') playIncorrect(); else { playCorrect(); if (label === 'Easy') setTimeout(() => playXp(), 140); }
    sessionReviewedIds.current.add(word.id);
    const base = pendingProgress[word.id] ? pendingProgress[word.id] : (progressMap[word.id] || { interval: 0, repetition: 0, ease: 2.5, due: 0, lapses: 0 });
    const next = sm2(base, qualityFromLabel(label));
    const xp = XP_MAP[label] || 5;
    const nextEntry = { id: word.id, level: word.level, book: word.book, lektion: word.lektion, ...next, lastReview: Date.now() };
    setPendingProgress(prev => ({ ...prev, [word.id]: nextEntry }));
    setPackAnswers(prev => [...prev, { word, label, xp, correct: label !== 'Again' }]);
    setProgressMap(m => ({ ...m, [word.id]: nextEntry }));
    if (label === 'Again') setWeakIds(s => { const n = new Set(s); n.add(word.id); return n; });
    // XP only — streak credit lands when the pack is saved (savePack persists
    // the attempts through the shared streak funnel).
    setStats(s => ({ ...s, xp: (s.xp||0)+xp, totalReviews: (s.totalReviews||0)+1 }));
    if (packIdx + 1 >= packWords.length) {
      setTimeout(() => playPackComplete(), 180);
      setShowPackSummary(true);
    } else {
      setPackIdx(i => i + 1);
      setFlipped(false);
      setTranscript('');
    }
  }, [packWords, packIdx, progressMap, pendingProgress]);

  const savePack = useCallback(async () => {
    primeAudio();
    if (Object.keys(pendingProgress).length === 0) {
      setShowPackSummary(false);
      startNewPack();
      return;
    }
    setIsSavingPack(true);
    const entries = Object.values(pendingProgress);
    const totalXp = packAnswers.reduce((a,b)=> a + b.xp, 0);
    // Record flashcard exposures for the shared repetition selector (mode 'pack';
    // excluded from quiz-accuracy aggregates, counted for daily appearances).
    if (packAnswers.length > 0) {
      const sessionId = `pack-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const ts = Date.now();
      persistAttempts(packAnswers.filter((a) => a.word).map((a) => ({
        sessionId, timestamp: ts, wordId: a.word.id,
        book: a.word.book || null, lektion: a.word.lektion || null,
        correct: a.label !== 'Again', xp: a.xp || 0, mode: 'pack',
      })));
    }
    try {
      if (authToken && authUser) {
        const bulk = {};
        entries.forEach(e => bulk[e.id] = e);
        const server = await fetchProgress() || {};
        const merged = { ...server, ...bulk };
        await saveProgress(merged);
        // Persist pack XP against the latest row (never clobber streak fields
        // with stale React state); streak credit came via persistAttempts above.
        const latest = await applyLearningXp(totalXp, packAnswers.length);
        setStats(latest);
        await saveStatsOnline(latest);
        await submitOnlineScore(authUser.username, latest.xp);
        const b = await fetchOnlineLeaderboard(); if (b) setOnlineBoard(b);
      } else {
        await db.progress.bulkPut(entries);
        const latest = await applyLearningXp(totalXp, packAnswers.length);
        setStats(latest);
        await db.stats.put({ id: 'main', ...latest });
      }
      setToast(`Pack saved +${totalXp} XP`);
      if (totalXp > 0) playQuizComplete(); else playTap();
    } catch (e) {
      setToast('Save failed — will retry');
      console.error(e);
    } finally {
      setIsSavingPack(false);
      setTimeout(()=> setToast(null),1500);
      setPendingProgress({});
      setPackAnswers([]);
      setShowPackSummary(false);
      setTimeout(()=> startNewPack(), 300);
    }
  }, [pendingProgress, packAnswers, authToken, authUser, startNewPack, persistAttempts]);

  const handlePackSwipe = useCallback((dir) => {
    if (dir === 'right') handlePackRate('Good');
    else handlePackRate('Again');
  }, [handlePackRate]);

  useEffect(() => {
    if (dbReady && activeKey === '1' && packWords.length === 0 && studyQueue.length > 0 && !showPackSummary) {
      startNewPack();
    }
  }, [dbReady, activeKey, studyQueue, packWords.length, showPackSummary, startNewPack]);

  const weakWords = useMemo(() => allWords.filter((w) => weakIds.has(w.id)), [allWords, weakIds]);
  const weakForScope = useMemo(()=> scopeWords.filter(w=> weakIds.has(w.id)),[scopeWords, weakIds]);

  const leaderboard = useMemo(() => {
    const board = (useOnline && onlineBoard) ? onlineBoard : COMPETITORS;
    const me = { name: username || 'You', xp: stats.xp || 0, avatar: (username || 'DU').slice(0,2).toUpperCase() };
    const all = [...board, me].sort((a, b) => b.xp - a.xp);
    const seen = new Set();
    const dedup = [];
    for (const p of all) { const k = p.name.toLowerCase(); if (!seen.has(k)) { seen.add(k); dedup.push(p); } }
    const sorted = dedup.sort((a,b)=> b.xp - a.xp);
    const rank = sorted.findIndex((p) => p.name.toLowerCase() === me.name.toLowerCase()) + 1;
    return { all: sorted, rank, me };
  }, [stats.xp, username, useOnline, onlineBoard]);

  // quiz building scoped — shared repetition selector (Quiz Frequency fix)
  const buildQuizQueue = useCallback((count = 10, mode = quizMode) => {
    let pool = quizScopeWords;
    if (!pool.length) return [];
    // For vocab games, filter out long educational sentences — keep them for SatzBau instead
    // For general quiz modes (dictation, artikel, choice, fa), we keep vocab-like only
    const vocabPool = (mode === 'satz' ? pool : filterVocabForGames(pool));
    const basePool = vocabPool.length >= 4 ? vocabPool : pool;
    // Shared eligibility: strong words at their daily cap drop out here
    // (weak/new/learning are never capped). Fallback tops up small pools.
    const { eligible, capped } = partitionPool(basePool, selectionCtx);
    const byStatus = (s) => eligible.filter((e) => e.status === s).map((e) => e.w);
    // Weak first — existing severity order (lapses desc, ease asc, due asc).
    const weak = eligible.filter((e) => e.status === 'weak').map((e) => e.w);
    weak.sort((a,b)=>{
      const pa = progressMap[a.id] || { lapses:0, ease:2.5, due:0 };
      const pb = progressMap[b.id] || { lapses:0, ease:2.5, due:0 };
      if (pb.lapses !== pa.lapses) return pb.lapses - pa.lapses;
      if (pa.ease !== pb.ease) return pa.ease - pb.ease;
      return (pa.due||Infinity) - (pb.due||Infinity);
    });
    // New/unseen outrank familiar; learning/strong shuffled for variety.
    const fresh = shuffleArray(byStatus('new'));
    const learning = shuffleArray(byStatus('learning'));
    const strong = shuffleArray(byStatus('strong'));
    let out = [...weak, ...fresh, ...learning, ...strong];
    if (mode === 'artikel') {
      out = out.filter(w => w.article);
      if (out.length < count) {
        const have = new Set(out.map((w) => w.id));
        const rest = partitionPool(basePool.filter(w => w.article && !have.has(w.id)), selectionCtx);
        const restWeak = rest.eligible.filter((e) => e.status === 'weak').map((e) => e.w);
        const restOther = shuffleArray(rest.eligible.filter((e) => e.status !== 'weak').map((e) => e.w));
        out = [...out, ...restWeak, ...restOther, ...orderFallback(rest.capped).map((e) => e.w)];
      }
    }
    // Eligible tiers first, capped-strong fallback only when the pool is short.
    return takeUpTo(out, orderFallback(capped), count);
  }, [quizScopeWords, progressMap, quizMode, selectionCtx]);

  const buildChoiceOptions = useCallback((word, pool) => {
    const correct = { en: word.meaning_en || word.english, fa: word.meaning_fa || '', id: word.id };
    const distractors = selectPlausibleDistractors(word, pool, 3);
    const opts = shuffleArray([...distractors, correct]);
    return { correct, opts }
  }, []);

  const startQuiz = (mode, count=10) => {
    primeAudio();
    playTap();
    if (mode === 'match') { startMatchGame(); return; }
    if (mode === 'sprint') { startSprintGame(count); return; }
    if (mode === 'satz') { startSatzGame(count); return; }
    if (mode === 'rain') { startRainGame(count); return; }
    const q = buildQuizQueue(count, mode);
    if (q.length===0) { setToast('No words for this scope/mode'); setTimeout(()=> setToast(null),1500); return; }
    setQuizMode(mode);
    setQuizQueue(q);
    setQuizIdx(0);
    setQuizAnswer('');
    setQuizArtikelChoice('');
    setChoicePick('');
    setQuizFeedback(null);
    setQuizScore({ correct:0, total:0, xp:0 });
    setQuizStarted(true);
    // reset analytics for this run (Issue #2)
    quizSessionRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    quizDetailRef.current = [];
    choiceWrongRef.current = 0;
    setLastQuizReport(null);
    setShowQuizReport(false);
    // reset choice-specific interaction state
    setChoiceEliminated(new Set());
    setChoiceCorrectLocked(false);
    setChoiceCorrectEn(null);
    setChoiceTransition('entering');
    setQuestionFade(false);
    setChoiceAnimKey(k=>k+1);
    choiceProcessedRef.current = false;
    quizSubmitLockRef.current = false;
    setQuizSubmitting(false);
    quizProcessedIdxRef.current = -1;
    if (mode === 'choice' && q[0]) {
      const { opts } = buildChoiceOptions(q[0], quizScopeWords);
      setChoiceOptions(opts);
    }
    setTimeout(()=> setChoiceTransition('idle'), 560);
    setTimeout(()=> { if ((mode==='dictation' || mode==='mixed') && q[0]) { const w=q[0]; if (mode==='dictation' || (mode==='mixed' && !w.article)) speakGerman(w.german); } }, 300);
  };

  const currentQuizWord = quizQueue[quizIdx] || null;

  const submitQuiz = async () => {
    primeAudio();
    if (!currentQuizWord) return;
    // idempotency guard: prevent double processing of same quiz index
    if (quizSubmitLockRef.current) return;
    if (quizProcessedIdxRef.current === quizIdx && quizFeedback) return;
    // also prevent if already submitting
    if (quizSubmitting) return;
    // for choice mode, delegate to direct handler if choicePick exists — but still guard
    // lock immediately synchronously
    quizSubmitLockRef.current = true;
    setQuizSubmitting(true);
    // mark this idx as processed to prevent re-entry before nextQuiz resets
    quizProcessedIdxRef.current = quizIdx;
    const isChoiceQ = quizMode === 'choice';
    const isArtikelQ = !isChoiceQ && (quizMode==='artikel' || (quizMode==='mixed' && currentQuizWord.article && quizIdx %2===0));
    const isFaQ = quizMode==='fa';
    let correct = false;
    let xpAdd = 0;
    if (isChoiceQ) {
      const correctAns = currentQuizWord.meaning_en || currentQuizWord.english;
      // choicePick is now object {en,fa} or string (backward compat)
      const pickedEn = typeof choicePick === 'object' ? choicePick.en : choicePick;
      correct = pickedEn === correctAns;
      xpAdd = correct ? QUIZ_XP.choice : 0;
    } else if (isArtikelQ) {
      correct = quizArtikelChoice === currentQuizWord.article;
      xpAdd = correct ? QUIZ_XP.artikel : 0;
    } else if (isFaQ) {
      const ans = quizAnswer.trim();
      const expected = (currentQuizWord.meaning_fa||'').trim();
      correct = ans === expected;
      xpAdd = correct ? QUIZ_XP.fa : 0;
    } else {
      const expected = currentQuizWord.german;
      const ans = quizAnswer.trim();
      const expNorm = expected.trim();
      const expFullNorm = (currentQuizWord.fullGerman||expected).trim();
      correct = ans === expNorm || ans === expFullNorm;
      if (!correct) correct = ans.toLowerCase() === expNorm.toLowerCase() || ans.toLowerCase() === expFullNorm.toLowerCase();
      xpAdd = correct ? QUIZ_XP.dictation : 0;
    }
    // record per-question attempt for the completion report (Issue #2)
    const attempt = { wordId: currentQuizWord.id, book: currentQuizWord.book || null, lektion: currentQuizWord.lektion || null, correct, xp: xpAdd, mode: quizMode };
    quizDetailRef.current = [...quizDetailRef.current, attempt];
    const q = qualityFromLabel(correct ? 'Good' : 'Again');
    const prev = progressMap[currentQuizWord.id] || { interval:0, repetition:0, ease:2.5, due:0, lapses:0 };
    const next = sm2(prev, q);
    if (authToken && authUser) {
      setProgressMap(m=> ({...m, [currentQuizWord.id]: {id: currentQuizWord.id, level: currentQuizWord.level, book: currentQuizWord.book, lektion: currentQuizWord.lektion, ...next }}));
      try { await saveProgressOne({ id: currentQuizWord.id, level: currentQuizWord.level, book: currentQuizWord.book, lektion: currentQuizWord.lektion, ...next }); } catch {}
    } else {
      await db.progress.put({ id: currentQuizWord.id, level: currentQuizWord.level, book: currentQuizWord.book, lektion: currentQuizWord.lektion, ...next });
      setProgressMap(m=> ({...m, [currentQuizWord.id]: {id: currentQuizWord.id, ...next }}));
    }
    if (!correct) setWeakIds(s=> { const n=new Set(s); n.add(currentQuizWord.id); return n; });
    if (xpAdd>0) {
      // XP only — streak credit lands when the quiz completion report persists
      // (finishQuizReport funnels through the shared streak layer).
      const latest = await applyLearningXp(xpAdd, 1);
      setStats(latest);
      if (authToken && authUser) {
        try { await saveStatsOnline(latest); } catch {}
        if (useOnline) submitOnlineScore(authUser.username, latest.xp).then(b=>{ if(b) setOnlineBoard(b); }).catch(()=>{});
      } else {
        if (useOnline && username) submitOnlineScore(username, latest.xp).then(b=>{ if(b) setOnlineBoard(b); }).catch(()=>{});
      }
    } else {
      // Wrong answers still count as a review; the streak day is credited when
      // the quiz completion report persists (finishQuizReport).
      const latest = await applyLearningXp(0, 1);
      setStats(latest);
      if (authToken && authUser) {
        try { await saveStatsOnline(latest); } catch {}
      }
    }
    setQuizScore(sc=> ({ correct: sc.correct + (correct?1:0), total: sc.total+1, xp: sc.xp + xpAdd }));
    setQuizFeedback({ correct, expected: currentQuizWord.article ? `${currentQuizWord.article} ${currentQuizWord.german}` : currentQuizWord.german, expectedFa: currentQuizWord.meaning_fa, expectedEn: currentQuizWord.meaning_en || currentQuizWord.english, xp: xpAdd });
    if (correct) { playCorrect(); if (xpAdd >= 10) setTimeout(() => playXp(), 160); } else playIncorrect();
    setToast(correct ? `+${xpAdd} XP` : `was "${currentQuizWord.article ? currentQuizWord.article+' '+currentQuizWord.german : currentQuizWord.german}"`);
    setTimeout(()=> setToast(null),1400);
  };

  // Build + persist the completion report (Issue #2). quizDetailRef is source of truth.
  const finishQuizReport = useCallback(() => {
    const list = quizDetailRef.current;
    const report = calcQuizReport(list);
    const bookLabel = (BOOKS.find((b) => b.id === quizBook) || {}).label || quizBook;
    setLastQuizReport({
      report,
      meta: {
        mode: quizMode,
        bookLabel,
        scopeLabel: `${bookLabel} ${quizLektions.length ? quizLektions.join(', ') : 'whole book'}`,
        timestamp: Date.now(),
        count: quizQueue.length,
      },
    });
    setShowQuizReport(true);
    if (list.length > 0) {
      const sessionId = quizSessionRef.current || `${Date.now()}-quiz`;
      const ts = Date.now();
      persistAttempts(list.map((a) => ({ ...a, sessionId, timestamp: ts, mode: a.mode || quizMode })));
    }
  }, [quizMode, quizBook, quizLektions, quizQueue.length, persistAttempts]);

  const nextQuiz = () => {
    primeAudio();
    if (nextLockRef.current) return;
    nextLockRef.current = true;
    setTimeout(()=> { nextLockRef.current = false; }, 600);
    // reset submission lock for next question
    quizSubmitLockRef.current = false;
    setQuizSubmitting(false);
    choiceProcessedRef.current = false;
    choiceWrongRef.current = 0;
    if (quizIdx +1 >= quizQueue.length) {
      setQuizFeedback(null);
      setQuizStarted(false);
      // reset choice states as well
      setChoiceEliminated(new Set());
      setChoiceCorrectLocked(false);
      setChoiceCorrectEn(null);
      setChoiceTransition('idle');
      setQuestionFade(false);
      const doneOk = quizScore.correct + (quizFeedback?.correct?1:0) > quizQueue.length / 2;
      if (doneOk) playQuizComplete(); else playGameOver();
      setToast(`Quiz done: ${quizScore.correct + (quizFeedback?.correct?1:0)}/${quizScore.total +1} • +${quizScore.xp + (quizFeedback?.xp||0)} XP`);
      setTimeout(()=> setToast(null),2000);
      quizProcessedIdxRef.current = -1;
      finishQuizReport();
      return;
    }
    const nextIdx = quizIdx +1;
    setQuizIdx(nextIdx);
    setQuizAnswer('');
    setQuizArtikelChoice('');
    setChoicePick('');
    setQuizFeedback(null);
    setChoiceEliminated(new Set());
    setChoiceCorrectLocked(false);
    setChoiceCorrectEn(null);
    setChoiceTransition('idle');
    setQuestionFade(false);
    setChoiceAnimKey(k=>k+1);
    quizProcessedIdxRef.current = -1;
    const w = quizQueue[nextIdx];
    if (quizMode === 'choice') {
      const { opts } = buildChoiceOptions(w, quizScopeWords);
      setChoiceOptions(opts);
    }
    const isArtikelNext = quizMode==='artikel' || (quizMode==='mixed' && w.article && nextIdx %2===0);
    if (!isArtikelNext && quizMode !== 'fa' && quizMode !== 'choice') setTimeout(()=> speakGerman(w.german), 250);
  };

  // Direct choice selection handler (new 4-choice behavior: correct => green + transition, wrong => gray eliminated)
  const handleChoiceSelect = async (opt) => {
    if (!currentQuizWord || quizMode !== 'choice') return;
    if (choiceTransition === 'exiting' || choiceCorrectLocked) return;
    const pickedEn = typeof opt === 'object' ? opt.en : opt;
    if (choiceEliminated.has(pickedEn)) return;
    if (choiceProcessedRef.current) return;
    const correctEn = currentQuizWord.meaning_en || currentQuizWord.english;
    const isCorrect = pickedEn === correctEn;
    const xpAdd = isCorrect ? QUIZ_XP.choice : 0;
    if (!isCorrect) {
      primeAudio();
      playIncorrect();
      choiceWrongRef.current += 1;
      setChoiceEliminated(prev => { const s = new Set(prev); s.add(pickedEn); return s; });
      setToast(`Not "${pickedEn}" — try another`);
      setTimeout(()=> setToast(null), 1100);
      return;
    }
    // correct path — lock immediately, award once
    if (choiceProcessedRef.current) return;
    choiceProcessedRef.current = true;
    // also lock general quiz submit guard
    quizSubmitLockRef.current = true;
    setQuizSubmitting(true);
    quizProcessedIdxRef.current = quizIdx;
    setChoiceCorrectLocked(true);
    setChoiceCorrectEn(correctEn);
    // record one attempt per question: correct only if solved at first try (Issue #2)
    const firstTry = choiceWrongRef.current === 0;
    const cAttempt = { wordId: currentQuizWord.id, book: currentQuizWord.book || null, lektion: currentQuizWord.lektion || null, correct: firstTry, xp: xpAdd, mode: 'choice' };
    quizDetailRef.current = [...quizDetailRef.current, cAttempt];
    primeAudio();
    playCorrect();
    if (xpAdd >= 8) setTimeout(()=> playXp(), 160);
    // SM2 & XP persistence (idempotent)
    const q = qualityFromLabel('Good');
    const prev = progressMap[currentQuizWord.id] || { interval:0, repetition:0, ease:2.5, due:0, lapses:0 };
    const next = sm2(prev, q);
    if (authToken && authUser) {
      setProgressMap(m=> ({...m, [currentQuizWord.id]: {id: currentQuizWord.id, level: currentQuizWord.level, book: currentQuizWord.book, lektion: currentQuizWord.lektion, ...next }}));
      try { await saveProgressOne({ id: currentQuizWord.id, level: currentQuizWord.level, book: currentQuizWord.book, lektion: currentQuizWord.lektion, ...next }); } catch {}
    } else {
      await db.progress.put({ id: currentQuizWord.id, level: currentQuizWord.level, book: currentQuizWord.book, lektion: currentQuizWord.lektion, ...next });
      setProgressMap(m=> ({...m, [currentQuizWord.id]: {id: currentQuizWord.id, ...next }}));
    }
    if (xpAdd > 0) {
      // XP only — streak credit lands with the quiz completion report.
      const latest = await applyLearningXp(xpAdd, 1);
      setStats(latest);
      if (authToken && authUser) {
        try { await saveStatsOnline(latest); } catch {}
        if (useOnline) submitOnlineScore(authUser.username, latest.xp).then(b=>{ if(b) setOnlineBoard(b); }).catch(()=>{});
      } else {
        if (useOnline && username) submitOnlineScore(username, latest.xp).then(b=>{ if(b) setOnlineBoard(b);}).catch(()=>{});
      }
    }
    setQuizScore(sc=> ({ correct: sc.correct+1, total: sc.total+1, xp: sc.xp + xpAdd }));
    // keep quizFeedback null for choice — we use choiceCorrectLocked UI instead, but set a minimal feedback for scoring on finish
    setQuizFeedback({ correct: true, expected: currentQuizWord.german, expectedEn: correctEn, expectedFa: currentQuizWord.meaning_fa, xp: xpAdd });
    setToast(`+${xpAdd} XP`);
    setTimeout(()=> setToast(null), 1200);
    // transition to next question after visible green period
    setTimeout(()=> {
      setQuestionFade(true);
      setChoiceTransition('exiting');
      setTimeout(async ()=> {
        if (quizIdx +1 >= quizQueue.length) {
          // finish quiz
          setQuizFeedback(null);
          setQuizStarted(false);
          setChoiceEliminated(new Set());
          setChoiceCorrectLocked(false);
          setChoiceCorrectEn(null);
          setChoiceTransition('idle');
          setQuestionFade(false);
          quizSubmitLockRef.current = false;
          setQuizSubmitting(false);
          choiceProcessedRef.current = false;
          quizProcessedIdxRef.current = -1;
          // compute final score including this correct
          const finalCorrect = quizScore.correct + 1;
          const finalTotal = quizScore.total + 1;
          const finalXp = quizScore.xp + xpAdd;
          const doneOk = finalCorrect > quizQueue.length / 2;
          if (doneOk) playQuizComplete(); else playGameOver();
          setToast(`Quiz done: ${finalCorrect}/${quizQueue.length} • +${finalXp} XP`);
          setTimeout(()=> setToast(null), 2200);
          finishQuizReport();
          return;
        }
        const nextIdx = quizIdx + 1;
        setQuizIdx(nextIdx);
        setChoiceEliminated(new Set());
        setChoiceCorrectLocked(false);
        setChoiceCorrectEn(null);
        setChoicePick('');
        // keep feedback null for next question's tiles; but preserve score
        // reset submission lock for next question
        quizSubmitLockRef.current = false;
        setQuizSubmitting(false);
        choiceProcessedRef.current = false;
        choiceWrongRef.current = 0;
        quizProcessedIdxRef.current = -1;
        const w = quizQueue[nextIdx];
        if (w) {
          const { opts } = buildChoiceOptions(w, quizScopeWords);
          setChoiceOptions(opts);
          setChoiceAnimKey(k=>k+1);
          setQuestionFade(false);
          setChoiceTransition('returning');
          // after side-return animation, go idle
          setTimeout(()=> setChoiceTransition('idle'), 520);
        } else {
          setQuestionFade(false);
          setChoiceTransition('idle');
        }
        // do not call speak for choice
      }, 400);
    }, 900);
  };

  const insertUmlaut = (ch) => setQuizAnswer(a=> a + ch);

  // ---- Games ----
  const startMatchGame = useCallback(() => {
    quizSessionRef.current = `${Date.now()}-match-${Math.random().toString(36).slice(2, 6)}`;
    const basePool = quizScopeWords.length >= 6 ? quizScopeWords : allWords;
    // Filter out long educational sentences for vocab Match Dash — keep vocab-like only, fallback to basePool if not enough
    const vocabFiltered = filterVocabForGames(basePool);
    const pool = vocabFiltered.length >= 6 ? vocabFiltered : basePool;
    // Shared selector: eligible first (weak/new prioritized), capped-strong fallback.
    const { eligible, capped } = partitionPool(pool, selectionCtx);
    const balanced = selectGameSet(eligible, 6, shuffleArray);
    const picks = takeUpTo(balanced, orderFallback(capped), 6);
    // Create left (DE) and right (EN+FA) tiles and shuffle each column independently
    const leftTiles = [];
    const rightTiles = [];
    picks.forEach((w) => {
      const displayGerman = getVocabDisplayGerman(w);
      leftTiles.push({ uid: `${w.id}-de`, pairId: w.id, label: w.article ? `${w.article} ${displayGerman}` : displayGerman, sub: w.plural ? `Pl: ${w.plural}` : w.lektion, type:'de', word:w, matched:false, flipped:false });
      rightTiles.push({ uid: `${w.id}-tr`, pairId: w.id, label: w.meaning_en || w.english, sub: w.meaning_fa || '', sub2: w.lektion, type:'tr', word:w, matched:false, flipped:false });
    });
    const shuffledLeft = shuffleArray(leftTiles);
    const shuffledRight = shuffleArray(rightTiles);
    const tiles = [...shuffledLeft, ...shuffledRight];
    setMatchBoard(tiles);
    setMatchPicks([]);
    setMatchMatched(0);
    setMatchMoves(0);
    setMatchXp(0);
    setMatchDone(false);
    setMatchStarted(true);
    setMatchFadingIds(new Set());
    setMatchShakeIds(new Set());
    setMatchWrongIds(new Set());
    setMatchHiddenIds(new Set());
    setQuizMode('match');
    setQuizStarted(true);
  }, [quizScopeWords, allWords, selectionCtx]);

  const handleMatchPick = (uid) => {
    primeAudio();
    playTap();
    if (matchDone) return;
    if (matchFadingIds.size > 0 || matchShakeIds.size > 0) return;
    const tile = matchBoard.find(t=> t.uid===uid);
    if (!tile || tile.matched || tile.flipped) return;
    if (matchPicks.length >= 2) return;
    const nextBoard = matchBoard.map(t=> t.uid===uid ? {...t, flipped:true} : t);
    const nextPicks = [...matchPicks, uid];
    setMatchBoard(nextBoard);
    setMatchPicks(nextPicks);
    if (nextPicks.length === 2) {
      setMatchMoves(m=> m+1);
      const [a,b] = nextPicks.map(id=> nextBoard.find(t=> t.uid===id));
      const isMatch = a.pairId === b.pairId && a.type !== b.type;
      if (isMatch) {
        // Correct: briefly show green, then fade out, then slide remaining up
        playMatchPair();
        // Record the exposure (xp 0 — game XP is awarded once at completion).
        if (a.word) {
          persistAttempts([{ sessionId: quizSessionRef.current || `${Date.now()}-match`, timestamp: Date.now(), wordId: a.word.id, book: a.word.book || null, lektion: a.word.lektion || null, correct: true, xp: 0, mode: 'match' }]);
        }
        // Mark as matched to show green border (but not yet fading)
        const withMatched = nextBoard.map(t=> (t.uid===a.uid || t.uid===b.uid) ? {...t, matched:true} : t);
        // Keep board with green for brief moment
        setTimeout(()=> setMatchBoard(withMatched), 10);
        setTimeout(()=> {
          // Start fade after 360ms — smooth opacity decrease
          setMatchFadingIds(new Set([a.uid, b.uid]));
          // After fade (400ms), hide collapsed → remaining cards slide up once
          setTimeout(()=> {
            setMatchFadingIds(new Set());
            setMatchHiddenIds(prev=> { const s=new Set(prev); s.add(a.uid); s.add(b.uid); return s; });
            // keep matched tiles in board but they will collapse to height 0 via hidden (slide-up)
            const xpAdd = GAME_XP.matchPair;
            setMatchXp(x=> x + xpAdd);
            setMatchMatched(v=> {
              const nv = v + 1;
              if (nv === 6) {
                const bonus = GAME_XP.matchPerfectBonus + Math.max(0, 12 - matchMoves) ;
                const totalAward = 6 * GAME_XP.matchPair + bonus;
                setMatchXp(totalAward);
                setMatchDone(true);
                setTimeout(() => { playGameWin(); awardGameXP(totalAward, 6); }, 420);
              }
              return nv;
            });
            setMatchPicks([]);
          }, 400);
        }, 360);
      } else {
        // Wrong: show red + shake, then reset
        playIncorrect();
        setMatchWrongIds(new Set([a.uid, b.uid]));
        setMatchShakeIds(new Set([a.uid, b.uid]));
        setTimeout(()=> {
          setMatchShakeIds(new Set());
          setMatchWrongIds(new Set());
          setMatchBoard(prev=> prev.map(t=> nextPicks.includes(t.uid) ? {...t, flipped:false} : t));
          setMatchPicks([]);
        }, 520);
      }
    }
  };

  const awardGameXP = async (xpAdd, reviews=1) => {
    if (xpAdd<=0) return;
    // XP only — game streak credit already landed via the per-action attempt
    // persists (match/sprint/satz/rain all funnel through persistAttempts).
    // This also fixes the old anon path, which never advanced the streak.
    const latest = await applyLearningXp(xpAdd, reviews);
    setStats(latest);
    if (authToken && authUser) {
      try { await saveStatsOnline(latest); } catch {};
      if (useOnline) submitOnlineScore(authUser.username, latest.xp).then(b=>{ if(b) setOnlineBoard(b);}).catch(()=>{});
    } else {
      if (useOnline && username) submitOnlineScore(username, latest.xp).then(b=>{ if(b) setOnlineBoard(b);}).catch(()=>{});
    }
    setToast(`+${xpAdd} XP`);
    setTimeout(()=> setToast(null),1800);
  };

  const startSprintGame = useCallback((count=12) => {
    quizSessionRef.current = `${Date.now()}-sprint-${Math.random().toString(36).slice(2, 6)}`;
    const basePool = quizScopeWords.length >= count ? quizScopeWords : allWords;
    const vocabFiltered = filterVocabForGames(basePool);
    const pool = vocabFiltered.length >= count ? vocabFiltered : basePool;
    // Shared selector: eligible first (weak/new prioritized), capped-strong fallback.
    const { eligible, capped } = partitionPool(pool, selectionCtx);
    const balanced = selectGameSet(eligible, count, shuffleArray);
    const picks = takeUpTo(balanced, orderFallback(capped), count);
    const queue = picks.map(w=> {
      const correct = { en: w.meaning_en || w.english, fa: w.meaning_fa || '' };
      const distractors = selectPlausibleDistractors(w, pool, 3);
      const opts=shuffleArray([...distractors, correct]);
      return { word:w, correct, opts };
    });
    const shuffledQueue = shuffleIfMulti(quizLektions, queue);
    setSprintQueue(shuffledQueue);
    setSprintIdx(0);
    setSprintOptions(shuffledQueue[0]?.opts || []);
    setSprintScore({ correct:0, total:0, streak:0, best:0, xp:0 });
    setSprintActive(true);
    setSprintTime(45);
    setSprintFeedback(null);
    setQuizMode('sprint');
    setQuizStarted(true);
  }, [quizScopeWords, allWords, quizLektions, selectionCtx]);

  const sprintTimerRef = useRef(null);
  const sprintScoreRef = useRef(sprintScore);
  useEffect(()=> { sprintScoreRef.current = sprintScore; }, [sprintScore]);
  useEffect(()=> {
    if (!sprintActive) { if (sprintTimerRef.current) clearInterval(sprintTimerRef.current); return; }
    sprintTimerRef.current = setInterval(()=> {
      setSprintTime(t=> {
        if (t<=1) {
          clearInterval(sprintTimerRef.current);
          setSprintActive(false);
          const final = sprintScoreRef.current;
          if (final.xp>0) { playGameWin(); awardGameXP(final.xp, final.total); } else playGameOver();
          setToast(`Sprint done: ${final.correct}/${final.total} • +${final.xp} XP`);
          setTimeout(()=> setToast(null),2200);
          return 0;
        }
        return t-1;
      });
    },1000);
    return ()=> clearInterval(sprintTimerRef.current);
  }, [sprintActive]);

  const handleSprintPick = (opt) => {
    primeAudio();
    if (!sprintActive || sprintFeedback) return;
    const cur = sprintQueue[sprintIdx];
    const optEn = typeof opt === 'object' ? opt.en : opt;
    const correctEn = typeof cur.correct === 'object' ? cur.correct.en : cur.correct;
    const correct = optEn === correctEn;
    if (correct) { playCorrect(); if ((sprintScore.streak+1) % 3 === 0) setTimeout(() => playStreak(), 120); } else playIncorrect();
    const streak = correct ? sprintScore.streak + 1 : 0;
    const mult = Math.min(2, 1 + streak*0.15);
    const xpAdd = correct ? Math.round(GAME_XP.sprintBase * mult) : 0;
    // record for book-level accuracy history (Issue #2); Sprint always advances so every pick counts
    if (cur?.word) {
      persistAttempts([{ sessionId: quizSessionRef.current || `${Date.now()}-sprint`, timestamp: Date.now(), wordId: cur.word.id, book: cur.word.book || null, lektion: cur.word.lektion || null, correct, xp: xpAdd, mode: 'sprint' }]);
    }
    setSprintFeedback({ correct, expected: cur.correct, xp: xpAdd });
    setSprintScore(s=> ({ correct: s.correct + (correct?1:0), total: s.total+1, streak, best: Math.max(s.best, streak), xp: s.xp + xpAdd }));
    setTimeout(()=> {
      setSprintFeedback(null);
      if (sprintIdx +1 >= sprintQueue.length) {
        const basePool = quizScopeWords.length >=8 ? quizScopeWords : allWords;
        const vocabFilteredRefill = filterVocabForGames(basePool);
        const pool = vocabFilteredRefill.length >= 8 ? vocabFilteredRefill : basePool;
        const { eligible: e2, capped: c2 } = partitionPool(pool, selectionCtx);
        const picks = takeUpTo(selectGameSet(e2, 8, shuffleArray), orderFallback(c2), 8);
        const more = shuffleArray(picks).map(w=> {
          const c={ en: w.meaning_en||w.english, fa: w.meaning_fa||''};
          const distractors = selectPlausibleDistractors(w, pool, 3);
          const o=shuffleArray([...distractors, c]);
          return {word:w, correct:c, opts:o};
        });
        const newQ=[...sprintQueue, ...more];
        setSprintQueue(newQ);
        setSprintIdx(i=> i+1);
        setSprintOptions(newQ[sprintIdx+1]?.opts || []);
      } else {
        setSprintIdx(i=> i+1);
        setSprintOptions(sprintQueue[sprintIdx+1]?.opts || []);
      }
    }, 700);
  };

  // ===== NEW GAME: SatzBau — Sentence Forge =====
  const startSatzGame = useCallback((count=8) => {
    quizSessionRef.current = `${Date.now()}-satz-${Math.random().toString(36).slice(2, 6)}`;
    const pool = quizScopeWords.length >= 8 ? quizScopeWords : allWords;
    // Use german field for sentences — example is empty in new dataset; preserve educational sentences intact
    const withSentences = pool.filter(w=> {
      const g = w.german || '';
      const tokens = g.replace(/[.!?،؟]/g,'').split(' ').filter(Boolean);
      return tokens.length >= 4 && tokens.length <= 12 && isEducationalSentence(w);
    });
    const effectiveWithSentences = withSentences.length >= 4 ? withSentences : pool.filter(w=> {
      const g = (w.example || w.german || '');
      const tokens = g.replace(/[.!?،؟]/g,'').split(' ').filter(Boolean);
      return tokens.length >= 4 && tokens.length <= 12;
    });
    // Shared selector over sentence items (word-associated; items without a
    // word id stay eligible and are never counted as exposures).
    const { eligible, capped } = partitionPool(effectiveWithSentences, selectionCtx);
    const balanced = selectGameSet(eligible, count, shuffleArray);
    const picks = takeUpTo(balanced, orderFallback(capped), count);
    if (picks.length < 4) {
      setToast('Not enough sentences in this scope — try whole book');
      setTimeout(()=> setToast(null),1800); return;
    }
    const queue = shuffleArray(picks).map(w=> {
      const source = (w.example && w.example.trim()) ? w.example : w.german;
      const tokens = source.replace(/[.!?،؟]/g,'').split(' ').filter(Boolean);
      const shuffled = shuffleArray(tokens);
      return { word:w, tokens, shuffled, hintEn: w.meaning_en || w.english, hintFa: w.meaning_fa || '', source };
    });
    setSatzQueue(queue);
    setSatzIdx(0);
    setSatzBuilt([]);
    setSatzPool(queue[0].shuffled);
    setSatzScore({ correct:0, total:0, xp:0 });
    setSatzFeedback(null);
    setSatzActive(true);
    setQuizMode('satz');
    setQuizStarted(true);
  }, [quizScopeWords, allWords, selectionCtx]);

  const handleSatzPick = (token, idx) => {
    primeAudio();
    playTap();
    if (satzFeedback?.correct) return;
    if (satzFeedback && !satzFeedback.correct) setSatzFeedback(null);
    setSatzBuilt(b=> [...b, token]);
    setSatzPool(p=> p.filter((_,i)=> i!==idx));
  };
  const handleSatzRemove = (idx) => {
    primeAudio();
    playTap();
    if (satzFeedback?.correct) return;
    if (satzFeedback && !satzFeedback.correct) setSatzFeedback(null);
    const tok = satzBuilt[idx];
    setSatzBuilt(b=> b.filter((_,i)=> i!==idx));
    setSatzPool(p=> [...p, tok]);
  };
  const checkSatz = () => {
    primeAudio();
    const cur = satzQueue[satzIdx];
    const builtStr = satzBuilt.join(' ');
    const correctStr = cur.tokens.join(' ');
    const correct = builtStr.trim() === correctStr.trim();
    // Record every check as an appearance (xp only on solve; game XP is awarded via awardGameXP).
    if (cur?.word) {
      persistAttempts([{ sessionId: quizSessionRef.current || `${Date.now()}-satz`, timestamp: Date.now(), wordId: cur.word.id, book: cur.word.book || null, lektion: cur.word.lektion || null, correct, xp: 0, mode: 'satz' }]);
    }
    if (correct) {
      const xpAdd = GAME_XP.scramblePerWord + Math.max(0, 8 - satzBuilt.length);
      const perPos = cur.tokens.map((_,i)=> true);
      setSatzFeedback({ correct:true, expected: correctStr, xp: xpAdd, perPos, built:[...satzBuilt] });
      setSatzScore(s=> ({ correct: s.correct+1, total: s.total+1, xp: s.xp + xpAdd }));
      playCorrect();
      if (xpAdd>0) setTimeout(()=> { playXp(); awardGameXP(xpAdd,1); }, 300);
      setTimeout(()=> {
        setSatzFeedback(null);
        if (satzIdx +1 >= satzQueue.length) {
          setSatzActive(false);
          playGameWin();
          setToast(`Forge done: ${satzScore.correct+1}/${satzQueue.length} • +${satzScore.xp + xpAdd} XP`);
          setTimeout(()=> setToast(null),2000);
        } else {
          const ni = satzIdx +1;
          setSatzIdx(ni);
          setSatzBuilt([]);
          setSatzPool(satzQueue[ni].shuffled);
        }
      }, 1800);
    } else {
      const perPos = satzBuilt.map((tok,i)=> tok === cur.tokens[i]);
      // also mark missing/extra as incorrect
      setSatzFeedback({ correct:false, expected: correctStr, xp:0, perPos, built:[...satzBuilt] });
      setSatzScore(s=> ({ ...s, total: s.total+1 }));
      playIncorrect();
    }
  };

  // ===== NEW GAME: WortSturm — Word Rain =====
  const startRainGame = useCallback((count=12) => {
    quizSessionRef.current = `${Date.now()}-rain-${Math.random().toString(36).slice(2, 6)}`;
    const basePool = quizScopeWords.length >= count ? quizScopeWords : allWords;
    const vocabFiltered = filterVocabForGames(basePool);
    const pool = vocabFiltered.length >= count ? vocabFiltered : basePool;
    // Shared selector: eligible first (weak/new prioritized), capped-strong fallback.
    const { eligible, capped } = partitionPool(pool, selectionCtx);
    const balanced = selectGameSet(eligible, count, shuffleArray);
    const picks = takeUpTo(balanced, orderFallback(capped), count);
    const queue = shuffleArray(picks).map(w=> {
      const correct = { en: w.meaning_en || w.english, fa: w.meaning_fa || '' };
      const distractors = selectPlausibleDistractors(w, pool, 2);
      const opts=shuffleArray([...distractors, correct]);
      return { word:w, correct, opts };
    });
    setRainQueue(queue);
    setRainIdx(0);
    setRainOptions(queue[0]?.opts||[]);
    setRainScore({ correct:0, total:0, streak:0, best:0, xp:0 });
    setRainLives(3);
    setRainTime(6);
    setRainFeedback(null);
    setRainActive(true);
    setQuizMode('rain');
    setQuizStarted(true);
  }, [quizScopeWords, allWords, selectionCtx]);

  const rainTimerRef = useRef(null);
  const rainScoreRef = useRef(rainScore);
  const rainTimeRef = useRef(rainTime);
  useEffect(()=> { rainScoreRef.current = rainScore; }, [rainScore]);
  useEffect(()=> { rainTimeRef.current = rainTime; }, [rainTime]);
  useEffect(()=> {
    if (!rainActive) { if (rainTimerRef.current) clearInterval(rainTimerRef.current); return; }
    rainTimerRef.current = setInterval(()=> {
      setRainTime(t=>{
        if (t<=1) {
          // timeout — lose life
          primeAudio();
          playIncorrect();
          const cur = rainQueue[rainIdx];
          setRainFeedback({ correct:false, expected: cur?.correct, timeout:true });
          setRainScore(s=> ({ ...s, total: s.total+1, streak:0 }));
          setRainLives(l=> {
            const nl = l-1;
            if (nl<=0) {
              clearInterval(rainTimerRef.current);
              setRainActive(false);
              const final = { ...rainScoreRef.current, total: rainScoreRef.current.total+1 };
              if (final.xp>0) { playGameOver(); awardGameXP(final.xp, final.total); } else playGameOver();
              setToast(`Storm ended: ${final.correct}/${final.total} • +${final.xp} XP`);
              setTimeout(()=> setToast(null),2200);
            }
            return nl;
          });
          setTimeout(()=> {
            setRainFeedback(null);
            if (rainIdx+1 < rainQueue.length && rainTimeRef.current!==0) {
              // but we will handle next via lives check — if lives>0 continue
              if (rainLives >1) {
                setRainIdx(i=> i+1);
                setRainOptions(rainQueue[rainIdx+1]?.opts||[]);
                setRainTime(6);
              }
            } else {
              // if lives remain but queue exhausted, refill
              const basePool2 = quizScopeWords.length>=8 ? quizScopeWords : allWords;
              const vocabFiltered2 = filterVocabForGames(basePool2);
              const pool = vocabFiltered2.length>=8 ? vocabFiltered2 : basePool2;
              const { eligible: e3, capped: c3 } = partitionPool(pool, selectionCtxRef.current);
              const picks = takeUpTo(selectGameSet(e3, 6, shuffleArray), orderFallback(c3), 6);
              const more=shuffleArray(picks).map(w=> {
                const c={en:w.meaning_en||w.english, fa:w.meaning_fa||''};
                const distractors = selectPlausibleDistractors(w, pool, 2);
                const o=shuffleArray([...distractors, c]);
                return {word:w, correct:c, opts:o};
              });
              setRainQueue(q=> [...q, ...more]);
              setRainIdx(i=> i+1);
              setRainOptions(more[0]?.opts||[]);
              setRainTime(6);
            }
          }, 900);
          return 6;
        }
        return t-1;
      });
    },1000);
    return ()=> clearInterval(rainTimerRef.current);
  }, [rainActive, rainQueue, rainIdx, rainLives, quizScopeWords, allWords]);

  const handleRainPick = (opt) => {
    primeAudio();
    if (!rainActive || rainFeedback) return;
    const cur = rainQueue[rainIdx];
    const optEn = typeof opt==='object'? opt.en : opt;
    const correctEn = typeof cur.correct==='object'? cur.correct.en : cur.correct;
    const correct = optEn===correctEn;
    if (correct) { playCorrect(); if ((rainScore.streak+1) % 4 === 0) playStreak(); } else playIncorrect();
    const streak = correct ? rainScore.streak+1 : 0;
    const mult = Math.min(2, 1 + streak*0.12);
    const xpAdd = correct ? Math.round(6*mult) : 0;
    // record for book-level accuracy history (Issue #2)
    if (cur?.word) {
      persistAttempts([{ sessionId: quizSessionRef.current || `${Date.now()}-rain`, timestamp: Date.now(), wordId: cur.word.id, book: cur.word.book || null, lektion: cur.word.lektion || null, correct, xp: xpAdd, mode: 'rain' }]);
    }
    setRainFeedback({ correct, expected: cur.correct, xp: xpAdd });
    setRainScore(s=> ({ correct: s.correct + (correct?1:0), total: s.total+1, streak, best: Math.max(s.best, streak), xp: s.xp + xpAdd }));
    if (!correct) setRainLives(l=> l-1);
    setTimeout(()=> {
      setRainFeedback(null);
      if (!correct && rainLives-1 <=0) {
        clearInterval(rainTimerRef.current);
        setRainActive(false);
        const final = { ...rainScore, correct: rainScore.correct + (correct?1:0), total: rainScore.total+1, xp: rainScore.xp + xpAdd };
        if (final.xp>0) { playGameOver(); awardGameXP(final.xp, final.total); } else playGameOver();
        setToast(`Storm ended: ${final.correct}/${final.total} • +${final.xp} XP`);
        setTimeout(()=> setToast(null),2200);
        return;
      }
      if (rainIdx+1 >= rainQueue.length) {
        const basePool3 = quizScopeWords.length>=8 ? quizScopeWords : allWords;
        const vocabFiltered3 = filterVocabForGames(basePool3);
        const pool = vocabFiltered3.length>=8 ? vocabFiltered3 : basePool3;
        const { eligible: e4, capped: c4 } = partitionPool(pool, selectionCtx);
        const picks = takeUpTo(selectGameSet(e4, 6, shuffleArray), orderFallback(c4), 6);
        const more=shuffleArray(picks).map(w=> {
          const c={en:w.meaning_en||w.english, fa:w.meaning_fa||''};
          const distractors = selectPlausibleDistractors(w, pool, 2);
          const o=shuffleArray([...distractors, c]);
          return {word:w, correct:c, opts:o};
        });
        const nq=[...rainQueue, ...more];
        setRainQueue(nq);
        setRainIdx(i=> i+1);
        setRainOptions(nq[rainIdx+1]?.opts||[]);
        setRainTime(6);
      } else {
        setRainIdx(i=> i+1);
        setRainOptions(rainQueue[rainIdx+1]?.opts||[]);
        setRainTime(6);
      }
    }, 800);
  };

  // custom add - now book/lektion aware
  const handleAddCard = async () => {
    if (!newCard.german.trim() || !newCard.english.trim()) {
      setToast('German and English required');
      setTimeout(()=> setToast(null),1500);
      return;
    }
    const isNoun = !!newCard.article;
    const pos = isNoun ? 'noun' : 'other';
    try {
      const w = await addCustomWord({ german: newCard.german.trim(), english: newCard.english.trim(), article: newCard.article || null, plural: newCard.plural.trim(), level: newCard.level || 'Custom', book: newCard.book || selectedBook, lektion: newCard.lektion || (selectedLektions[0] || 'Lektion 1'), example: newCard.example.trim() || `Ich lerne "${newCard.german}".`, exampleEn: newCard.exampleEn.trim() || `I learn "${newCard.english}".`, pos, meaning_fa: newCard.englishFa.trim() });
      const updated = await getAllWords();
      setAllWords(updated);
      setShowAdd(false);
      setNewCard({ german: '', english: '', englishFa: '', article: '', plural: '', level: 'Custom', book: '', lektion: '', example: '', exampleEn: '' });
      setToast(`Added "${w.german}"`);
      setTimeout(()=> setToast(null),1500);
    } catch (e) {
      setToast('Failed to add');
      setTimeout(()=> setToast(null),1500);
    }
  };

  const handleDeleteCustom = async (id) => {
    await deleteCustomWord(id);
    const updated = await getAllWords();
    setAllWords(updated);
    setToast('Deleted');
    setTimeout(()=> setToast(null),1200);
  };

  const handleSignup = async () => {
    try {
      const { username, email, password } = authForm;
      if (!username || !password) { setToast('Username and password required'); setTimeout(()=> setToast(null),1500); return; }
      const res = await signup(username.trim(), email.trim(), password);
      setAuthUser(res.user);
      setAuthToken(res.token);
      setUsername(res.user.username);
      localStorage.setItem('gs_username', res.user.username);
      localStorage.setItem('gs_token', res.token);
      setShowAuth(false);
      setAuthForm({ username: '', email: '', password: '' });
      setToast(`Welcome ${res.user.username}`);
      setTimeout(()=> setToast(null),1500);
      try {
        if (Object.keys(progressMap).length > 0) await saveProgress(progressMap);
        await saveStatsOnline(stats);
        if (stats.xp > 0) await submitOnlineScore(res.user.username, stats.xp);
      } catch {}
      const b = await fetchOnlineLeaderboard(); if (b) { setOnlineBoard(b); setUseOnline(true); }
    } catch (e) { setToast(e.message || 'Signup failed'); setTimeout(()=> setToast(null),1500); }
  };
  const handleLogin = async () => {
    try {
      const { username, password } = authForm;
      const res = await login(username.trim(), password);
      setAuthUser(res.user);
      setAuthToken(res.token);
      localStorage.setItem('gs_token', res.token);
      setUsername(res.user.username);
      localStorage.setItem('gs_username', res.user.username);
      setShowAuth(false);
      setAuthForm({ username: '', email: '', password: '' });
      setToast(`Logged in as ${res.user.username}`);
      setTimeout(()=> setToast(null),1500);
      try {
        const serverStats = await fetchStatsOnline();
        if (serverStats && serverStats.xp > stats.xp) {
          setStats(serverStats);
          await db.stats.put({ id: 'main', ...serverStats });
        } else if (stats.xp > (serverStats?.xp||0)) {
          await saveStatsOnline(stats);
          await submitOnlineScore(res.user.username, stats.xp);
        }
        try {
          const serverStreak = await fetchStreakState();
          if (serverStreak?.ok) {
            const merged = await mergeServerStreak(serverStreak);
            if (merged?.stats) setStats(merged.stats);
          }
        } catch {}
        const serverProg = await fetchProgress();
        if (!serverProg || Object.keys(serverProg).length===0) {
          if (Object.keys(progressMap).length>0) await saveProgress(progressMap);
        }
      } catch {}
      const b = await fetchOnlineLeaderboard(); if (b) { setOnlineBoard(b); setUseOnline(true); }
      if (res.user.isAdmin) {
        try { const users = await fetchUsers(); setUsersList(users); } catch {}
      }
    } catch (e) { setToast(e.message || 'Login failed'); setTimeout(()=> setToast(null),1500); }
  };
  const handleLogout = () => {
    logout();
    setAuthUser(null);
    setAuthToken('');
    setToast('Logged out');
    setTimeout(()=> setToast(null),1200);
  };
  const loadUsersList = async () => {
    try {
      const users = await fetchUsers();
      setUsersList(users);
    } catch (e) { setToast('Admin only'); setTimeout(()=> setToast(null),1500); }
  };

  // keep active tab visible on mobile (navbar indicator scroll) — must be before early return per Rules of Hooks
  useEffect(() => {
    const el = document.querySelector('[role="tab"][aria-selected="true"]');
    if (el && el.scrollIntoView) {
      try {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } catch {}
    }
  }, [activeKey]);

  // === Quiz report navigation (Issue #2): reuse tab + scope routing ===
  const retakeQuiz = () => {
    if (!lastQuizReport) return;
    const count = lastQuizReport.meta?.count || quizQueue.length || 10;
    const mode = lastQuizReport.meta?.mode || quizMode;
    setShowQuizReport(false);
    setLastQuizReport(null);
    startQuiz(mode, count);
  };
  const practiceReportLektion = (lektion) => {
    const w = allWords.find((x) => x.lektion === lektion);
    const book = w?.book || quizBook;
    setQuizBook(book);
    setQuizLektions([lektion]);
    setShowQuizReport(false);
    setActiveKey('2');
  };
  const goWeakFromReport = () => {
    setShowQuizReport(false);
    setActiveKey('4');
  };
  const goBookFromQuiz = (bookId) => {
    const target = bookId || quizBook;
    setSelectedBook(target);
    setBookView(target);
    setActiveKey('0');
  };

  if (!dbReady) return <SplashScreen phase="visible" />;

  const selectedBookMeta = BOOKS.find(b=> b.id===selectedBook);
  const quizBookMeta = BOOKS.find(b=> b.id===quizBook);

  const handleDiscardPack = () => {
    setShowPackSummary(false);
    setPackAnswers([]);
    setPendingProgress({});
    startNewPack();
  };

  return (
    <HeadingLevel>
      {splashPhase !== 'hidden' && (
        <SplashScreen
          phase={splashPhase}
          action={isFirstLaunch && splashCanContinue ? { label: "Los geht's", onClick: handleSplashContinue } : null}
        />
      )}
      <Header stats={stats} authUser={authUser} onAdd={()=> setShowAdd(true)} onLogout={handleLogout} setShowAuth={setShowAuth} setAuthMode={setAuthMode} setActiveKey={setActiveKey} />
      <PWAUpdater />
      {toast && (
        <Block overrides={{ Block: { style: { position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 } } }}>
          <Notification overrides={{ Body: { style: { backgroundColor: '#000', color: '#fff', borderRadius: '999px', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '16px', paddingRight: '16px', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' } } }}>
            <span style={{ display: 'inline-flex', flexShrink: 0 }}><CheckCircle2 size={16} aria-hidden="true" /></span>
            <span>{toast}</span>
          </Notification>
        </Block>
      )}

      <AddCardModal show={showAdd} onClose={()=> setShowAdd(false)} newCard={newCard} setNewCard={setNewCard} onAdd={handleAddCard} selectedBookMeta={selectedBookMeta} selectedLektions={selectedLektions} />
      <AuthModal show={showAuth} onClose={()=> setShowAuth(false)} authMode={authMode} setAuthMode={setAuthMode} authForm={authForm} setAuthForm={setAuthForm} onLogin={handleLogin} onSignup={handleSignup} />

      <Block maxWidth="620px" width="100%" margin="0 auto" padding="0 16px 100px">
        <Tabs
          activeKey={activeKey}
          onChange={({ activeKey }) => setActiveKey(activeKey)}
          overrides={{
            Root: { props: { className: 'gs-tabs' } },
            TabBar: {
              style: {
                backgroundColor: '#fff',
                borderRadius: 0,
                paddingTop: 0,
                paddingBottom: 0,
                paddingLeft: 0,
                paddingRight: 0,
                marginTop: '16px',
                overflowX: 'auto',
                overflowY: 'hidden',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
                scrollBehavior: 'smooth',
                display: 'flex',
                flexWrap: 'nowrap',
                alignItems: 'center',
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                borderBottomColor: '#e9e8f0',
              },
              props: { className: 'gs-tabs-bar' },
            },
            TabList: {
              style: {
                gap: '24px',
                paddingBottom: 0,
                marginBottom: 0,
                overflow: 'visible',
              },
            },
            Tab: {
              style: ({ $active }) => ({
                backgroundColor: 'transparent',
                color: $active ? '#0f0f12' : '#9aa0b2',
                fontWeight: $active ? 800 : 600,
                fontSize: '13px',
                lineHeight: '14px',
                flex: '0 0 auto',
                whiteSpace: 'nowrap',
                paddingTop: '14px',
                paddingBottom: '14px',
                paddingLeft: '4px',
                paddingRight: '4px',
                borderRadius: 0,
                borderWidth: 0,
                borderStyle: 'none',
                borderColor: 'transparent',
                boxShadow: 'none',
                transform: 'none',
                opacity: 1,
                transitionProperty: 'color',
                transitionDuration: '200ms',
                transitionTimingFunction: 'ease',
                scrollMarginLeft: '16px',
                scrollMarginRight: '16px',
                ':hover': { backgroundColor: 'transparent', color: $active ? '#0f0f12' : '#6b6b7a' },
              }),
            },
            TabHighlight: {
              style: {
                backgroundColor: '#000',
                height: '3px',
                borderRadius: '999px',
                bottom: '-1px',
                display: 'block',
                transitionDuration: '520ms',
                transitionTimingFunction: 'cubic-bezier(0.68, -0.60, 0.32, 1.60)',
                zIndex: 2,
              },
            },
            TabBorder: { style: { display: 'none', backgroundColor: 'transparent', height: '1px' } },
          }}
        >
          <Tab title={<NavLabel icon={BookOpen} label="Bücher" />}>
            <Block paddingTop="16px">
              <BuecherTab selectedBook={selectedBook} setSelectedBook={setSelectedBook} selectedLektions={selectedLektions} setSelectedLektions={setSelectedLektions} bookView={bookView} setBookView={setBookView} allWords={allWords} progressMap={progressMap} scopeWords={scopeWords} setActiveKey={setActiveKey} setQuizBook={setQuizBook} setQuizLektions={setQuizLektions} selectedBookMeta={selectedBookMeta} quizHistory={quizHistory} historyLoading={historyLoading} historyError={historyError} onReloadHistory={reloadHistory} />
            </Block>
          </Tab>
          <Tab title={<NavLabel icon={GraduationCap} label="Lernen" />}>
            <Block paddingTop="16px">
              <LernenTab selectedBook={selectedBook} setSelectedBook={setSelectedBook} selectedLektions={selectedLektions} setSelectedLektions={setSelectedLektions} selectedBookMeta={selectedBookMeta} scopeWords={scopeWords} weakForScope={weakForScope} studyQueue={studyQueue} packSize={packSize} setPackSize={setPackSize} packWords={packWords} packIdx={packIdx} packAnswers={packAnswers} showPackSummary={showPackSummary} flipped={flipped} setFlipped={setFlipped} listening={listening} setListening={setListening} transcript={transcript} setTranscript={setTranscript} handlePackSwipe={handlePackSwipe} handlePackRate={handlePackRate} startNewPack={startNewPack} savePack={savePack} isSavingPack={isSavingPack} progressMap={progressMap} setActiveKey={setActiveKey} onDiscard={handleDiscardPack} />
            </Block>
          </Tab>
          <Tab title={<NavLabel icon={Brain} label="Quiz" />}>
            <Block paddingTop="16px">
              <QuizTab quizBook={quizBook} setQuizBook={setQuizBook} quizLektions={quizLektions} setQuizLektions={setQuizLektions} quizBookMeta={quizBookMeta} quizMode={quizMode} setQuizMode={setQuizMode} quizStarted={quizStarted} setQuizStarted={setQuizStarted} quizScopeWords={quizScopeWords} weakIds={weakIds} allWords={allWords} startQuiz={startQuiz} quizQueue={quizQueue} quizIdx={quizIdx} currentQuizWord={currentQuizWord} choiceOptions={choiceOptions} choicePick={choicePick} setChoicePick={setChoicePick} quizAnswer={quizAnswer} setQuizAnswer={setQuizAnswer} quizArtikelChoice={quizArtikelChoice} setQuizArtikelChoice={setQuizArtikelChoice} quizFeedback={quizFeedback} setQuizFeedback={setQuizFeedback} quizScore={quizScore} submitQuiz={submitQuiz} nextQuiz={nextQuiz} insertUmlaut={insertUmlaut} choiceEliminated={choiceEliminated} choiceCorrectLocked={choiceCorrectLocked} choiceCorrectEn={choiceCorrectEn} choiceTransition={choiceTransition} questionFade={questionFade} choiceAnimKey={choiceAnimKey} quizSubmitting={quizSubmitting} handleChoiceSelect={handleChoiceSelect} matchBoard={matchBoard} matchMatched={matchMatched} matchMoves={matchMoves} matchDone={matchDone} matchXp={matchXp} handleMatchPick={handleMatchPick} startMatchGame={startMatchGame} matchStarted={matchStarted} setMatchStarted={setMatchStarted} matchFadingIds={matchFadingIds} matchShakeIds={matchShakeIds} matchWrongIds={matchWrongIds} matchHiddenIds={matchHiddenIds} sprintActive={sprintActive} setSprintActive={setSprintActive} sprintQueue={sprintQueue} sprintIdx={sprintIdx} sprintOptions={sprintOptions} sprintTime={sprintTime} sprintScore={sprintScore} sprintFeedback={sprintFeedback} handleSprintPick={handleSprintPick} startSprintGame={startSprintGame} satzQueue={satzQueue} satzIdx={satzIdx} setSatzIdx={setSatzIdx} satzBuilt={satzBuilt} setSatzBuilt={setSatzBuilt} satzPool={satzPool} setSatzPool={setSatzPool} satzFeedback={satzFeedback} setSatzFeedback={setSatzFeedback} satzScore={satzScore} satzActive={satzActive} setSatzActive={setSatzActive} handleSatzPick={handleSatzPick} handleSatzRemove={handleSatzRemove} checkSatz={checkSatz} startSatzGame={startSatzGame} rainQueue={rainQueue} rainIdx={rainIdx} rainOptions={rainOptions} rainTime={rainTime} rainLives={rainLives} rainScore={rainScore} rainFeedback={rainFeedback} rainActive={rainActive} setRainActive={setRainActive} handleRainPick={handleRainPick} startRainGame={startRainGame} lastQuizReport={lastQuizReport} showQuizReport={showQuizReport} setShowQuizReport={setShowQuizReport} onRetakeQuiz={retakeQuiz} onPracticeLektion={practiceReportLektion} onPracticeWeak={goWeakFromReport} onGoToBook={goBookFromQuiz} />
            </Block>
          </Tab>
          <Tab title={<NavLabel icon={Flame} label="Streak" />}>
            <StreakTab authToken={authToken} refreshKey={streakRefreshKey} pendingCelebration={pendingCelebration} onCelebrationSeen={() => setPendingCelebration(null)} />
          </Tab>
          <Tab title={<NavLabel icon={Search} label="Suche" />}>
            <SucheTab search={search} setSearch={setSearch} setSelectedBook={setSelectedBook} selectedBook={selectedBook} filteredWordsForSearch={filteredWordsForSearch} handleDeleteCustom={handleDeleteCustom} />
          </Tab>
          <Tab title={<NavLabel icon={Target} label={`Weak (${weakWords.length})`} />}>
            <WeakTab weakWords={weakWords} weakForScope={weakForScope} weakIds={weakIds} scopeWords={scopeWords} packSize={packSize} selectedBook={selectedBook} selectedLektions={selectedLektions} selectedBookMeta={selectedBookMeta} setPackWords={setPackWords} setPackIdx={setPackIdx} setPackAnswers={setPackAnswers} setPendingProgress={setPendingProgress} setShowPackSummary={setShowPackSummary} setFlipped={setFlipped} setActiveKey={setActiveKey} setQuizBook={setQuizBook} setQuizLektions={setQuizLektions} startQuiz={startQuiz} setToast={setToast} />
          </Tab>
          <Tab title={<NavLabel icon={Trophy} label="Board" />}>
            <BoardTab leaderboard={leaderboard} stats={stats} username={username} setUsername={setUsername} onlineBoard={onlineBoard} onlineError={onlineError} setOnlineError={setOnlineError} useOnline={useOnline} setUseOnline={setUseOnline} adminMode={adminMode} setAdminMode={setAdminMode} adminToken={adminToken} setAdminToken={setAdminToken} setOnlineBoard={setOnlineBoard} setToast={setToast} selectedBookMeta={selectedBookMeta} />
          </Tab>
          <Tab title={<NavLabel icon={User} label="Profile" />}>
            <ProfileTab authUser={authUser} stats={stats} selectedBookMeta={selectedBookMeta} selectedLektions={selectedLektions} scopeWords={scopeWords} progressMap={progressMap} allWords={allWords} weakForScope={weakForScope} weakWords={weakWords} setAuthMode={setAuthMode} setShowAuth={setShowAuth} handleLogout={handleLogout} setToast={setToast} setOnlineBoard={setOnlineBoard} setUseOnline={setUseOnline} />
          </Tab>
          {authUser?.isAdmin && (
            <Tab title={<NavLabel icon={ShieldCheck} label="Admin" />}>
              <AdminTab authUser={authUser} usersList={usersList} loadUsersList={loadUsersList} setToast={setToast} setOnlineBoard={setOnlineBoard} setUseOnline={setUseOnline} adminToken={adminToken} />
            </Tab>
          )}
        </Tabs>
      </Block>
      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </HeadingLevel>
  );
}
