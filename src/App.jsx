import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Tabs, Tab } from 'baseui/tabs-motion';
import { Block } from 'baseui/block';
import { HeadingLevel } from 'baseui/heading';
import { Notification } from 'baseui/notification';
import { Spinner } from 'baseui/spinner';
import { db, initDB, getStats, updateStreak, addXP, COMPETITORS, getAllWords, addCustomWord, deleteCustomWord, fetchOnlineLeaderboard, submitOnlineScore, deleteOnlineScore, resetOnlineBoard } from './db';
import { signup, login, fetchMe, logout, fetchUsers, deleteUser, fetchProgress, saveProgress, saveProgressOne, fetchStatsOnline, saveStatsOnline } from './auth';
import { sm2, qualityFromLabel, XP_MAP, QUIZ_XP, GAME_XP } from './srs';
import { BOOKS, ALL_MENSCHEN_WORDS, lektionenForBook } from './data/menschen.js';
import PWAUpdater from './components/PWAUpdater.jsx';
import Header from './components/layout/Header.jsx';
import AddCardModal from './components/modals/AddCardModal.jsx';
import AuthModal from './components/modals/AuthModal.jsx';
import BuecherTab from './components/tabs/BuecherTab.jsx';
import LernenTab from './components/tabs/LernenTab.jsx';
import QuizTab from './components/tabs/QuizTab.jsx';
import SucheTab from './components/tabs/SucheTab.jsx';
import WeakTab from './components/tabs/WeakTab.jsx';
import BoardTab from './components/tabs/BoardTab.jsx';
import ProfileTab from './components/tabs/ProfileTab.jsx';
import AdminTab from './components/tabs/AdminTab.jsx';
import { speakGerman } from './utils/speak.js';
import { playCorrect, playIncorrect, playPackComplete, playQuizComplete, playGameWin, playGameOver, playMatchPair, playXp, playStreak, playTap, primeAudio } from './utils/sounds.js';

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

// --- daily word exposure tracking (max 2 per day) ---
const DAILY_LIMIT = 2;
const DAILY_STORAGE_KEY = 'gs_daily_seen';
function getTodayKey() { return new Date().toISOString().slice(0,10); }
function getDailyCountsMap() {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj.date !== getTodayKey()) return {};
    return obj.counts || {};
  } catch { return {}; }
}
function incDailyWordCounts(wordIds) {
  try {
    if (typeof localStorage === 'undefined') return;
    const today = getTodayKey();
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    let obj = raw ? JSON.parse(raw) : null;
    if (!obj || obj.date !== today) obj = { date: today, counts: {} };
    for (const id of wordIds) {
      const k = String(id);
      obj.counts[k] = (obj.counts[k] || 0) + 1;
    }
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}
function isWordUnderDailyLimit(id, countsMap) {
  const c = countsMap[String(id)] || 0;
  return c < DAILY_LIMIT;
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
  const [stats, setStats] = useState({ xp: 0, streak: 0, lastStudyDate: null, totalReviews: 0 });
  const [search, setSearch] = useState('');
  const [progressMap, setProgressMap] = useState({});
  const [weakIds, setWeakIds] = useState(new Set());
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [dbReady, setDbReady] = useState(false);
  const [toast, setToast] = useState(null);
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
  const [choiceTransition, setChoiceTransition] = useState('idle'); // idle | exiting | entering
  const [questionFade, setQuestionFade] = useState(false);
  const [choiceAnimKey, setChoiceAnimKey] = useState(0);
  const choiceProcessedRef = useRef(false);
  // quiz submission idempotency guard
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const quizSubmitLockRef = useRef(false);
  const quizProcessedIdxRef = useRef(-1);
  const nextLockRef = useRef(false);
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
    let newCount = 0;
    const withScore = scopeWords.map((w) => {
      const p = progressMap[w.id];
      const due = p?.due || 0;
      const isNew = !p || p.repetition === 0;
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
      return { w, score, isNew, due };
    });
    withScore.sort((a, b) => {
      if (a.isNew && !b.isNew) return 1;
      if (!a.isNew && b.isNew) return -1;
      return b.score - a.score;
    });
    let res = withScore.map((x) => x.w);
    // Multi-Lektion: shuffle new words segment so lesson order doesn't dominate (due words keep SRS order)
    if (selectedLektions.length > 1) {
      const isNewCheck = (w) => {
        const p = progressMap[w.id];
        return !p || p.repetition === 0;
      };
      const duePart = res.filter(w => !isNewCheck(w));
      const newPart = res.filter(w => isNewCheck(w));
      const shuffledNew = shuffleArray(newPart);
      // also shuffle duePart lightly if it still resembles lesson order — but keep SRS priority, so only shuffle within same score bands?
      // For true cross-lesson randomness, shuffle duePart when it contains many lessons and no strong score differences
      // We keep duePart as is to respect SRS, shuffle only newPart for now
      res = [...duePart, ...shuffledNew];
    }
    return res;
  }, [scopeWords, progressMap, weakIds, selectedLektions]);

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
    setStats(s => {
      const today = new Date().toISOString().slice(0,10);
      const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
      let newStreak = s.streak || 0;
      let newLast = s.lastStudyDate;
      if (s.lastStudyDate !== today) {
        if (!s.lastStudyDate) newStreak = 1;
        else if (s.lastStudyDate === yesterday) newStreak = (s.streak||0)+1;
        else {
          const diff = (new Date(today) - new Date(s.lastStudyDate))/86400000;
          newStreak = diff===1 ? (s.streak||0)+1 : 1;
        }
        newLast = today;
      }
      return { ...s, xp: (s.xp||0)+xp, totalReviews: (s.totalReviews||0)+1, streak: newStreak, lastStudyDate: newLast };
    });
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
    try {
      if (authToken && authUser) {
        const bulk = {};
        entries.forEach(e => bulk[e.id] = e);
        const server = await fetchProgress() || {};
        const merged = { ...server, ...bulk };
        await saveProgress(merged);
        await saveStatsOnline(stats);
        await submitOnlineScore(authUser.username, stats.xp);
        const b = await fetchOnlineLeaderboard(); if (b) setOnlineBoard(b);
      } else {
        await db.progress.bulkPut(entries);
        await db.stats.put({ id: 'main', ...stats });
      }
      setToast(`Pack saved +${totalXp} XP ✓`);
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
  }, [pendingProgress, packAnswers, authToken, authUser, stats, startNewPack]);

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

  // quiz building scoped
  const buildQuizQueue = useCallback((count = 10, mode = quizMode) => {
    let pool = quizScopeWords;
    if (!pool.length) return [];
    // For vocab games, filter out long educational sentences — keep them for SatzBau instead
    // For general quiz modes (dictation, artikel, choice, fa), we keep vocab-like only
    const vocabPool = (mode === 'satz' ? pool : filterVocabForGames(pool));
    let effectivePool = vocabPool.length >= 4 ? vocabPool : pool;
    // enforce daily repetition limit (max 2 per day) — prioritize words under limit
    const dailyMap = getDailyCountsMap();
    const underLimitPool = effectivePool.filter(w=> isWordUnderDailyLimit(w.id, dailyMap));
    // if enough under-limit words, prefer them; otherwise keep full pool but will prioritize later
    if (underLimitPool.length >= count) effectivePool = underLimitPool;
    const weakInScope = effectivePool.filter(w=> weakIds.has(w.id));
    let candidates = [...weakInScope];
    candidates.sort((a,b)=>{
      const pa = progressMap[a.id] || { lapses:0, ease:2.5, due:0 };
      const pb = progressMap[b.id] || { lapses:0, ease:2.5, due:0 };
      if (pb.lapses !== pa.lapses) return pb.lapses - pa.lapses;
      if (pa.ease !== pb.ease) return pa.ease - pb.ease;
      return (pa.due||Infinity) - (pb.due||Infinity);
    });
    // stable prioritize under-limit within weak
    candidates.sort((a,b)=> {
      const aUnder = isWordUnderDailyLimit(a.id, dailyMap) ? 0 : 1;
      const bUnder = isWordUnderDailyLimit(b.id, dailyMap) ? 0 : 1;
      return aUnder - bUnder;
    });
    let out = [...candidates];
    if (out.length < count) {
      const remaining = effectivePool.filter(w => !weakIds.has(w.id));
      // sort by difficulty then shuffle to avoid lesson/id order
      remaining.sort((a,b)=>{
        const pa = progressMap[a.id]; const pb = progressMap[b.id];
        const ea = pa ? pa.ease : 2.5; const eb = pb ? pb.ease : 2.5;
        if (ea !== eb) return ea - eb;
        return 0;
      });
      // prioritize under-limit for variety before shuffle
      const under = remaining.filter(w=> isWordUnderDailyLimit(w.id, dailyMap));
      const over = remaining.filter(w=> !isWordUnderDailyLimit(w.id, dailyMap));
      const shuffledUnder = shuffleArray(under);
      const shuffledOver = shuffleArray(over);
      const combined = [...shuffledUnder, ...shuffledOver];
      out.push(...combined.slice(0, count - out.length));
    }
    if (mode === 'artikel') {
      out = out.filter(w => w.article);
      if (out.length < count) {
        const nouns = effectivePool.filter(w => w.article && !out.includes(w));
        // prioritize under-limit nouns
        const nounsUnder = nouns.filter(w=> isWordUnderDailyLimit(w.id, dailyMap));
        const nounsOver = nouns.filter(w=> !isWordUnderDailyLimit(w.id, dailyMap));
        const shuffledNouns = [...shuffleArray(nounsUnder), ...shuffleArray(nounsOver)];
        out.push(...shuffledNouns.slice(0, count - out.length));
      }
    }
    // final variety: prefer under-limit but keep some randomness
    // sort by daily count weight then shuffle within bands
    const outUnder = out.filter(w=> isWordUnderDailyLimit(w.id, dailyMap));
    const outOver = out.filter(w=> !isWordUnderDailyLimit(w.id, dailyMap));
    const shuffledOut = [...shuffleArray(outUnder), ...shuffleArray(outOver)];
    // if we have more under-limit than needed, just take under; else mix
    let final = shuffledOut.slice(0, count);
    // if still not enough under-limit and we filtered initially, allow fallback to original pool's over-limit randomly to fill
    if (final.length < count && underLimitPool.length < count) {
      const fallbackPool = vocabPool.length >=4 ? vocabPool : pool;
      const extra = shuffleArray(fallbackPool.filter(w=> !final.includes(w))).slice(0, count - final.length);
      final = [...final, ...extra];
    }
    // Ensure cross-lesson randomness: already shuffled
    return final.slice(0, count);
  }, [quizScopeWords, weakIds, progressMap, quizMode]);

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
    // track daily exposure for variety (increment counts for selected words)
    incDailyWordCounts(q.map(w=> w.id));
    setQuizMode(mode);
    setQuizQueue(q);
    setQuizIdx(0);
    setQuizAnswer('');
    setQuizArtikelChoice('');
    setChoicePick('');
    setQuizFeedback(null);
    setQuizScore({ correct:0, total:0, xp:0 });
    setQuizStarted(true);
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
      if (authToken && authUser) {
        const today = new Date().toISOString().slice(0,10);
        const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
        let newStreak = stats.streak || 0;
        let newLast = stats.lastStudyDate;
        if (stats.lastStudyDate !== today) {
          if (!stats.lastStudyDate) newStreak = 1;
          else if (stats.lastStudyDate === yesterday) newStreak = (stats.streak||0)+1;
          else {
            const diff = (new Date(today) - new Date(stats.lastStudyDate))/86400000;
            newStreak = diff===1 ? (stats.streak||0)+1 : 1;
          }
          newLast = today;
        }
        const newStats = { ...stats, xp: (stats.xp||0)+xpAdd, totalReviews: (stats.totalReviews||0)+1, streak: newStreak, lastStudyDate: newLast };
        setStats(newStats);
        try { await saveStatsOnline(newStats); } catch {}
        if (useOnline) submitOnlineScore(authUser.username, newStats.xp).then(b=>{ if(b) setOnlineBoard(b); }).catch(()=>{});
      } else {
        await addXP(xpAdd); await updateStreak();
        const s=await getStats(); setStats(s);
        if (useOnline && username) submitOnlineScore(username, s.xp).then(b=>{ if(b) setOnlineBoard(b); }).catch(()=>{});
      }
    } else {
      // still count as review for streak even if wrong
      if (authToken && authUser) {
        const today = new Date().toISOString().slice(0,10);
        if (stats.lastStudyDate !== today) {
          const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
          let newStreak = stats.streak || 0;
          let newLast = stats.lastStudyDate;
          if (!stats.lastStudyDate) newStreak = 1;
          else if (stats.lastStudyDate === yesterday) newStreak = (stats.streak||0)+1;
          else { const diff=(new Date(today)-new Date(stats.lastStudyDate))/86400000; newStreak = diff===1 ? (stats.streak||0)+1 : 1; }
          newLast = today;
          const newStats = { ...stats, totalReviews:(stats.totalReviews||0)+1, streak:newStreak, lastStudyDate:newLast };
          setStats(newStats); try{ await saveStatsOnline(newStats);}catch{}
        }
      }
    }
    setQuizScore(sc=> ({ correct: sc.correct + (correct?1:0), total: sc.total+1, xp: sc.xp + xpAdd }));
    setQuizFeedback({ correct, expected: currentQuizWord.article ? `${currentQuizWord.article} ${currentQuizWord.german}` : currentQuizWord.german, expectedFa: currentQuizWord.meaning_fa, expectedEn: currentQuizWord.meaning_en || currentQuizWord.english, xp: xpAdd });
    if (correct) { playCorrect(); if (xpAdd >= 10) setTimeout(() => playXp(), 160); } else playIncorrect();
    setToast(correct ? `+${xpAdd} XP ✓` : `was "${currentQuizWord.article ? currentQuizWord.article+' '+currentQuizWord.german : currentQuizWord.german}"`);
    setTimeout(()=> setToast(null),1400);
  };

  const nextQuiz = () => {
    primeAudio();
    if (nextLockRef.current) return;
    nextLockRef.current = true;
    setTimeout(()=> { nextLockRef.current = false; }, 600);
    // reset submission lock for next question
    quizSubmitLockRef.current = false;
    setQuizSubmitting(false);
    choiceProcessedRef.current = false;
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
      if (authToken && authUser) {
        const today = new Date().toISOString().slice(0,10);
        const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
        let newStreak = stats.streak || 0;
        let newLast = stats.lastStudyDate;
        if (stats.lastStudyDate !== today) {
          if (!stats.lastStudyDate) newStreak = 1;
          else if (stats.lastStudyDate === yesterday) newStreak = (stats.streak||0)+1;
          else { const diff=(new Date(today)-new Date(stats.lastStudyDate))/86400000; newStreak = diff===1 ? (stats.streak||0)+1 : 1; }
          newLast = today;
        }
        const newStats = { ...stats, xp: (stats.xp||0)+xpAdd, totalReviews: (stats.totalReviews||0)+1, streak: newStreak, lastStudyDate: newLast };
        setStats(newStats);
        try { await saveStatsOnline(newStats); } catch {}
        if (useOnline) submitOnlineScore(authUser.username, newStats.xp).then(b=>{ if(b) setOnlineBoard(b); }).catch(()=>{});
      } else {
        await addXP(xpAdd); await updateStreak();
        const s=await getStats(); setStats(s);
        if (useOnline && username) submitOnlineScore(username, s.xp).then(b=>{ if(b) setOnlineBoard(b);}).catch(()=>{});
      }
    }
    setQuizScore(sc=> ({ correct: sc.correct+1, total: sc.total+1, xp: sc.xp + xpAdd }));
    // keep quizFeedback null for choice — we use choiceCorrectLocked UI instead, but set a minimal feedback for scoring on finish
    setQuizFeedback({ correct: true, expected: currentQuizWord.german, expectedEn: correctEn, expectedFa: currentQuizWord.meaning_fa, xp: xpAdd });
    setToast(`+${xpAdd} XP ✓`);
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
        quizProcessedIdxRef.current = -1;
        const w = quizQueue[nextIdx];
        if (w) {
          const { opts } = buildChoiceOptions(w, quizScopeWords);
          setChoiceOptions(opts);
          setChoiceAnimKey(k=>k+1);
          setQuestionFade(false);
          setChoiceTransition('entering');
          // after entering animation, go idle
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
    const basePool = quizScopeWords.length >= 6 ? quizScopeWords : allWords;
    // Filter out long educational sentences for vocab Match Dash — keep vocab-like only, fallback to basePool if not enough
    const vocabFiltered = filterVocabForGames(basePool);
    let pool = vocabFiltered.length >= 6 ? vocabFiltered : basePool;
    const dailyMapM = getDailyCountsMap();
    const underM = pool.filter(w=> isWordUnderDailyLimit(w.id, dailyMapM));
    if (underM.length >=6) pool = underM;
    // Proper shuffle (Fisher-Yates) respecting multi-lesson — picks already randomized across lessons
    const shuffledPool = shuffleArray(pool);
    const picks = shuffledPool.slice(0,6);
    incDailyWordCounts(picks.map(w=> w.id));
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
  }, [quizScopeWords, allWords]);

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
    if (authToken && authUser) {
      const today = new Date().toISOString().slice(0,10);
      const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
      let newStreak = stats.streak || 0;
      let newLast = stats.lastStudyDate;
      if (stats.lastStudyDate !== today) {
        if (!stats.lastStudyDate) newStreak = 1;
        else if (stats.lastStudyDate === yesterday) newStreak = (stats.streak||0)+1;
        else { const diff=(new Date(today)-new Date(stats.lastStudyDate))/86400000; newStreak = diff===1 ? (stats.streak||0)+1 : 1; }
        newLast = today;
      }
      const newStats = {...stats, xp:(stats.xp||0)+xpAdd, totalReviews:(stats.totalReviews||0)+reviews, streak:newStreak, lastStudyDate:newLast};
      setStats(newStats); try{ await saveStatsOnline(newStats);}catch{};
      if (useOnline) submitOnlineScore(authUser.username, newStats.xp).then(b=>{ if(b) setOnlineBoard(b);}).catch(()=>{});
    } else {
      await db.stats.put({id:'main', xp:(stats.xp||0)+xpAdd, streak: stats.streak, lastStudyDate: stats.lastStudyDate, totalReviews:(stats.totalReviews||0)+reviews});
      const s=await getStats(); setStats(s);
      if (useOnline && username) submitOnlineScore(username, s.xp).then(b=>{ if(b) setOnlineBoard(b);}).catch(()=>{});
    }
    setToast(`+${xpAdd} XP 🎮`);
    setTimeout(()=> setToast(null),1800);
  };

  const startSprintGame = useCallback((count=12) => {
    const basePool = quizScopeWords.length >= count ? quizScopeWords : allWords;
    const vocabFiltered = filterVocabForGames(basePool);
    let pool = vocabFiltered.length >= count ? vocabFiltered : basePool;
    // apply daily limit to sprint picks for variety
    const dailyMapS = getDailyCountsMap();
    const underS = pool.filter(w=> isWordUnderDailyLimit(w.id, dailyMapS));
    if (underS.length >= count) pool = underS;
    const picks = shuffleArray(pool).slice(0, count);
    incDailyWordCounts(picks.map(w=> w.id));
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
  }, [quizScopeWords, allWords, quizLektions]);

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
    setSprintFeedback({ correct, expected: cur.correct, xp: xpAdd });
    setSprintScore(s=> ({ correct: s.correct + (correct?1:0), total: s.total+1, streak, best: Math.max(s.best, streak), xp: s.xp + xpAdd }));
    setTimeout(()=> {
      setSprintFeedback(null);
      if (sprintIdx +1 >= sprintQueue.length) {
        const basePool = quizScopeWords.length >=8 ? quizScopeWords : allWords;
        const vocabFilteredRefill = filterVocabForGames(basePool);
        let pool = vocabFilteredRefill.length >= 8 ? vocabFilteredRefill : basePool;
        const dailyMapR = getDailyCountsMap();
        const underR = pool.filter(w=> isWordUnderDailyLimit(w.id, dailyMapR));
        if (underR.length >= 8) pool = underR;
        const picks = shuffleArray(pool).slice(0,8);
        incDailyWordCounts(picks.map(w=> w.id));
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
    const picks = shuffleArray(effectiveWithSentences).slice(0, count);
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
  }, [quizScopeWords, allWords]);

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
    const basePool = quizScopeWords.length >= count ? quizScopeWords : allWords;
    const vocabFiltered = filterVocabForGames(basePool);
    let pool = vocabFiltered.length >= count ? vocabFiltered : basePool;
    const dailyMapRain = getDailyCountsMap();
    const underRain = pool.filter(w=> isWordUnderDailyLimit(w.id, dailyMapRain));
    if (underRain.length >= count) pool = underRain;
    const picks = shuffleArray(pool).slice(0,count);
    incDailyWordCounts(picks.map(w=> w.id));
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
  }, [quizScopeWords, allWords]);

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
              let pool = vocabFiltered2.length>=8 ? vocabFiltered2 : basePool2;
              const dailyMap2 = getDailyCountsMap();
              const under2 = pool.filter(w=> isWordUnderDailyLimit(w.id, dailyMap2));
              if (under2.length >=6) pool = under2;
              const picks=shuffleArray(pool).slice(0,6);
              incDailyWordCounts(picks.map(w=> w.id));
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
        let pool = vocabFiltered3.length>=8 ? vocabFiltered3 : basePool3;
        const dailyMap3 = getDailyCountsMap();
        const under3 = pool.filter(w=> isWordUnderDailyLimit(w.id, dailyMap3));
        if (under3.length >=6) pool = under3;
        const picks=shuffleArray(pool).slice(0,6);
        incDailyWordCounts(picks.map(w=> w.id));
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
      setToast(`Added "${w.german}" ✓`);
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
      setToast(`Welcome ${res.user.username} ✓`);
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
      setToast(`Logged in as ${res.user.username} ✓`);
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

  if (!dbReady) return <Block display="flex" justifyContent="center" alignItems="center" height="100vh"><Spinner size={48} /></Block>;

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
      <Header stats={stats} authUser={authUser} onAdd={()=> setShowAdd(true)} onLogout={handleLogout} setShowAuth={setShowAuth} setAuthMode={setAuthMode} />
      <PWAUpdater />
      {toast && (
        <Block overrides={{ Block: { style: { position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 } } }}>
          <Notification overrides={{ Body: { style: { backgroundColor: '#000', color: '#fff', borderRadius: '999px', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '16px', paddingRight: '16px', fontWeight: 700, fontSize: '13px' } } }}>{toast}</Notification>
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
          <Tab title="📚 Bücher">
            <Block paddingTop="16px">
              <BuecherTab selectedBook={selectedBook} setSelectedBook={setSelectedBook} selectedLektions={selectedLektions} setSelectedLektions={setSelectedLektions} bookView={bookView} setBookView={setBookView} allWords={allWords} progressMap={progressMap} scopeWords={scopeWords} setActiveKey={setActiveKey} setQuizBook={setQuizBook} setQuizLektions={setQuizLektions} selectedBookMeta={selectedBookMeta} />
            </Block>
          </Tab>
          <Tab title="Lernen">
            <Block paddingTop="16px">
              <LernenTab selectedBook={selectedBook} setSelectedBook={setSelectedBook} selectedLektions={selectedLektions} setSelectedLektions={setSelectedLektions} selectedBookMeta={selectedBookMeta} scopeWords={scopeWords} weakForScope={weakForScope} studyQueue={studyQueue} packSize={packSize} setPackSize={setPackSize} packWords={packWords} packIdx={packIdx} packAnswers={packAnswers} showPackSummary={showPackSummary} flipped={flipped} setFlipped={setFlipped} listening={listening} setListening={setListening} transcript={transcript} setTranscript={setTranscript} handlePackSwipe={handlePackSwipe} handlePackRate={handlePackRate} startNewPack={startNewPack} savePack={savePack} isSavingPack={isSavingPack} progressMap={progressMap} setActiveKey={setActiveKey} onDiscard={handleDiscardPack} />
            </Block>
          </Tab>
          <Tab title="Quiz">
            <Block paddingTop="16px">
              <QuizTab quizBook={quizBook} setQuizBook={setQuizBook} quizLektions={quizLektions} setQuizLektions={setQuizLektions} quizBookMeta={quizBookMeta} quizMode={quizMode} setQuizMode={setQuizMode} quizStarted={quizStarted} setQuizStarted={setQuizStarted} quizScopeWords={quizScopeWords} weakIds={weakIds} allWords={allWords} startQuiz={startQuiz} quizQueue={quizQueue} quizIdx={quizIdx} currentQuizWord={currentQuizWord} choiceOptions={choiceOptions} choicePick={choicePick} setChoicePick={setChoicePick} quizAnswer={quizAnswer} setQuizAnswer={setQuizAnswer} quizArtikelChoice={quizArtikelChoice} setQuizArtikelChoice={setQuizArtikelChoice} quizFeedback={quizFeedback} setQuizFeedback={setQuizFeedback} quizScore={quizScore} submitQuiz={submitQuiz} nextQuiz={nextQuiz} insertUmlaut={insertUmlaut} choiceEliminated={choiceEliminated} choiceCorrectLocked={choiceCorrectLocked} choiceCorrectEn={choiceCorrectEn} choiceTransition={choiceTransition} questionFade={questionFade} choiceAnimKey={choiceAnimKey} quizSubmitting={quizSubmitting} handleChoiceSelect={handleChoiceSelect} matchBoard={matchBoard} matchMatched={matchMatched} matchMoves={matchMoves} matchDone={matchDone} matchXp={matchXp} handleMatchPick={handleMatchPick} startMatchGame={startMatchGame} matchStarted={matchStarted} setMatchStarted={setMatchStarted} matchFadingIds={matchFadingIds} matchShakeIds={matchShakeIds} matchWrongIds={matchWrongIds} matchHiddenIds={matchHiddenIds} sprintActive={sprintActive} setSprintActive={setSprintActive} sprintQueue={sprintQueue} sprintIdx={sprintIdx} sprintOptions={sprintOptions} sprintTime={sprintTime} sprintScore={sprintScore} sprintFeedback={sprintFeedback} handleSprintPick={handleSprintPick} startSprintGame={startSprintGame} satzQueue={satzQueue} satzIdx={satzIdx} setSatzIdx={setSatzIdx} satzBuilt={satzBuilt} setSatzBuilt={setSatzBuilt} satzPool={satzPool} setSatzPool={setSatzPool} satzFeedback={satzFeedback} setSatzFeedback={setSatzFeedback} satzScore={satzScore} satzActive={satzActive} setSatzActive={setSatzActive} handleSatzPick={handleSatzPick} handleSatzRemove={handleSatzRemove} checkSatz={checkSatz} startSatzGame={startSatzGame} rainQueue={rainQueue} rainIdx={rainIdx} rainOptions={rainOptions} rainTime={rainTime} rainLives={rainLives} rainScore={rainScore} rainFeedback={rainFeedback} rainActive={rainActive} setRainActive={setRainActive} handleRainPick={handleRainPick} startRainGame={startRainGame} />
            </Block>
          </Tab>
          <Tab title="Suche">
            <SucheTab search={search} setSearch={setSearch} setSelectedBook={setSelectedBook} selectedBook={selectedBook} filteredWordsForSearch={filteredWordsForSearch} handleDeleteCustom={handleDeleteCustom} />
          </Tab>
          <Tab title={`Weak (${weakWords.length})`}>
            <WeakTab weakWords={weakWords} weakForScope={weakForScope} weakIds={weakIds} scopeWords={scopeWords} packSize={packSize} selectedBook={selectedBook} selectedLektions={selectedLektions} selectedBookMeta={selectedBookMeta} setPackWords={setPackWords} setPackIdx={setPackIdx} setPackAnswers={setPackAnswers} setPendingProgress={setPendingProgress} setShowPackSummary={setShowPackSummary} setFlipped={setFlipped} setActiveKey={setActiveKey} setQuizBook={setQuizBook} setQuizLektions={setQuizLektions} startQuiz={startQuiz} setToast={setToast} />
          </Tab>
          <Tab title="Board">
            <BoardTab leaderboard={leaderboard} stats={stats} username={username} setUsername={setUsername} onlineBoard={onlineBoard} onlineError={onlineError} setOnlineError={setOnlineError} useOnline={useOnline} setUseOnline={setUseOnline} adminMode={adminMode} setAdminMode={setAdminMode} adminToken={adminToken} setAdminToken={setAdminToken} setOnlineBoard={setOnlineBoard} setToast={setToast} selectedBookMeta={selectedBookMeta} />
          </Tab>
          <Tab title="Profile">
            <ProfileTab authUser={authUser} stats={stats} selectedBookMeta={selectedBookMeta} selectedLektions={selectedLektions} scopeWords={scopeWords} progressMap={progressMap} allWords={allWords} weakForScope={weakForScope} weakWords={weakWords} setAuthMode={setAuthMode} setShowAuth={setShowAuth} handleLogout={handleLogout} setToast={setToast} setOnlineBoard={setOnlineBoard} setUseOnline={setUseOnline} />
          </Tab>
          {authUser?.isAdmin && (
            <Tab title="Admin">
              <AdminTab authUser={authUser} usersList={usersList} loadUsersList={loadUsersList} setToast={setToast} setOnlineBoard={setOnlineBoard} setUseOnline={setUseOnline} adminToken={adminToken} />
            </Tab>
          )}
        </Tabs>
      </Block>
      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </HeadingLevel>
  );
}
