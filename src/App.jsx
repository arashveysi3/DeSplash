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
  // Match Dash game — DE vs EN+FA (no spoiler)
  const [matchBoard, setMatchBoard] = useState([]);
  const [matchPicks, setMatchPicks] = useState([]);
  const [matchMatched, setMatchMatched] = useState(0);
  const [matchMoves, setMatchMoves] = useState(0);
  const [matchStarted, setMatchStarted] = useState(false);
  const [matchDone, setMatchDone] = useState(false);
  const [matchXp, setMatchXp] = useState(0);
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

  // scope words helper — multi-lektion
  const scopeWords = useMemo(()=>{
    const book = selectedBook;
    const leks = selectedLektions;
    if (!book) return allWords;
    let w = allWords.filter(x=> x.book === book);
    if (leks && leks.length > 0) w = w.filter(x=> leks.includes(x.lektion));
    if (search.trim()) {
      const q = search.toLowerCase();
      w = w.filter(x => x.german.toLowerCase().includes(q) || (x.meaning_en||x.english||'').toLowerCase().includes(q) || (x.meaning_fa||'').includes(q) || x.lektion.toLowerCase().includes(q));
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
      w = w.filter((x) => x.german.toLowerCase().includes(q) || (x.meaning_en||x.english||'').toLowerCase().includes(q) || (x.meaning_fa||'').includes(q) || (x.level||'').toLowerCase().includes(q) || (x.lektion||'').toLowerCase().includes(q));
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
    const res = withScore.map((x) => x.w);
    return res;
  }, [scopeWords, progressMap, weakIds]);

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
    const today = new Date().toISOString().slice(0,10);
    if (sessionDay.current !== today) { sessionDay.current = today; sessionReviewedIds.current.clear(); }
    const available = studyQueue.filter(w => !sessionReviewedIds.current.has(w.id));
    const pack = available.slice(0, packSize);
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
  }, [studyQueue, packSize]);

  const handlePackRate = useCallback((label) => {
    const word = packWords[packIdx];
    if (!word) return;
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
      setShowPackSummary(true);
    } else {
      setPackIdx(i => i + 1);
      setFlipped(false);
      setTranscript('');
    }
  }, [packWords, packIdx, progressMap, pendingProgress]);

  const savePack = useCallback(async () => {
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
    const weakInScope = pool.filter(w=> weakIds.has(w.id));
    let candidates = [...weakInScope];
    candidates.sort((a,b)=>{
      const pa = progressMap[a.id] || { lapses:0, ease:2.5, due:0 };
      const pb = progressMap[b.id] || { lapses:0, ease:2.5, due:0 };
      if (pb.lapses !== pa.lapses) return pb.lapses - pa.lapses;
      if (pa.ease !== pb.ease) return pa.ease - pb.ease;
      return (pa.due||Infinity) - (pb.due||Infinity);
    });
    let out = [...candidates];
    if (out.length < count) {
      const remaining = pool.filter(w => !weakIds.has(w.id));
      remaining.sort((a,b)=>{
        const pa = progressMap[a.id]; const pb = progressMap[b.id];
        const ea = pa ? pa.ease : 2.5; const eb = pb ? pb.ease : 2.5;
        if (ea !== eb) return ea - eb;
        return a.id - b.id;
      });
      out.push(...remaining.slice(0, count - out.length));
    }
    if (mode === 'artikel') {
      out = out.filter(w => w.article);
      if (out.length < count) {
        const nouns = pool.filter(w => w.article && !out.includes(w));
        for (let i = nouns.length -1; i>0; i--) { const j=Math.floor(Math.random()*(i+1)); [nouns[i], nouns[j]]=[nouns[j], nouns[i]]; }
        out.push(...nouns.slice(0, count - out.length));
      }
    }
    for (let i = out.length -1; i>0; i--) { const j=Math.floor(Math.random()*(i+1)); [out[i], out[j]]=[out[j], out[i]]; }
    return out.slice(0, count);
  }, [quizScopeWords, weakIds, progressMap, quizMode]);

  const buildChoiceOptions = useCallback((word, pool) => {
    const correct = { en: word.meaning_en || word.english, fa: word.meaning_fa || '', id: word.id };
    const distractors = pool.filter(w=> w.id !== word.id).sort(()=> 0.5 - Math.random()).slice(0, 12).map(w=> ({ en: w.meaning_en || w.english, fa: w.meaning_fa || '', id: w.id })).filter(d=> d.en && d.en !== correct.en)
    const uniqMap = new Map();
    for (const d of distractors) if (!uniqMap.has(d.en)) uniqMap.set(d.en, d);
    let uniq = [...uniqMap.values()].slice(0,3)
    while (uniq.length < 3) uniq.push({ en: ['house','time','water'][uniq.length] || '—', fa: '—', id: 'pad'+uniq.length })
    const opts = [...uniq, correct].sort(()=> 0.5 - Math.random())
    return { correct, opts }
  }, []);

  const startQuiz = (mode, count=10) => {
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
    if (mode === 'choice' && q[0]) {
      const { opts } = buildChoiceOptions(q[0], quizScopeWords);
      setChoiceOptions(opts);
    }
    setTimeout(()=> { if ((mode==='dictation' || mode==='mixed') && q[0]) { const w=q[0]; if (mode==='dictation' || (mode==='mixed' && !w.article)) speakGerman(w.german); } }, 300);
  };

  const currentQuizWord = quizQueue[quizIdx] || null;

  const submitQuiz = async () => {
    if (!currentQuizWord) return;
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
    setToast(correct ? `+${xpAdd} XP ✓` : `was "${currentQuizWord.article ? currentQuizWord.article+' '+currentQuizWord.german : currentQuizWord.german}"`);
    setTimeout(()=> setToast(null),1400);
  };

  const nextQuiz = () => {
    if (quizIdx +1 >= quizQueue.length) {
      setQuizFeedback(null);
      setQuizStarted(false);
      setToast(`Quiz done: ${quizScore.correct + (quizFeedback?.correct?1:0)}/${quizScore.total +1} • +${quizScore.xp + (quizFeedback?.xp||0)} XP`);
      setTimeout(()=> setToast(null),2000);
      return;
    }
    const nextIdx = quizIdx +1;
    setQuizIdx(nextIdx);
    setQuizAnswer('');
    setQuizArtikelChoice('');
    setChoicePick('');
    setQuizFeedback(null);
    const w = quizQueue[nextIdx];
    if (quizMode === 'choice') {
      const { opts } = buildChoiceOptions(w, quizScopeWords);
      setChoiceOptions(opts);
    }
    const isArtikelNext = quizMode==='artikel' || (quizMode==='mixed' && w.article && nextIdx %2===0);
    if (!isArtikelNext && quizMode !== 'fa' && quizMode !== 'choice') setTimeout(()=> speakGerman(w.german), 250);
  };

  const insertUmlaut = (ch) => setQuizAnswer(a=> a + ch);

  // ---- Games ----
  const startMatchGame = useCallback(() => {
    const pool = quizScopeWords.length >= 6 ? quizScopeWords : allWords;
    const picks = [...pool].sort(()=> 0.5 - Math.random()).slice(0,6);
    const tiles = [];
    picks.forEach((w) => {
      // DE side — German only (no spoiler)
      tiles.push({ uid: `${w.id}-de`, pairId: w.id, label: w.article ? `${w.article} ${w.german}` : w.german, sub: w.plural ? `Pl: ${w.plural}` : w.lektion, type:'de', word:w, matched:false, flipped:false });
      // Translation side — English + Persian stacked (German never shown here)
      tiles.push({ uid: `${w.id}-tr`, pairId: w.id, label: w.meaning_en || w.english, sub: w.meaning_fa || '', sub2: w.lektion, type:'tr', word:w, matched:false, flipped:false });
    });
    for (let i=tiles.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [tiles[i],tiles[j]]=[tiles[j],tiles[i]]; }
    setMatchBoard(tiles);
    setMatchPicks([]);
    setMatchMatched(0);
    setMatchMoves(0);
    setMatchXp(0);
    setMatchDone(false);
    setMatchStarted(true);
    setQuizMode('match');
    setQuizStarted(true);
  }, [quizScopeWords, allWords]);

  const handleMatchPick = (uid) => {
    if (matchDone) return;
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
      setTimeout(()=> {
        if (isMatch) {
          const updated = nextBoard.map(t=> (t.uid===a.uid || t.uid===b.uid) ? {...t, matched:true} : t);
          setMatchBoard(updated);
          const xpAdd = GAME_XP.matchPair;
          setMatchXp(x=> x + xpAdd);
          setMatchMatched(v=> {
            const nv = v + 1;
            if (nv === 6) {
              const bonus = GAME_XP.matchPerfectBonus + Math.max(0, 12 - matchMoves) ;
              const totalAward = 6 * GAME_XP.matchPair + bonus;
              setMatchXp(totalAward);
              setMatchDone(true);
              setTimeout(()=> awardGameXP(totalAward, 6), 420);
            }
            return nv;
          });
          setMatchPicks([]);
        } else {
          setMatchBoard(prev=> prev.map(t=> nextPicks.includes(t.uid) ? {...t, flipped:false} : t));
          setMatchPicks([]);
        }
      }, 650);
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
    const pool = quizScopeWords.length >= count ? quizScopeWords : allWords;
    const picks = [...pool].sort(()=> 0.5 - Math.random()).slice(0, count);
    const queue = picks.map(w=> {
      const correct = { en: w.meaning_en || w.english, fa: w.meaning_fa || '' };
      const distractors = pool.filter(x=> x.id!==w.id).sort(()=>0.5-Math.random()).slice(0,12).map(x=> ({ en: x.meaning_en || x.english, fa: x.meaning_fa || '' })).filter(d=> d.en && d.en !== correct.en);
      const uniqMap = new Map();
      for (const d of distractors) if (!uniqMap.has(d.en)) uniqMap.set(d.en,d);
      let uniq=[...uniqMap.values()].slice(0,3);
      while(uniq.length<3) uniq.push({ en:'—', fa:'—'});
      const opts=[...uniq, correct].sort(()=>0.5-Math.random());
      return { word:w, correct, opts };
    });
    setSprintQueue(queue);
    setSprintIdx(0);
    setSprintOptions(queue[0]?.opts || []);
    setSprintScore({ correct:0, total:0, streak:0, best:0, xp:0 });
    setSprintActive(true);
    setSprintTime(45);
    setSprintFeedback(null);
    setQuizMode('sprint');
    setQuizStarted(true);
  }, [quizScopeWords, allWords]);

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
          if (final.xp>0) awardGameXP(final.xp, final.total);
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
    if (!sprintActive || sprintFeedback) return;
    const cur = sprintQueue[sprintIdx];
    const optEn = typeof opt === 'object' ? opt.en : opt;
    const correctEn = typeof cur.correct === 'object' ? cur.correct.en : cur.correct;
    const correct = optEn === correctEn;
    const streak = correct ? sprintScore.streak + 1 : 0;
    const mult = Math.min(2, 1 + streak*0.15);
    const xpAdd = correct ? Math.round(GAME_XP.sprintBase * mult) : 0;
    setSprintFeedback({ correct, expected: cur.correct, xp: xpAdd });
    setSprintScore(s=> ({ correct: s.correct + (correct?1:0), total: s.total+1, streak, best: Math.max(s.best, streak), xp: s.xp + xpAdd }));
    setTimeout(()=> {
      setSprintFeedback(null);
      if (sprintIdx +1 >= sprintQueue.length) {
        const pool = quizScopeWords.length >=8 ? quizScopeWords : allWords;
        const picks = [...pool].sort(()=>0.5-Math.random()).slice(0,8);
        const more = picks.map(w=> {
          const c={ en: w.meaning_en||w.english, fa: w.meaning_fa||''};
          const d=pool.filter(x=>x.id!==w.id).sort(()=>0.5-Math.random()).slice(0,12).map(x=>({ en:x.meaning_en||x.english, fa:x.meaning_fa||''})).filter(Boolean);
          const uniqMap=new Map(); for(const it of d) if(it.en!==c.en && !uniqMap.has(it.en)) uniqMap.set(it.en,it);
          let u=[...uniqMap.values()].slice(0,3); while(u.length<3) u.push({en:'—',fa:'—'});
          const o=[...u,c].sort(()=>0.5-Math.random());
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
    const withSentences = pool.filter(w=> w.example && w.example.split(' ').length >= 4 && w.example.split(' ').length <= 9);
    const picks = [...withSentences].sort(()=>0.5-Math.random()).slice(0, count);
    if (picks.length < 4) {
      setToast('Not enough sentences in this scope — try whole book');
      setTimeout(()=> setToast(null),1800); return;
    }
    const queue = picks.map(w=> {
      const tokens = w.example.replace(/[.!?،؟]/g,'').split(' ').filter(Boolean);
      const shuffled = [...tokens].sort(()=>0.5-Math.random());
      return { word:w, tokens, shuffled, hintEn: w.meaning_en || w.english, hintFa: w.meaning_fa || '' };
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
    if (satzFeedback) return;
    setSatzBuilt(b=> [...b, token]);
    setSatzPool(p=> p.filter((_,i)=> i!==idx));
  };
  const handleSatzRemove = (idx) => {
    if (satzFeedback) return;
    const tok = satzBuilt[idx];
    setSatzBuilt(b=> b.filter((_,i)=> i!==idx));
    setSatzPool(p=> [...p, tok]);
  };
  const checkSatz = () => {
    const cur = satzQueue[satzIdx];
    const builtStr = satzBuilt.join(' ');
    const correctStr = cur.tokens.join(' ');
    const correct = builtStr.trim() === correctStr.trim();
    const xpAdd = correct ? (GAME_XP.scramblePerWord + Math.max(0, 8 - satzBuilt.length)) : 0;
    setSatzFeedback({ correct, expected: correctStr, xp: xpAdd });
    setSatzScore(s=> ({ correct: s.correct + (correct?1:0), total: s.total+1, xp: s.xp + xpAdd }));
    if (xpAdd>0) setTimeout(()=> awardGameXP(xpAdd,1), 300);
    setTimeout(()=> {
      setSatzFeedback(null);
      if (satzIdx +1 >= satzQueue.length) {
        setSatzActive(false);
        if (satzScore.xp + xpAdd > 0) awardGameXP(0,0);
        setToast(`Forge done: ${satzScore.correct + (correct?1:0)}/${satzQueue.length} • +${satzScore.xp + xpAdd} XP`);
        setTimeout(()=> setToast(null),2000);
      } else {
        const ni = satzIdx +1;
        setSatzIdx(ni);
        setSatzBuilt([]);
        setSatzPool(satzQueue[ni].shuffled);
      }
    }, 1400);
  };

  // ===== NEW GAME: WortSturm — Word Rain =====
  const startRainGame = useCallback((count=12) => {
    const pool = quizScopeWords.length >= count ? quizScopeWords : allWords;
    const picks = [...pool].sort(()=>0.5-Math.random()).slice(0,count);
    const queue = picks.map(w=> {
      const correct = { en: w.meaning_en || w.english, fa: w.meaning_fa || '' };
      const distractors = pool.filter(x=> x.id!==w.id).sort(()=>0.5-Math.random()).slice(0,10).map(x=> ({ en: x.meaning_en || x.english, fa: x.meaning_fa||''})).filter(Boolean);
      const uniqMap=new Map(); for(const d of distractors) if(d.en!==correct.en && !uniqMap.has(d.en)) uniqMap.set(d.en,d);
      let uniq=[...uniqMap.values()].slice(0,2); while(uniq.length<2) uniq.push({en:'—',fa:'—'});
      const opts=[...uniq, correct].sort(()=>0.5-Math.random());
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
          const cur = rainQueue[rainIdx];
          setRainFeedback({ correct:false, expected: cur?.correct, timeout:true });
          setRainScore(s=> ({ ...s, total: s.total+1, streak:0 }));
          setRainLives(l=> {
            const nl = l-1;
            if (nl<=0) {
              clearInterval(rainTimerRef.current);
              setRainActive(false);
              const final = { ...rainScoreRef.current, total: rainScoreRef.current.total+1 };
              if (final.xp>0) awardGameXP(final.xp, final.total);
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
              const pool = quizScopeWords.length>=8 ? quizScopeWords : allWords;
              const picks=[...pool].sort(()=>0.5-Math.random()).slice(0,6);
              const more=picks.map(w=> {
                const c={en:w.meaning_en||w.english, fa:w.meaning_fa||''};
                const d=pool.filter(x=>x.id!==w.id).sort(()=>0.5-Math.random()).slice(0,8).map(x=>({en:x.meaning_en||x.english, fa:x.meaning_fa||''})).filter(Boolean);
                const m=new Map(); for(const it of d) if(it.en!==c.en && !m.has(it.en)) m.set(it.en,it);
                let u=[...m.values()].slice(0,2); while(u.length<2) u.push({en:'—',fa:'—'});
                const o=[...u,c].sort(()=>0.5-Math.random());
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
    if (!rainActive || rainFeedback) return;
    const cur = rainQueue[rainIdx];
    const optEn = typeof opt==='object'? opt.en : opt;
    const correctEn = typeof cur.correct==='object'? cur.correct.en : cur.correct;
    const correct = optEn===correctEn;
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
        if (final.xp>0) awardGameXP(final.xp, final.total);
        setToast(`Storm ended: ${final.correct}/${final.total} • +${final.xp} XP`);
        setTimeout(()=> setToast(null),2200);
        return;
      }
      if (rainIdx+1 >= rainQueue.length) {
        const pool = quizScopeWords.length>=8 ? quizScopeWords : allWords;
        const picks=[...pool].sort(()=>0.5-Math.random()).slice(0,6);
        const more=picks.map(w=> {
          const c={en:w.meaning_en||w.english, fa:w.meaning_fa||''};
          const d=pool.filter(x=>x.id!==w.id).sort(()=>0.5-Math.random()).slice(0,8).map(x=>({en:x.meaning_en||x.english, fa:x.meaning_fa||''})).filter(Boolean);
          const m=new Map(); for(const it of d) if(it.en!==c.en && !m.has(it.en)) m.set(it.en,it);
          let u=[...m.values()].slice(0,2); while(u.length<2) u.push({en:'—',fa:'—'});
          const o=[...u,c].sort(()=>0.5-Math.random());
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
        <Tabs activeKey={activeKey} onChange={({ activeKey }) => setActiveKey(activeKey)} overrides={{
            TabBar: { style: { backgroundColor: '#f7f7f7', borderRadius: '999px', paddingTop: '4px', paddingBottom: '4px', paddingLeft: '4px', paddingRight: '4px', marginTop: '16px', overflowX:'auto' } },
            Tab: { style: ({ $active }) => ({ backgroundColor: $active ? '#000' : 'transparent', color: $active ? '#fff' : '#6b6b6b', borderRadius: '999px', fontWeight: 700, fontSize: '12px', flex: 1, whiteSpace:'nowrap' }) },
            TabHighlight: { style: { display: 'none' } },
            TabBorder: { style: { display: 'none' } },
          }}>
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
              <QuizTab quizBook={quizBook} setQuizBook={setQuizBook} quizLektions={quizLektions} setQuizLektions={setQuizLektions} quizBookMeta={quizBookMeta} quizMode={quizMode} setQuizMode={setQuizMode} quizStarted={quizStarted} setQuizStarted={setQuizStarted} quizScopeWords={quizScopeWords} weakIds={weakIds} allWords={allWords} startQuiz={startQuiz} quizQueue={quizQueue} quizIdx={quizIdx} currentQuizWord={currentQuizWord} choiceOptions={choiceOptions} choicePick={choicePick} setChoicePick={setChoicePick} quizAnswer={quizAnswer} setQuizAnswer={setQuizAnswer} quizArtikelChoice={quizArtikelChoice} setQuizArtikelChoice={setQuizArtikelChoice} quizFeedback={quizFeedback} setQuizFeedback={setQuizFeedback} quizScore={quizScore} submitQuiz={submitQuiz} nextQuiz={nextQuiz} insertUmlaut={insertUmlaut} matchBoard={matchBoard} matchMatched={matchMatched} matchMoves={matchMoves} matchDone={matchDone} matchXp={matchXp} handleMatchPick={handleMatchPick} startMatchGame={startMatchGame} matchStarted={matchStarted} setMatchStarted={setMatchStarted} sprintActive={sprintActive} setSprintActive={setSprintActive} sprintQueue={sprintQueue} sprintIdx={sprintIdx} sprintOptions={sprintOptions} sprintTime={sprintTime} sprintScore={sprintScore} sprintFeedback={sprintFeedback} handleSprintPick={handleSprintPick} startSprintGame={startSprintGame} satzQueue={satzQueue} satzIdx={satzIdx} setSatzIdx={setSatzIdx} satzBuilt={satzBuilt} setSatzBuilt={setSatzBuilt} satzPool={satzPool} setSatzPool={setSatzPool} satzFeedback={satzFeedback} setSatzFeedback={setSatzFeedback} satzScore={satzScore} satzActive={satzActive} setSatzActive={setSatzActive} handleSatzPick={handleSatzPick} handleSatzRemove={handleSatzRemove} checkSatz={checkSatz} startSatzGame={startSatzGame} rainQueue={rainQueue} rainIdx={rainIdx} rainOptions={rainOptions} rainTime={rainTime} rainLives={rainLives} rainScore={rainScore} rainFeedback={rainFeedback} rainActive={rainActive} setRainActive={setRainActive} handleRainPick={handleRainPick} startRainGame={startRainGame} />
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
