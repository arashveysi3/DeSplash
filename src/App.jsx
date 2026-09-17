import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { Tabs, Tab } from 'baseui/tabs-motion';
import { Input } from 'baseui/input';
import { Tag } from 'baseui/tag';
import { Block } from 'baseui/block';
import { Heading, HeadingLevel } from 'baseui/heading';
import { LabelSmall, ParagraphSmall, DisplaySmall } from 'baseui/typography';
import { ProgressBar } from 'baseui/progress-bar';
import { Select } from 'baseui/select';
import { Notification } from 'baseui/notification';
import { Spinner } from 'baseui/spinner';
import { db, initDB, getStats, updateStreak, addXP, COMPETITORS, getAllWords, addCustomWord, deleteCustomWord, fetchOnlineLeaderboard, submitOnlineScore, deleteOnlineScore, resetOnlineBoard } from './db';
import { signup, login, fetchMe, logout, fetchUsers, deleteUser, fetchProgress, saveProgress, saveProgressOne, fetchStatsOnline, saveStatsOnline } from './auth';
import { sm2, qualityFromLabel, XP_MAP } from './srs';
import { genderColor, genderBg } from './theme';
import { BOOKS, ALL_MENSCHEN_WORDS, lektionenForBook } from './data/menschen.js';

function isWordMastered(progress) {
  if (!progress) return false;
  const reps = progress.repetition || 0;
  const ease = progress.ease ?? 2.5;
  const lapses = progress.lapses || 0;
  const interval = progress.interval || 0;
  return (reps >= 3 && lapses === 0 && ease >= 2.0) || interval >= 14;
}

function getLektionMastery(lektionWords, progressMap) {
  if (!lektionWords.length) return { total: 0, mastered: 0, seen: 0, pct: 0, masteredPct: 0 };
  let seen = 0, mastered = 0;
  for (const w of lektionWords) {
    const p = progressMap[w.id];
    if (p && (p.repetition > 0 || p.interval > 0 || p.lapses > 0)) seen++;
    if (isWordMastered(p)) mastered++;
  }
  return { total: lektionWords.length, mastered, seen, pct: Math.round((seen / lektionWords.length) * 100), masteredPct: Math.round((mastered / lektionWords.length) * 100) };
}
function getBookMastery(bookKey, allWords, progressMap) {
  const words = allWords.filter(w => w.book === bookKey);
  if (!words.length) return { total: 0, mastered: 0, seen: 0, pct: 0, masteredPct: 0 };
  let seen = 0, mastered = 0;
  for (const w of words) {
    const p = progressMap[w.id];
    if (p && (p.repetition > 0 || p.interval > 0 || p.lapses > 0)) seen++;
    if (isWordMastered(p)) mastered++;
  }
  return { total: words.length, mastered, seen, pct: Math.round((seen / words.length) * 100), masteredPct: Math.round((mastered / words.length) * 100) };
}
// legacy alias for scope progress (uses seen)
function getScopeProgress(words, progressMap) { return getLektionMastery(words, progressMap); }

function UberCard({ children, onClick, styleOverride = {}, bodyStyle = {} }) {
  return (
    <Block
      onClick={onClick}
      overrides={{
        Block: {
          style: {
            backgroundColor: '#fff',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#e5e5e5',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px',
            paddingTop: '16px',
            paddingBottom: '16px',
            paddingLeft: '16px',
            paddingRight: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
            ...styleOverride,
          },
        },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', ...bodyStyle }}>{children}</div>
    </Block>
  );
}

function speakGerman(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  u.rate = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const de = voices.find((v) => v.lang.startsWith('de'));
  if (de) u.voice = de;
  window.speechSynthesis.speak(u);
}

function FlashCard({ word, flipped, setFlipped, onSwipe, onRate, listening, setListening, transcript, setTranscript }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const dragRef = useRef(0);
  const draggingRef = useRef(false);
  const threshold = 75;

  const handleStart = (clientX) => {
    setDragging(true);
    draggingRef.current = true;
    startX.current = clientX;
    dragRef.current = 0;
    setDragX(0);
  };
  const handleMove = (clientX) => {
    if (!draggingRef.current) return;
    const dx = clientX - startX.current;
    dragRef.current = dx;
    setDragX(dx);
  };
  const handleEnd = () => {
    if (!draggingRef.current) return;
    const dx = dragRef.current;
    setDragging(false);
    draggingRef.current = false;
    if (dx > threshold) onSwipe('right');
    else if (dx < -threshold) onSwipe('left');
    dragRef.current = 0;
    setDragX(0);
  };

  const color = genderColor(word.article);
  const bg = genderBg(word.article);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Speech Recognition not supported. Use Chrome.');
      return;
    }
    const rec = new SR();
    rec.lang = 'de-DE';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e) => setTranscript(e.results[0][0].transcript);
    rec.onerror = () => setListening(false);
    rec.start();
  };

  return (
    <div
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      style={{
        touchAction: 'pan-y',
        userSelect: 'none',
        transform: `translateX(${dragX}px) rotate(${dragX / 18}deg)`,
        transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(.2,.8,.2,1)',
        opacity: Math.abs(dragX) > 20 ? 1 - Math.min(Math.abs(dragX) / 300, 0.35) : 1,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 18px',
          pointerEvents: 'none',
          opacity: Math.abs(dragX) > 30 ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      >
        <span style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 12px', borderRadius: '999px', fontWeight: 700, fontSize: 12 }}>AGAIN</span>
        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '6px 12px', borderRadius: '999px', fontWeight: 700, fontSize: 12 }}>KNOWN</span>
      </div>

      <Block
        onClick={() => {
          const next = !flipped;
          setFlipped(next);
          if (next) speakGerman(word.german);
        }}
        overrides={{
          Block: {
            style: {
              backgroundColor: flipped ? bg : '#fff',
              borderWidth: '1.5px',
              borderStyle: 'solid',
              borderColor: flipped ? color : '#000',
              borderRadius: '24px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              minHeight: '400px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: '18px',
            },
          },
        }}
      >
        <Block display="flex" justifyContent="space-between" alignItems="center" marginBottom="12px">
          <Block display="flex" gridGap="6px" alignItems="center">
            <Tag closeable={false} overrides={{ Root: { style: { backgroundColor: '#000', color: '#fff', fontWeight: 700, fontSize: '11px' } } }}>{word.bookLabel || word.level} • {word.lektion}</Tag>
            {word.plural && <Tag closeable={false} overrides={{ Root: { style: { backgroundColor: '#f7f7f7', color: '#6b6b6b', fontSize: '11px' } } }}>Pl: {word.plural}</Tag>}
          </Block>
          <Block display="flex" gridGap="8px" alignItems="center">
            <span style={{ width: 8, height: 8, borderRadius: '999px', background: color, display: 'inline-block' }} />
            <LabelSmall color="#6b6b6b" overrides={{ Block: { style: { textTransform: 'uppercase', fontSize: 11 } } }}>{word.article ? `${word.article} • noun` : word.pos}</LabelSmall>
          </Block>
        </Block>

        {!flipped ? (
          <Block textAlign="center" paddingTop="16px" paddingBottom="16px">
            <div style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, color: word.article ? color : '#000' }}>
              {word.article && <span style={{ fontSize: 18, fontWeight: 600, marginRight: 8, opacity: 0.9 }}>{word.article}</span>}
              {word.german}
            </div>
            {word.plural && <div style={{ fontSize: 13, color: '#6b6b6b', marginTop: 6 }}>Plural: {word.plural}</div>}
            <div style={{ fontSize: 13, color: '#9a9a9a', marginTop: 6, fontFamily: 'Vazirmatn, sans-serif', direction: 'rtl' }}>{word.meaning_fa}</div>
            <ParagraphSmall color="#9a9a9a" marginTop="14px">Tap to reveal • Swipe → Known • Swipe ← Again</ParagraphSmall>
            <Block marginTop="16px" display="flex" justifyContent="center" gridGap="8px">
              <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={(e) => { e.stopPropagation(); speakGerman(word.german); }}>🔊 Listen</Button>
              <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={(e) => { e.stopPropagation(); speakGerman(word.example); }}>💬 Example</Button>
            </Block>
          </Block>
        ) : (
          <Block textAlign="center">
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 14, padding: 12, textAlign: 'left' }}>
                <LabelSmall color="#9a9a9a">English</LabelSmall>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{word.meaning_en || word.english}</div>
                <LabelSmall color="#9a9a9a" marginTop="8px">فارسی</LabelSmall>
                <div style={{ fontWeight: 700, fontSize: 18, fontFamily: 'Vazirmatn, sans-serif', direction: 'rtl' }}>{word.meaning_fa}</div>
                {word.plural && <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 6 }}>Plural: <b>{word.plural}</b></div>}
              </div>
              <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 14, padding: 12, textAlign: 'left' }}>
                <LabelSmall color="#6b6b6b" marginBottom="4px">Beispiel • Example</LabelSmall>
                <div style={{ fontStyle: 'italic', fontSize: 14, lineHeight: 1.4 }}>{word.example}</div>
                <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 4 }}>{word.meaning_en} • <span style={{ fontFamily: 'Vazirmatn', direction: 'rtl' }}>{word.meaning_fa}</span></div>
              </div>
            </div>

            <Block display="flex" justifyContent="center" gridGap="8px" marginTop="12px">
              <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={(e) => { e.stopPropagation(); speakGerman(word.example); }}>🔊 Sentence</Button>
              <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={(e) => { e.stopPropagation(); startListening(); }} isLoading={listening}>🎙️ {listening ? 'Listening...' : 'Pronunciation'}</Button>
            </Block>
            {transcript && (
              <Block marginTop="8px" padding="8px" backgroundColor={transcript.toLowerCase().trim() === word.german.toLowerCase().trim() ? '#dcfce7' : '#fef2f2'} overrides={{ Block: { style: { borderRadius: '8px' } } }}>
                <LabelSmall>You said: “{transcript}” — {transcript.toLowerCase().trim() === word.german.toLowerCase().trim() ? '✅ Perfect!' : `Compare: “${word.german}”`}</LabelSmall>
              </Block>
            )}

            <Block display="flex" gridGap="8px" marginTop="14px">
              {[
                { label: 'Again', color: '#dc2626', bg: '#fef2f2' },
                { label: 'Hard', color: '#ea580c', bg: '#fff7ed' },
                { label: 'Good', color: '#16a34a', bg: '#f0fdf4' },
                { label: 'Easy', color: '#2563eb', bg: '#eff6ff' },
              ].map((b) => (
                <Button key={b.label} size={SIZE.mini} overrides={{ BaseButton: { style: { flex: 1, backgroundColor: b.bg, color: b.color, borderWidth: '1px', borderStyle: 'solid', borderColor: b.color + '30', borderRadius: '12px', fontWeight: 700 } } }} onClick={(e) => { e.stopPropagation(); onRate(b.label); }}>
                  {b.label}<br /><span style={{ fontSize: 10, opacity: 0.7 }}>+{XP_MAP[b.label]} XP</span>
                </Button>
              ))}
            </Block>
            <ParagraphSmall color="#9a9a9a" marginTop="8px" overrides={{ Block: { style: { fontSize: 11 } } }}>Swipe right = Good • Swipe left = Again</ParagraphSmall>
          </Block>
        )}
      </Block>
    </div>
  );
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

  // Book / Lektion scope
  const [selectedBook, setSelectedBook] = useState(() => localStorage.getItem('gs_book') || 'a1.1');
  const [selectedLektion, setSelectedLektion] = useState(() => localStorage.getItem('gs_lektion') || 'all');
  const [bookView, setBookView] = useState(null); // which book detail is open in Books tab
  const [flipped, setFlipped] = useState(false);

  // quiz state
  const [quizMode, setQuizMode] = useState('mixed'); // dictation | artikel | mixed | fa
  const [quizQueue, setQuizQueue] = useState([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0, xp: 0 });
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizArtikelChoice, setQuizArtikelChoice] = useState('');
  const [quizBook, setQuizBook] = useState(() => localStorage.getItem('gs_quiz_book') || 'a1.1');
  const [quizLektion, setQuizLektion] = useState(() => localStorage.getItem('gs_quiz_lektion') || 'all');

  // pack study
  const [packWords, setPackWords] = useState([]);
  const [packIdx, setPackIdx] = useState(0);
  const [packAnswers, setPackAnswers] = useState([]);
  const [packSize, setPackSize] = useState(10);
  const [showPackSummary, setShowPackSummary] = useState(false);
  const [pendingProgress, setPendingProgress] = useState({});
  const [isSavingPack, setIsSavingPack] = useState(false);

  useEffect(()=>{ localStorage.setItem('gs_book', selectedBook); },[selectedBook]);
  useEffect(()=>{ localStorage.setItem('gs_lektion', selectedLektion); },[selectedLektion]);
  useEffect(()=>{ localStorage.setItem('gs_quiz_book', quizBook); },[quizBook]);
  useEffect(()=>{ localStorage.setItem('gs_quiz_lektion', quizLektion); },[quizLektion]);

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

  // scope words helper
  const scopeWords = useMemo(()=>{
    const book = selectedBook;
    const lek = selectedLektion;
    if (!book) return allWords;
    let w = allWords.filter(x=> x.book === book);
    if (lek && lek !== 'all') w = w.filter(x=> x.lektion === lek);
    if (search.trim()) {
      const q = search.toLowerCase();
      w = w.filter(x => x.german.toLowerCase().includes(q) || (x.meaning_en||x.english||'').toLowerCase().includes(q) || (x.meaning_fa||'').includes(q) || x.lektion.toLowerCase().includes(q));
    }
    return w;
  }, [allWords, selectedBook, selectedLektion, search]);

  const quizScopeWords = useMemo(()=>{
    let w = allWords.filter(x=> x.book === quizBook);
    if (quizLektion && quizLektion !== 'all') w = w.filter(x=> x.lektion === quizLektion);
    return w;
  }, [allWords, quizBook, quizLektion]);

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
  const prevScopeKey = useRef(`${selectedBook}::${selectedLektion}`);
  useEffect(()=>{
    const key = `${selectedBook}::${selectedLektion}`;
    if (prevScopeKey.current !== key) {
      prevScopeKey.current = key;
      sessionReviewedIds.current.clear();
      setPackWords([]); setPackIdx(0); setPackAnswers([]); setPendingProgress({}); setShowPackSummary(false); setFlipped(false);
    }
  },[selectedBook, selectedLektion]);

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
    // prioritize weak within scope
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

  const startQuiz = (mode, count=10) => {
    const q = buildQuizQueue(count, mode);
    if (q.length===0) { setToast('No words for this scope/mode'); setTimeout(()=> setToast(null),1500); return; }
    setQuizMode(mode);
    setQuizQueue(q);
    setQuizIdx(0);
    setQuizAnswer('');
    setQuizArtikelChoice('');
    setQuizFeedback(null);
    setQuizScore({ correct:0, total:0, xp:0 });
    setQuizStarted(true);
    setTimeout(()=> { if ((mode==='dictation' || mode==='mixed') && q[0]) { const w=q[0]; if (mode==='dictation' || (mode==='mixed' && !w.article)) speakGerman(w.german); } }, 300);
  };

  const currentQuizWord = quizQueue[quizIdx] || null;

  const submitQuiz = async () => {
    if (!currentQuizWord) return;
    const isArtikelQ = quizMode==='artikel' || (quizMode==='mixed' && currentQuizWord.article && quizIdx %2===0);
    const isFaQ = quizMode==='fa';
    let correct = false;
    let xpAdd = 0;
    if (isArtikelQ) {
      correct = quizArtikelChoice === currentQuizWord.article;
      xpAdd = correct ? 10 : 0;
    } else if (isFaQ) {
      const ans = quizAnswer.trim();
      const expected = (currentQuizWord.meaning_fa||'').trim();
      correct = ans === expected;
      xpAdd = correct ? 15 : 0;
    } else {
      const expected = currentQuizWord.german;
      const ans = quizAnswer.trim();
      const expNorm = expected.trim();
      const expFullNorm = (currentQuizWord.fullGerman||expected).trim();
      correct = ans === expNorm || ans === expFullNorm;
      if (!correct) correct = ans.toLowerCase() === expNorm.toLowerCase() || ans.toLowerCase() === expFullNorm.toLowerCase();
      xpAdd = correct ? 15 : 0;
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
    }
    setQuizScore(sc=> ({ correct: sc.correct + (correct?1:0), total: sc.total+1, xp: sc.xp + xpAdd }));
    setQuizFeedback({ correct, expected: currentQuizWord.article ? `${currentQuizWord.article} ${currentQuizWord.german}` : currentQuizWord.german, expectedFa: currentQuizWord.meaning_fa, xp: xpAdd });
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
    setQuizFeedback(null);
    const w = quizQueue[nextIdx];
    const isArtikelNext = quizMode==='artikel' || (quizMode==='mixed' && w.article && nextIdx %2===0);
    if (!isArtikelNext && quizMode !== 'fa') setTimeout(()=> speakGerman(w.german), 250);
  };

  const insertUmlaut = (ch) => setQuizAnswer(a=> a + ch);

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
      const w = await addCustomWord({ german: newCard.german.trim(), english: newCard.english.trim(), article: newCard.article || null, plural: newCard.plural.trim(), level: newCard.level || 'Custom', book: newCard.book || selectedBook, lektion: newCard.lektion || selectedLektion, example: newCard.example.trim() || `Ich lerne "${newCard.german}".`, exampleEn: newCard.exampleEn.trim() || `I learn "${newCard.english}".`, pos, meaning_fa: newCard.englishFa.trim() });
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

  return (
    <HeadingLevel>
      <Block display="flex" justifyContent="space-between" alignItems="center" overrides={{ Block: { style: { position: 'sticky', top: 0, zIndex: 10, background: '#fff', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: '#eee', paddingTop: 'calc(12px + env(safe-area-inset-top))', paddingBottom: '12px', paddingLeft: '16px', paddingRight: '16px' } } }}>
        <Block display="flex" alignItems="center" gridGap="10px">
          <div style={{ width: 36, height: 36, background: '#000', color: '#fff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>GS</div>
          <Block>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px', lineHeight: 1 }}>GermanSplash</div>
            <div style={{ fontSize: 11, color: '#6b6b6b', letterSpacing: '0.3px' }}>MENSCHEN • {BOOKS[0].total + BOOKS[1].total} words • a1.1 + a1.2</div>
          </Block>
        </Block>
        <Block display="flex" alignItems="center" gridGap="6px">
          <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setShowAdd(true)}>＋ Add</Button>
          {authUser ? (
            <Block display="flex" alignItems="center" gridGap="6px">
              <Block backgroundColor="#000" color="#fff" padding="6px 10px" overrides={{ Block: { style: { borderRadius: '999px', fontWeight: 700, fontSize: '12px', display:'flex', alignItems:'center', gap:'6px' } } }}>
                <span style={{width:20,height:20, borderRadius:'999px', background:'#fff', color:'#000', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:10}}>{authUser.username.slice(0,2).toUpperCase()}</span>
                {authUser.username}{authUser.isAdmin ? ' ★' : ''}
              </Block>
              <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={handleLogout}>Logout</Button>
            </Block>
          ) : (
            <Button size={SIZE.mini} kind={KIND.primary} shape={SHAPE.pill} onClick={()=> { setAuthMode('login'); setShowAuth(true); }}>Login</Button>
          )}
          <Block backgroundColor="#fff7ed" padding="6px 8px" overrides={{ Block: { style: { borderRadius: '999px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#ffedd5', display: 'flex', alignItems: 'center', gap: '6px' } } }}>
            <span style={{ fontSize: 14 }}>🔥</span>
            <span style={{ fontWeight: 800, fontSize: 13 }}>{stats.streak}</span>
          </Block>
          <Block backgroundColor="#000" color="#fff" padding="6px 10px" overrides={{ Block: { style: { borderRadius: '999px', fontWeight: 700, fontSize: '12px' } } }}>{stats.xp} XP</Block>
        </Block>
      </Block>

      {toast && (
        <Block overrides={{ Block: { style: { position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 } } }}>
          <Notification overrides={{ Body: { style: { backgroundColor: '#000', color: '#fff', borderRadius: '999px', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '16px', paddingRight: '16px', fontWeight: 700, fontSize: '13px' } } }}>{toast}</Notification>
        </Block>
      )}

      {showAdd && (
        <Block overrides={{ Block: { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' } } }} onClick={()=> setShowAdd(false)}>
          <Block onClick={(e)=> e.stopPropagation()} overrides={{ Block: { style: { background: '#fff', borderRadius: '20px', padding: '20px', width: '100%', maxWidth: '420px', maxHeight: '85vh', overflowY: 'auto' } } }}>
            <Heading $style={{ fontSize: 18, marginTop: 0 }}>Add custom card</Heading>
            <ParagraphSmall color="#6b6b6b">Saved to {selectedBookMeta?.label} • {selectedLektion !== 'all' ? selectedLektion : 'Whole book'}</ParagraphSmall>
            <Block display="flex" flexDirection="column" gridGap="10px" marginTop="12px">
              <Input value={newCard.german} onChange={(e)=> setNewCard({...newCard, german: e.target.value})} placeholder="German word (e.g. Mädchen)" overrides={{ Root: { style: { borderRadius: '12px' } } }} />
              <Input value={newCard.english} onChange={(e)=> setNewCard({...newCard, english: e.target.value})} placeholder="English (e.g. girl)" overrides={{ Root: { style: { borderRadius: '12px' } } }} />
              <Input value={newCard.englishFa} onChange={(e)=> setNewCard({...newCard, englishFa: e.target.value})} placeholder="فارسی (e.g. دختر)" overrides={{ Root: { style: { borderRadius: '12px' } } }} />
              <Block display="flex" gridGap="8px">
                <Select options={[{id:'', label:'— no article'},{id:'der', label:'der (m)'},{id:'die', label:'die (f)'},{id:'das', label:'das (n)'}]} value={newCard.article ? [{id:newCard.article, label:newCard.article}] : []} placeholder="Article" onChange={({value})=> setNewCard({...newCard, article: value[0]?.id || ''})} size="compact" />
                <Input value={newCard.plural} onChange={e=> setNewCard({...newCard, plural:e.target.value})} placeholder="Plural" overrides={{Root:{style:{borderRadius:'12px'}}}} />
              </Block>
              <Input value={newCard.example} onChange={(e)=> setNewCard({...newCard, example: e.target.value})} placeholder="Example sentence (optional)" />
              <Block display="flex" gridGap="8px" marginTop="8px">
                <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setShowAdd(false)}>Cancel</Button>
                <Button shape={SHAPE.pill} onClick={handleAddCard}>Add card</Button>
              </Block>
            </Block>
          </Block>
        </Block>
      )}
      {showAuth && (
        <Block overrides={{ Block: { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' } } }} onClick={()=> setShowAuth(false)}>
          <Block onClick={(e)=> e.stopPropagation()} overrides={{ Block: { style: { background: '#fff', borderRadius: '20px', padding: '20px', width: '100%', maxWidth: '400px' } } }}>
            <Heading $style={{ fontSize: 18, marginTop: 0 }}>{authMode==='login' ? 'Login' : 'Sign up'}</Heading>
            <ParagraphSmall color="#6b6b6b">{authMode==='login' ? 'Welcome back! Your progress is saved per account.' : 'Create account — admin is username "admin".'}</ParagraphSmall>
            <Block display="flex" flexDirection="column" gridGap="10px" marginTop="12px">
              <Input value={authForm.username} onChange={e=> setAuthForm({...authForm, username: e.target.value})} placeholder="Username (a-z, 0-9, _ -)" overrides={{Root:{style:{borderRadius:'12px'}}}} />
              {authMode==='signup' && <Input value={authForm.email} onChange={e=> setAuthForm({...authForm, email: e.target.value})} placeholder="Email (optional)" overrides={{Root:{style:{borderRadius:'12px'}}}} />}
              <Input type="password" value={authForm.password} onChange={e=> setAuthForm({...authForm, password: e.target.value})} placeholder="Password (min 4)" overrides={{Root:{style:{borderRadius:'12px'}}}} />
              <Block display="flex" gridGap="8px" marginTop="8px">
                <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setShowAuth(false)}>Cancel</Button>
                {authMode==='login' ? <Button shape={SHAPE.pill} onClick={handleLogin}>Login</Button> : <Button shape={SHAPE.pill} onClick={handleSignup}>Sign up</Button>}
              </Block>
              <Button kind={KIND.tertiary} size={SIZE.mini} onClick={()=> setAuthMode(authMode==='login' ? 'signup' : 'login')}>{authMode==='login' ? 'Need account? Sign up' : 'Have account? Login'}</Button>
            </Block>
          </Block>
        </Block>
      )}

      <Block maxWidth="620px" width="100%" margin="0 auto" padding="0 16px 100px">
        <Tabs activeKey={activeKey} onChange={({ activeKey }) => setActiveKey(activeKey)} overrides={{
            TabBar: { style: { backgroundColor: '#f7f7f7', borderRadius: '999px', paddingTop: '4px', paddingBottom: '4px', paddingLeft: '4px', paddingRight: '4px', marginTop: '16px', overflowX:'auto' } },
            Tab: { style: ({ $active }) => ({ backgroundColor: $active ? '#000' : 'transparent', color: $active ? '#fff' : '#6b6b6b', borderRadius: '999px', fontWeight: 700, fontSize: '12px', flex: 1, whiteSpace:'nowrap' }) },
            TabHighlight: { style: { display: 'none' } },
            TabBorder: { style: { display: 'none' } },
          }}>
          {/* BÜCHER */}
          <Tab title="📚 Bücher">
            <Block paddingTop="16px">
              {!bookView ? (
                <>
                  <Block marginBottom="12px">
                    <Heading $style={{fontSize:22, margin:'0 0 4px', letterSpacing:'-0.5px'}}>Wähle dein Buch</Heading>
                    <ParagraphSmall color="#6b6b6b" margin="0">Menschen A1 — 24 Lektionen • 885 Wörter • Deutsch + English + فارسی</ParagraphSmall>
                  </Block>
                  <Block display="flex" flexDirection="column" gridGap="12px">
                    {BOOKS.map(book=>{
                      const mastery = getBookMastery(book.id, allWords, progressMap);
                      const isSelected = selectedBook===book.id;
                      return (
                        <Block key={book.id} onClick={()=> setBookView(book.id)} overrides={{Block:{style:{cursor:'pointer', background: book.gradient, borderRadius:'20px', padding:'18px', color:'#fff', position:'relative', overflow:'hidden', border: isSelected ? '3px solid #000' : '1px solid rgba(255,255,255,0.2)', boxShadow: isSelected ? '0 8px 24px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.08)'}}}}>
                          <div style={{position:'absolute', right:-10, top:-10, fontSize:90, opacity:0.15, transform:'rotate(-12deg)'}}>{book.coverEmoji}</div>
                          <Block display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Block>
                              <div style={{fontSize:12, letterSpacing:1, opacity:0.9, fontWeight:700}}>{book.levels} • {book.publisher}</div>
                              <div style={{fontSize:22, fontWeight:800, marginTop:4}}>{book.label}</div>
                              <div style={{fontSize:12, opacity:0.85, marginTop:2}}>{book.title} • {book.isbn}</div>
                              <Block display="flex" gridGap="6px" marginTop="12px">
                                <span style={{background:'rgba(255,255,255,0.2)', padding:'4px 10px', borderRadius:999, fontSize:11, fontWeight:700}}>{book.total} Wörter</span>
                                <span style={{background: isSelected ? '#fff' : 'rgba(255,255,255,0.2)', color: isSelected ? '#000' : '#fff', padding:'4px 10px', borderRadius:999, fontSize:11, fontWeight:700}}>{isSelected ? '✓ Selected' : 'Tap to open'}</span>
                              </Block>
                            </Block>
                            <div style={{textAlign:'right'}}>
                              <div style={{fontSize:28, fontWeight:800}}>{mastery.pct}%</div>
                              <div style={{fontSize:11, opacity:0.8}}>{mastery.seen}/{mastery.total} seen • {mastery.mastered} mastered</div>
                            </div>
                          </Block>
                          <div style={{height:6, background:'rgba(255,255,255,0.3)', borderRadius:999, marginTop:14, overflow:'hidden'}}>
                            <div style={{height:'100%', width:`${mastery.pct}%`, background:'#fff', borderRadius:999, transition:'width 0.5s'}} />
                          </div>
                          <Block display="flex" gridGap="8px" marginTop="14px">
                            <Button size={SIZE.mini} kind={KIND.primary} shape={SHAPE.pill} overrides={{BaseButton:{style:{backgroundColor:'#fff', color:'#000', fontWeight:700}}}} onClick={(e)=>{e.stopPropagation(); setSelectedBook(book.id); setSelectedLektion('all'); setActiveKey('1');}}>📖 Whole book — Study</Button>
                            <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} overrides={{BaseButton:{style:{backgroundColor:'rgba(255,255,255,0.2)', color:'#fff', backdropFilter:'blur(8px)'}}}} onClick={(e)=>{e.stopPropagation(); setBookView(book.id);}}>Lektionen →</Button>
                          </Block>
                        </Block>
                      );
                    })}
                  </Block>
                  <UberCard styleOverride={{marginTop:'12px', backgroundColor:'#f7f7f7', borderColor:'#e5e5e5'}}>
                    <LabelSmall>Current scope</LabelSmall>
                    <div style={{fontWeight:700, marginTop:4}}>{selectedBookMeta?.label} • {selectedLektion==='all' ? 'Whole book' : selectedLektion} • {scopeWords.length} words</div>
                    <Block display="flex" gridGap="8px" marginTop="10px">
                      <Button size={SIZE.mini} shape={SHAPE.pill} onClick={()=> setActiveKey('1')}>Go to Study →</Button>
                      <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> { setQuizBook(selectedBook); setQuizLektion(selectedLektion); setActiveKey('2');}}>Quiz this scope</Button>
                    </Block>
                  </UberCard>
                </>
              ) : (
                <>
                  {(() => {
                    const book = BOOKS.find(b=> b.id===bookView);
                    const lektions = lektionenForBook(bookView);
                    return (
                      <>
                        <Block display="flex" alignItems="center" gridGap="8px" marginBottom="12px">
                          <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setBookView(null)}>← All books</Button>
                          <Tag closeable={false} overrides={{Root:{style:{background: book.gradient, color:'#fff', fontWeight:700}}}}>{book.label}</Tag>
                          <LabelSmall color="#6b6b6b">{book.levels}</LabelSmall>
                        </Block>
                        <Block overrides={{Block:{style:{background: book.gradient, borderRadius:'16px', padding:'16px', color:'#fff'}}}}>
                          <Block display="flex" justifyContent="space-between" alignItems="center">
                            <Block>
                              <div style={{fontWeight:800, fontSize:18}}>{book.label} — Alle Lektionen</div>
                              <div style={{fontSize:12, opacity:0.9}}>{book.total} Wörter • Tap a Lektion to focus</div>
                            </Block>
                            <Button size={SIZE.mini} shape={SHAPE.pill} overrides={{BaseButton:{style:{backgroundColor:'#fff', color:'#000', fontWeight:700}}}} onClick={()=> { setSelectedBook(book.id); setSelectedLektion('all'); setActiveKey('1'); }}>Study whole book</Button>
                          </Block>
                        </Block>
                        <Block display="grid" gridGap="10px" marginTop="12px" overrides={{Block:{style:{gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))'}}}}>
                          {lektions.map(l=>{
                            const words = allWords.filter(w=> w.book===l.book && w.lektion===l.lektion);
                            const mastery = getLektionMastery(words, progressMap);
                            const isActive = selectedBook===l.book && selectedLektion===l.lektion;
                            return (
                              <UberCard key={l.key} styleOverride={{ borderColor: isActive ? '#000' : '#e5e5e5', backgroundColor: isActive ? '#f7f7f7' : '#fff', borderWidth: isActive ? '2px' : '1px' }}>
                                <Block display="flex" justifyContent="space-between" alignItems="flex-start">
                                  <Block>
                                    <div style={{fontSize:11, letterSpacing:1, color:'#6b6b6b', fontWeight:700}}>{l.lektion}</div>
                                    <div style={{fontWeight:800, fontSize:14, marginTop:2}}>{l.title}</div>
                                    <div style={{fontSize:11, color:'#9a9a9a', marginTop:2, lineHeight:1.3}}>{l.theme}</div>
                                  </Block>
                                  <div style={{textAlign:'right', flexShrink:0, marginLeft:8}}>
                                    <div style={{fontWeight:800, fontSize:16, color: mastery.pct>=80 ? '#16a34a' : mastery.pct>=40 ? '#ea580c' : '#000'}}>{mastery.pct}%</div>
                                    <div style={{fontSize:10, color:'#6b6b6b'}}>{mastery.seen}/{mastery.total} seen • {mastery.mastered}★</div>
                                  </div>
                                </Block>
                                <div style={{height:6, background:'#eee', borderRadius:999, marginTop:10, overflow:'hidden'}}>
                                  <div style={{height:'100%', width:`${mastery.pct}%`, background: mastery.pct>=80 ? '#16a34a' : mastery.pct>=40 ? '#000' : '#9a9a9a', borderRadius:999, transition:'width 0.5s'}}/>
                                </div>
                                <Block display="flex" justifyContent="space-between" alignItems="center" marginTop="8px">
                                  <LabelSmall color="#6b6b6b">{words.length} words • {mastery.mastered} mastered</LabelSmall>
                                  <LabelSmall color={mastery.pct>=80 ? '#16a34a' : '#9a9a9a'}>{mastery.pct>=80 ? '✓ Studied' : mastery.pct>=30 ? '● In progress' : '○ Not started'}</LabelSmall>
                                </Block>
                                <Block display="flex" gridGap="6px" marginTop="10px">
                                  <Button size={SIZE.mini} shape={SHAPE.pill} overrides={{BaseButton:{style:{flex:1, fontWeight:700, backgroundColor: isActive ? '#000' : undefined, color: isActive ? '#fff' : undefined}}}} onClick={()=> { setSelectedBook(l.book); setSelectedLektion(l.lektion); setActiveKey('1'); }}>{isActive? '● Studying' : 'Study'}</Button>
                                  <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} overrides={{BaseButton:{style:{flex:1}}}} onClick={()=> { setQuizBook(l.book); setQuizLektion(l.lektion); setActiveKey('2');}}>Quiz</Button>
                                  <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.circle} onClick={()=> speakGerman(words[0]?.german || l.title)}>🔊</Button>
                                </Block>
                              </UberCard>
                            );
                          })}
                        </Block>
                      </>
                    );
                  })()}
                </>
              )}
            </Block>
          </Tab>

          <Tab title="Lernen">
            <Block paddingTop="16px">
              {/* Scope selector */}
              <UberCard styleOverride={{backgroundColor:'#f7f7f7', borderColor:'#e5e5e5', paddingTop:'12px', paddingBottom:'12px'}}>
                <Block display="flex" justifyContent="space-between" alignItems="center">
                  <Block>
                    <LabelSmall color="#6b6b6b">Scope</LabelSmall>
                    <div style={{fontWeight:800, fontSize:14}}>{selectedBookMeta?.label} • {selectedLektion==='all' ? 'Whole book' : selectedLektion}</div>
                    <div style={{fontSize:11, color:'#6b6b6b'}}>{scopeWords.length} words • {weakForScope.length} weak</div>
                  </Block>
                  <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setActiveKey('0')}>Change book →</Button>
                </Block>
                <Block display="flex" gridGap="8px" marginTop="10px" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
                  <Select options={BOOKS.map(b=> ({id:b.id, label:b.label}))} value={[{id:selectedBook, label:selectedBookMeta?.label}]} onChange={({value})=> { if(value[0]) { setSelectedBook(value[0].id); setSelectedLektion('all'); }}} size="compact" overrides={{ControlContainer:{style:{minWidth:'140px', borderRadius:'999px'}}}} />
                  <Select options={[{id:'all', label:'Whole book'}, ...lektionenForBook(selectedBook).map(l=> ({id:l.lektion, label: `${l.lektion} — ${l.title.slice(0,18)}…`}))]} value={selectedLektion==='all' ? [{id:'all', label:'Whole book'}] : [{id:selectedLektion, label:selectedLektion}]} onChange={({value})=> setSelectedLektion(value[0]?.id || 'all')} size="compact" overrides={{ControlContainer:{style:{minWidth:'160px', borderRadius:'999px'}}}} />
                  <Select options={[{id:10, label:'10 / pack'},{id:20, label:'20 / pack'},{id:50, label:'50 / pack'}]} value={[{id:packSize, label:`${packSize} / pack`}]} onChange={({value})=> setPackSize(value[0].id)} size="compact" overrides={{ ControlContainer: { style: { minWidth: '110px', borderRadius:'999px' } } }} />
                </Block>
                <Block display="flex" gridGap="8px" marginTop="10px">
                  <Button size={SIZE.mini} shape={SHAPE.pill} onClick={startNewPack}>New pack</Button>
                  <LabelSmall color="#6b6b6b" overrides={{Block:{style:{alignSelf:'center'}}}}>{studyQueue.length} due in scope</LabelSmall>
                </Block>
              </UberCard>

              {packWords.length > 0 && !showPackSummary ? (
                <>
                  <Block display="flex" justifyContent="space-between" alignItems="center" marginTop="12px" marginBottom="8px">
                    <LabelSmall color="#6b6b6b">Pack {packIdx+1}/{packWords.length} • {packAnswers.length} answered</LabelSmall>
                    <LabelSmall color="#000" overrides={{ Block: { style: { fontWeight: 700 } } }}>{Math.round((packIdx/packWords.length)*100)}%</LabelSmall>
                  </Block>
                  <ProgressBar value={(packIdx/packWords.length)*100} overrides={{ Bar: { style: { height: '4px' } }, BarProgress: { style: { backgroundColor: '#000' } }, BarContainer: { style: { backgroundColor: '#eee', height: '4px', borderRadius: '999px' } } }} />
                  <Block marginTop="16px">
                    <FlashCard word={packWords[packIdx]} flipped={flipped} setFlipped={setFlipped} onSwipe={handlePackSwipe} onRate={handlePackRate} listening={listening} setListening={setListening} transcript={transcript} setTranscript={setTranscript} />
                  </Block>
                  <Block display="flex" justifyContent="center" marginTop="12px">
                    <LabelSmall color="#9a9a9a">{packWords.length - packIdx - 1} remaining • saves at end (no lag)</LabelSmall>
                  </Block>
                </>
              ) : showPackSummary ? (
                <UberCard styleOverride={{textAlign:'center', paddingTop:'24px', paddingBottom:'24px', backgroundColor:'#f7f7f7', borderColor:'#e5e5e5', marginTop:'12px'}}>
                  <div style={{fontSize:36}}>🎉</div>
                  <Heading $style={{fontSize:18, margin:'8px 0 0'}}>Pack complete!</Heading>
                  <ParagraphSmall margin="8px 0 0">{packAnswers.filter(a=>a.correct).length}/{packAnswers.length} correct • +{packAnswers.reduce((a,b)=>a+b.xp,0)} XP • {selectedBookMeta?.label} {selectedLektion}</ParagraphSmall>
                  <Block display="flex" gridGap="8px" justifyContent="center" marginTop="12px" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
                    {packAnswers.map((a,i)=>(
                      <Tag key={i} closeable={false} overrides={{Root:{style:{backgroundColor: a.correct ? '#dcfce7' : '#fee2e2', color: a.correct ? '#16a34a' : '#dc2626', borderRadius:'999px'}}}}>{a.word.german}: {a.label}</Tag>
                    ))}
                  </Block>
                  <Block display="flex" gridGap="8px" justifyContent="center" marginTop="16px">
                    <Button shape={SHAPE.pill} onClick={savePack} isLoading={isSavingPack}>Save & next pack</Button>
                    <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> { setShowPackSummary(false); setPackAnswers([]); setPendingProgress({}); startNewPack(); }}>Discard</Button>
                  </Block>
                  <ParagraphSmall color="#9a9a9a" margin="8px 0 0">Saves {Object.keys(pendingProgress).length} cards + stats to {authUser ? 'cloud' : 'local'} in one batch.</ParagraphSmall>
                </UberCard>
              ) : (
                <UberCard styleOverride={{ backgroundColor: '#f7f7f7', borderColor: '#e5e5e5', textAlign: 'center', paddingTop: '30px', paddingBottom: '30px', marginTop:'12px' }}>
                  <div style={{ fontSize: 32 }}>📦</div>
                  <Heading $style={{fontSize:16}}>Ready for a pack?</Heading>
                  <ParagraphSmall color="#6b6b6b">Scoped to <b>{selectedBookMeta?.label} {selectedLektion==='all' ? '— whole book' : selectedLektion}</b> • {scopeWords.length} words. Preloads {packSize} cards and saves once at the end.</ParagraphSmall>
                  <Block marginTop="12px" display="flex" justifyContent="center"><Button shape={SHAPE.pill} onClick={startNewPack}>Start {packSize}-word pack</Button></Block>
                  {studyQueue.length===0 && <ParagraphSmall color="#dc2626" margin="8px 0 0">No due words for this scope — try another Lektion or whole book.</ParagraphSmall>}
                  <Block display="flex" justifyContent="center" gridGap="16px" marginTop="16px">
                    <Block display="flex" alignItems="center" gridGap="6px"><span style={{ width: 10, height: 10, borderRadius: '999px', background: '#2563eb' }} /><LabelSmall>der</LabelSmall></Block>
                    <Block display="flex" alignItems="center" gridGap="6px"><span style={{ width: 10, height: 10, borderRadius: '999px', background: '#dc2626' }} /><LabelSmall>die</LabelSmall></Block>
                    <Block display="flex" alignItems="center" gridGap="6px"><span style={{ width: 10, height: 10, borderRadius: '999px', background: '#16a34a' }} /><LabelSmall>das</LabelSmall></Block>
                  </Block>
                </UberCard>
              )}

              {(() => { const m = getLektionMastery(scopeWords, progressMap); return (
                <UberCard styleOverride={{marginTop:'12px', paddingTop:'12px', paddingBottom:'12px'}}>
                  <Block display="flex" justifyContent="space-between" alignItems="center">
                    <LabelSmall>Scope progress — {m.seen}/{m.total} seen • {m.mastered} mastered</LabelSmall>
                    <LabelSmall color="#000" overrides={{Block:{style:{fontWeight:700}}}}>{m.pct}% seen • {m.masteredPct}% mastered</LabelSmall>
                  </Block>
                  <div style={{height:6, background:'#eee', borderRadius:999, marginTop:8, overflow:'hidden'}}>
                    <div style={{height:'100%', width:`${m.pct}%`, background:'#000', borderRadius:999, transition:'width 0.5s'}}/>
                  </div>
                  <div style={{height:4, background:'#dcfce7', borderRadius:999, marginTop:4, overflow:'hidden'}}>
                    <div style={{height:'100%', width:`${m.masteredPct}%`, background:'#16a34a', borderRadius:999, transition:'width 0.5s'}}/>
                  </div>
                  <ParagraphSmall color="#9a9a9a" margin="4px 0 0">Gray = studied, green = mastered (3× Good, interval ≥14d)</ParagraphSmall>
                </UberCard>
              ); })()}
            </Block>
          </Tab>

          <Tab title="Quiz">
            <Block paddingTop="16px">
              {!quizStarted ? (
                <>
                  <UberCard styleOverride={{ backgroundColor:'#f7f7f7', borderColor:'#e5e5e5' }}>
                    <Heading $style={{fontSize:16, margin:0}}>Quiz — scoped to book & Lektion</Heading>
                    <ParagraphSmall color="#6b6b6b">Dictation (ä ö ü ß), Artikel, and فارسی modes. Only words from your selected book/Lektion.</ParagraphSmall>
                    <Block display="flex" gridGap="8px" marginTop="10px" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
                      <Select options={BOOKS.map(b=> ({id:b.id, label:b.label}))} value={[{id:quizBook, label: quizBookMeta?.label}]} onChange={({value})=> setQuizBook(value[0].id)} size="compact" overrides={{ControlContainer:{style:{minWidth:'140px', borderRadius:'999px'}}}} />
                      <Select options={[{id:'all', label:'Whole book'}, ...lektionenForBook(quizBook).map(l=> ({id:l.lektion, label: l.lektion}))]} value={quizLektion==='all' ? [{id:'all', label:'Whole book'}] : [{id:quizLektion, label:quizLektion}]} onChange={({value})=> setQuizLektion(value[0]?.id || 'all')} size="compact" overrides={{ControlContainer:{style:{minWidth:'140px', borderRadius:'999px'}}}} />
                    </Block>
                    <Block display="flex" gridGap="8px" marginTop="12px" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
                      <Button size={SIZE.compact} shape={SHAPE.pill} kind={quizMode==='dictation'?KIND.primary:KIND.secondary} onClick={()=> setQuizMode('dictation')}>Dictation DE</Button>
                      <Button size={SIZE.compact} shape={SHAPE.pill} kind={quizMode==='artikel'?KIND.primary:KIND.secondary} onClick={()=> setQuizMode('artikel')}>Artikel</Button>
                      <Button size={SIZE.compact} shape={SHAPE.pill} kind={quizMode==='mixed'?KIND.primary:KIND.secondary} onClick={()=> setQuizMode('mixed')}>Mixed</Button>
                      <Button size={SIZE.compact} shape={SHAPE.pill} kind={quizMode==='fa'?KIND.primary:KIND.secondary} onClick={()=> setQuizMode('fa')}>DE → فارسی</Button>
                    </Block>
                    <Block display="flex" gridGap="8px" marginTop="12px">
                      <Button shape={SHAPE.pill} onClick={()=> startQuiz(quizMode, 5)}>Start 5</Button>
                      <Button shape={SHAPE.pill} kind={KIND.secondary} onClick={()=> startQuiz(quizMode, 10)}>Start 10</Button>
                      <Button shape={SHAPE.pill} kind={KIND.secondary} onClick={()=> startQuiz(quizMode, 20)}>Start 20</Button>
                    </Block>
                    <ParagraphSmall color="#9a9a9a" marginTop="8px">{quizScopeWords.length} words in {quizBookMeta?.label} {quizLektion==='all' ? 'whole book' : quizLektion} • {quizScopeWords.filter(w=> weakIds.has(w.id)).length} weak • {quizScopeWords.filter(w=> w.article).length} nouns</ParagraphSmall>
                  </UberCard>
                  <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
                    <UberCard styleOverride={{paddingTop:'12px', paddingBottom:'12px'}}>
                      <ParagraphSmall margin={0}><b>Dictation:</b> Hear German → type exact word (<b>ä ö ü Ä Ö Ü ß</b> strict). Toolbar below input. +15 XP.</ParagraphSmall>
                    </UberCard>
                    <UberCard styleOverride={{paddingTop:'12px', paddingBottom:'12px'}}>
                      <ParagraphSmall margin={0}><b>Artikel:</b> Pick <span style={{color:genderColor('der'), fontWeight:700}}>der</span> / <span style={{color:genderColor('die'), fontWeight:700}}>die</span> / <span style={{color:genderColor('das'), fontWeight:700}}>das</span>. +10 XP.</ParagraphSmall>
                    </UberCard>
                    <UberCard styleOverride={{paddingTop:'12px', paddingBottom:'12px'}}>
                      <ParagraphSmall margin={0}><b>فارسی:</b> See German → type Persian meaning exactly (from JSON). Great for recall. +15 XP.</ParagraphSmall>
                    </UberCard>
                  </Block>
                </>
              ) : (
                <>
                  <Block display="flex" justifyContent="space-between" alignItems="center" marginBottom="8px">
                    <LabelSmall color="#6b6b6b">Quiz {quizIdx+1}/{quizQueue.length} • {quizMode} • {quizBookMeta?.label} {quizLektion}</LabelSmall>
                    <LabelSmall color="#000" overrides={{Block:{style:{fontWeight:700}}}}>{quizScore.correct}/{quizScore.total} • {quizScore.xp} XP</LabelSmall>
                  </Block>
                  <ProgressBar value={quizQueue.length ? (quizIdx/quizQueue.length)*100 : 0} overrides={{ BarProgress:{style:{backgroundColor:'#000'}}, BarContainer:{style:{backgroundColor:'#eee', height:'4px', borderRadius:'999px'}}, Bar:{style:{height:'4px'}} }} />
                  {currentQuizWord && (
                    <UberCard styleOverride={{marginTop:'12px', minHeight:'280px'}}>
                      {(quizMode==='artikel' || (quizMode==='mixed' && currentQuizWord.article && quizIdx %2===0)) ? (
                        <Block textAlign="center">
                          <LabelSmall color="#6b6b6b">ARTIKEL — Wähle den Artikel</LabelSmall>
                          <div style={{fontSize:28, fontWeight:800, marginTop:8}}>{currentQuizWord.german} <span style={{fontWeight:400, color:'#6b6b6b', fontSize:14}}>- {currentQuizWord.meaning_en}</span></div>
                          <div style={{fontSize:12, color:'#9a9a9a', marginTop:4, fontFamily:'Vazirmatn', direction:'rtl'}}>{currentQuizWord.meaning_fa}</div>
                          <div style={{fontSize:12, color:'#9a9a9a', marginTop:4}}>{currentQuizWord.lektion} • {currentQuizWord.example}</div>
                          {!quizFeedback ? (
                            <Block display="flex" gridGap="8px" marginTop="16px" justifyContent="center">
                              {['der','die','das'].map(a=>(
                                <Button key={a} shape={SHAPE.pill} kind={quizArtikelChoice===a?KIND.primary:KIND.secondary} onClick={()=> setQuizArtikelChoice(a)} overrides={{BaseButton:{style:{flex:1, backgroundColor: quizArtikelChoice===a ? genderColor(a) : undefined, borderColor: genderColor(a)}}}}>{a}</Button>
                              ))}
                            </Block>
                          ) : (
                            <Block marginTop="12px" padding="10px" backgroundColor={quizFeedback.correct ? '#dcfce7' : '#fef2f2'} overrides={{Block:{style:{borderRadius:'12px'}}}}>
                              <LabelSmall>{quizFeedback.correct ? '✅ Correct!' : `Was "${quizFeedback.expected}"`} {quizFeedback.correct ? `+${quizFeedback.xp} XP` : ''}</LabelSmall>
                              {quizFeedback.expectedFa && <div style={{fontFamily:'Vazirmatn', direction:'rtl', fontSize:12, color:'#6b6b6b'}}>{quizFeedback.expectedFa}</div>}
                            </Block>
                          )}
                          {!quizFeedback ? (
                            <Button shape={SHAPE.pill} disabled={!quizArtikelChoice} onClick={submitQuiz} overrides={{BaseButton:{style:{marginTop:'16px', width:'100%'}}}}>Check</Button>
                          ) : (
                            <Button shape={SHAPE.pill} onClick={nextQuiz} overrides={{BaseButton:{style:{marginTop:'16px', width:'100%'}}}}>{quizIdx+1>=quizQueue.length ? 'Finish' : 'Next'}</Button>
                          )}
                        </Block>
                      ) : quizMode==='fa' ? (
                        <Block textAlign="center">
                          <LabelSmall color="#6b6b6b">FARSI — Tippe die persische Bedeutung</LabelSmall>
                          <div style={{fontSize:22, fontWeight:800, marginTop:8}}>{currentQuizWord.german} <span style={{color: genderColor(currentQuizWord.article), fontSize:14, fontWeight:600}}>{currentQuizWord.article || ''}</span></div>
                          <div style={{fontSize:12, color:'#6b6b6b'}}>{currentQuizWord.meaning_en} • {currentQuizWord.lektion}</div>
                          <Block marginTop="10px">
                            <Button size={SIZE.mini} shape={SHAPE.pill} onClick={()=> speakGerman(currentQuizWord.german)}>🔊 German</Button>
                          </Block>
                          {!quizFeedback ? (
                            <>
                              <Input value={quizAnswer} onChange={(e)=> setQuizAnswer(e.target.value)} placeholder="فارسی را تایپ کنید..." onKeyDown={(e)=> { if(e.key==='Enter') submitQuiz(); }} autoFocus overrides={{ Root:{style:{marginTop:'12px', borderRadius:'12px'}}}} />
                              <Button shape={SHAPE.pill} disabled={!quizAnswer.trim()} onClick={submitQuiz} overrides={{BaseButton:{style:{marginTop:'12px', width:'100%'}}}}>Check</Button>
                            </>
                          ) : (
                            <>
                              <Block marginTop="12px" padding="10px" backgroundColor={quizFeedback.correct ? '#dcfce7' : '#fef2f2'} overrides={{Block:{style:{borderRadius:'12px'}}}}>
                                <LabelSmall>{quizFeedback.correct ? `Correct! "${quizFeedback.expectedFa}" +${quizFeedback.xp} XP` : `"${quizAnswer.trim()}" is wrong → "${quizFeedback.expectedFa}"`}</LabelSmall>
                              </Block>
                              <Button shape={SHAPE.pill} onClick={nextQuiz} overrides={{BaseButton:{style:{marginTop:'12px', width:'100%'}}}}>{quizIdx+1>=quizQueue.length ? 'Finish' : 'Next'}</Button>
                            </>
                          )}
                        </Block>
                      ) : (
                        <Block textAlign="center">
                          <LabelSmall color="#6b6b6b">DICTATION — Höre und tippe (Umlaute wichtig!)</LabelSmall>
                          <DisplaySmall $style={{fontSize:16, color:'#6b6b6b', marginTop:'8px'}}>{currentQuizWord.meaning_en} — {currentQuizWord.lektion}</DisplaySmall>
                          <div style={{fontFamily:'Vazirmatn', direction:'rtl', fontSize:13, color:'#9a9a9a'}}>{currentQuizWord.meaning_fa}</div>
                          <Block marginTop="12px">
                            <Button size={SIZE.compact} shape={SHAPE.pill} onClick={()=> speakGerman(currentQuizWord.german)}>▶ Play German</Button>
                            <Button size={SIZE.compact} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> speakGerman(currentQuizWord.example)} overrides={{BaseButton:{style:{marginLeft:'8px'}}}}>Sentence</Button>
                          </Block>
                          {!quizFeedback ? (
                            <>
                              <Input value={quizAnswer} onChange={(e)=> setQuizAnswer(e.target.value)} placeholder="Tippe das deutsche Wort..." onKeyDown={(e)=> { if(e.key==='Enter') submitQuiz(); }} autoFocus overrides={{ Root:{style:{marginTop:'12px', borderRadius:'12px'}}}} />
                              <Block display="flex" gridGap="6px" marginTop="8px" justifyContent="center" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
                                {['ä','ö','ü','Ä','Ö','Ü','ß'].map(ch=>(
                                  <Button key={ch} size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.circle} onClick={()=> insertUmlaut(ch)}>{ch}</Button>
                                ))}
                                <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setQuizAnswer('')}>Clear</Button>
                              </Block>
                              <Button shape={SHAPE.pill} disabled={!quizAnswer.trim()} onClick={submitQuiz} overrides={{BaseButton:{style:{marginTop:'12px', width:'100%'}}}}>Check</Button>
                            </>
                          ) : (
                            <>
                              <Block marginTop="12px" padding="10px" backgroundColor={quizFeedback.correct ? '#dcfce7' : '#fef2f2'} overrides={{Block:{style:{borderRadius:'12px'}}}}>
                                <LabelSmall>{quizFeedback.correct ? `Correct! "${quizFeedback.expected}" +${quizFeedback.xp} XP` : `"${quizAnswer.trim()}" → "${quizFeedback.expected}"`}</LabelSmall>
                                {!quizFeedback.correct && <ParagraphSmall margin="4px 0 0">Umlaute: ä ≠ a, ö ≠ o, ü ≠ u, ß ≠ ss</ParagraphSmall>}
                              </Block>
                              <Button shape={SHAPE.pill} onClick={nextQuiz} overrides={{BaseButton:{style:{marginTop:'12px', width:'100%'}}}}>{quizIdx+1>=quizQueue.length ? 'Finish' : 'Next'}</Button>
                            </>
                          )}
                        </Block>
                      )}
                    </UberCard>
                  )}
                  <Block marginTop="12px" display="flex" justifyContent="center">
                    <Button kind={KIND.secondary} size={SIZE.mini} shape={SHAPE.pill} onClick={()=> { setQuizStarted(false); setQuizFeedback(null); }}>Exit quiz</Button>
                  </Block>
                </>
              )}
            </Block>
          </Tab>

          <Tab title="Suche">
            <Block paddingTop="16px">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suche German, English, فارسی oder Lektion..." clearable size="compact" overrides={{ Root: { style: { backgroundColor: '#f7f7f7', borderColor: '#e5e5e5', borderRadius: '999px', paddingTop: '4px', paddingBottom: '4px' } }, Input: { style: { fontSize: '14px' } } }} startEnhancer="🔍" />
              <Block display="flex" gridGap="6px" marginTop="12px" overrides={{ Block: { style: { flexWrap: 'wrap' } } }}>
                {BOOKS.map(b=> <Tag key={b.id} closeable={false} variant={selectedBook===b.id ? 'solid' : 'outlined'} onClick={() => setSelectedBook(b.id)}>{b.label}</Tag>)}
                <Tag closeable={false} variant="outlined" onClick={() => setSearch('')}>Clear</Tag>
              </Block>
              <LabelSmall color="#6b6b6b" marginTop="12px">{filteredWordsForSearch.length} results {search && `for “${search}”`}</LabelSmall>
              <Block display="flex" flexDirection="column" gridGap="8px" marginTop="8px" overrides={{ Block: { style: { maxHeight: '62vh', overflowY: 'auto', paddingBottom: '20px' } } }}>
                {filteredWordsForSearch.slice(0, 80).map((w) => (
                  <UberCard key={w.id} onClick={() => speakGerman(w.german)} styleOverride={{ cursor: 'pointer', backgroundColor: w.article ? genderBg(w.article) : '#fff', borderColor: w.article ? genderColor(w.article) + '30' : '#eee' }}>
                    <Block display="flex" justifyContent="space-between" alignItems="center">
                      <Block>
                        <div style={{ fontWeight: 700, fontSize: 14, color: w.article ? genderColor(w.article) : '#000' }}>
                          {w.article && <span style={{ fontSize: 11, marginRight: 6, opacity: 0.8 }}>{w.article}</span>}
                          {w.german} <span style={{ fontWeight: 400, color: '#6b6b6b' }}>— {w.meaning_en || w.english}</span>
                          <span style={{ fontWeight:400, color:'#9a9a9a', fontFamily:'Vazirmatn', direction:'rtl', marginLeft:6 }}>— {w.meaning_fa}</span>
                          {w.isCustom ? <span style={{ fontSize:10, background:'#000', color:'#fff', borderRadius:'999px', padding:'1px 6px', marginLeft:6 }}>custom</span>:null}
                        </div>
                        <div style={{ fontSize: 11, color: '#9a9a9a' }}>{w.lektion} • {w.bookLabel} {w.plural ? `• Pl: ${w.plural}` : ''}</div>
                        <div style={{ fontSize: 12, color: '#6b6b6b', fontStyle: 'italic', marginTop: 2 }}>{w.example}</div>
                      </Block>
                      <Block display="flex" gridGap="6px" alignItems="center">
                        <Tag closeable={false} overrides={{ Root: { style: { backgroundColor: '#000', color: '#fff', flexShrink: 0 } } }}>{w.lektion}</Tag>
                        {w.isCustom && <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.circle} onClick={(e)=> {e.stopPropagation(); handleDeleteCustom(w.id);}}>×</Button>}
                      </Block>
                    </Block>
                  </UberCard>
                ))}
                {filteredWordsForSearch.length > 80 && <LabelSmall color="#9a9a9a">Showing 80 of {filteredWordsForSearch.length}. Refine search.</LabelSmall>}
              </Block>
            </Block>
          </Tab>

          <Tab title={`Weak (${weakWords.length})`}>
            <Block paddingTop="16px">
              <UberCard styleOverride={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
                <Block display="flex" justifyContent="space-between" alignItems="center">
                  <Block>
                    <Heading $style={{ fontSize: 16, margin: 0 }}>Mistake Bank</Heading>
                    <ParagraphSmall margin="4px 0 0" color="#991b1b">Failed cards auto-collected. Filtered to current scope: {selectedBookMeta?.label} {selectedLektion}</ParagraphSmall>
                  </Block>
                  <div style={{ fontSize: 28 }}>⚠️</div>
                </Block>
                {weakWords.length > 0 && (
                  <Block marginTop="12px" display="flex" gridGap="8px" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
                    <Button size={SIZE.mini} shape={SHAPE.pill} kind={KIND.primary} onClick={()=> { const w = weakForScope.slice(0, packSize); if(!w.length){ setToast('No weak in this scope'); setTimeout(()=> setToast(null),1500); return; } setPackWords(w); setPackIdx(0); setPackAnswers([]); setPendingProgress({}); setShowPackSummary(false); setFlipped(false); setActiveKey('1'); }}>Practice Weak ({weakForScope.length})</Button>
                    <Button size={SIZE.mini} shape={SHAPE.pill} kind={KIND.secondary} onClick={()=> { setQuizBook(selectedBook); setQuizLektion(selectedLektion); setTimeout(()=> startQuiz('mixed', Math.min(10, weakForScope.length)), 100); setActiveKey('2');}}>Quiz Weak</Button>
                    <LabelSmall color="#6b6b6b" overrides={{Block:{style:{alignSelf:'center'}}}}>{weakForScope.length} in scope • {weakWords.length} total</LabelSmall>
                  </Block>
                )}
              </UberCard>
              <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
                {weakWords.length === 0 ? (
                  <UberCard styleOverride={{ textAlign: 'center', paddingTop: '30px', paddingBottom: '30px' }}><ParagraphSmall>No weak words yet. Cards marked “Again” appear here.</ParagraphSmall></UberCard>
                ) : (
                  (scopeWords.filter(w=> weakIds.has(w.id)).length ? scopeWords.filter(w=> weakIds.has(w.id)) : weakWords).slice(0, 60).map((w) => (
                    <UberCard key={w.id} styleOverride={{ borderColor: '#fecaca' }}>
                      <Block display="flex" justifyContent="space-between" alignItems="center">
                        <div><span style={{ fontWeight: 700, color: genderColor(w.article) }}>{w.fullGerman || (w.article? `${w.article} ${w.german}`: w.german)}</span> <span style={{ color: '#6b6b6b' }}>— {w.meaning_en || w.english}</span> <span style={{fontFamily:'Vazirmatn', direction:'rtl', color:'#9a9a9a'}}>— {w.meaning_fa}</span> <span style={{ fontSize: 11, background: '#000', color: '#fff', borderRadius: '999px', padding: '2px 6px', marginLeft: 6 }}>{w.lektion}</span></div>
                        <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={() => speakGerman(w.german)}>🔊</Button>
                      </Block>
                      <div style={{ fontSize: 12, fontStyle: 'italic', color: '#6b6b6b', marginTop: 6 }}>{w.example}</div>
                      {w.plural && <div style={{fontSize:11, color:'#9a9a9a'}}>Plural: {w.plural}</div>}
                    </UberCard>
                  ))
                )}
              </Block>
            </Block>
          </Tab>

          <Tab title="Board">
            <Block paddingTop="16px">
              <UberCard styleOverride={{ backgroundColor: '#000', borderWidth: 0, borderRadius: '20px', paddingTop: '12px' }}>
                <Block display="flex" justifyContent="space-between" alignItems="center">
                  <Block>
                    <LabelSmall color="#a3a3a3" overrides={{ Block: { style: { letterSpacing: '1px', textTransform: 'uppercase' } } }}>Your rank</LabelSmall>
                    <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: '#fff' }}>#{leaderboard.rank} <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.7 }}>/ {leaderboard.all.length}</span></div>
                    <div style={{ fontSize: 13, color: '#d4d4d4' }}>{selectedBookMeta?.label} • {stats.xp} XP • {stats.totalReviews} reviews • 🔥 {stats.streak} streak</div>
                  </Block>
                  <Block backgroundColor="white" color="black" padding="12px 16px" overrides={{ Block: { style: { borderRadius: '16px', textAlign: 'center' } } }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{stats.xp}</div>
                    <div style={{ fontSize: 10, letterSpacing: '1px', fontWeight: 700 }}>TOTAL XP</div>
                  </Block>
                </Block>
                <Block marginTop="12px" display="flex" justifyContent="space-between">
                  <LabelSmall color="#a3a3a3">{Math.max(0, (leaderboard.all[0]?.xp || 0) - stats.xp)} XP to #1</LabelSmall>
                  <LabelSmall color="#fff" overrides={{ Block: { style: { fontWeight: 700 } } }}>Season ends in 12 days</LabelSmall>
                </Block>
                <Block marginTop="12px" display="flex" gridGap="8px">
                  <Input value={username} onChange={(e)=> { setUsername(e.target.value); localStorage.setItem('gs_username', e.target.value); }} placeholder="Your name" size="compact" overrides={{ Root:{style:{backgroundColor:'#1a1a1a', borderColor:'#333', borderRadius:'999px' }}, Input:{style:{color:'#fff'}}}} />
                  <Button size={SIZE.compact} kind={KIND.secondary} shape={SHAPE.pill} onClick={async()=> {
                    if(!username.trim()) { setOnlineError('Enter a name first'); setTimeout(()=> setOnlineError(null),1500); return; }
                    const b = await submitOnlineScore(username.trim(), stats.xp);
                    if (b) { setOnlineBoard(b); setUseOnline(true); setToast('Score synced online ✓'); } else { setOnlineError('Online not configured'); }
                    setTimeout(()=> setToast(null),1500); setTimeout(()=> setOnlineError(null),2500);
                  }}>Sync</Button>
                </Block>
                {onlineError && <ParagraphSmall color="#fca5a5" marginTop="8px">{onlineError}</ParagraphSmall>}
                <Block display="flex" gridGap="8px" marginTop="8px">
                  <Button size={SIZE.mini} kind={useOnline?KIND.primary:KIND.secondary} shape={SHAPE.pill} onClick={()=> setUseOnline(false)}>Local</Button>
                  <Button size={SIZE.mini} kind={useOnline?KIND.secondary:KIND.primary} shape={SHAPE.pill} onClick={async()=> { const b=await fetchOnlineLeaderboard(); if(b){ setOnlineBoard(b); setUseOnline(true);} else setOnlineError('Online not available'); setTimeout(()=> setOnlineError(null),3000); }}>{onlineBoard ? 'Online ✓' : 'Online'}</Button>
                  <LabelSmall color="#6b6b6b" overrides={{Block:{style:{alignSelf:'center'}}}}>{useOnline ? 'Synced board' : 'Local mock board'}</LabelSmall>
                </Block>
              </UberCard>

              <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
                {leaderboard.all.map((p, i) => (
                  <UberCard key={p.name} styleOverride={{ borderColor: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#000' : '#eee', backgroundColor: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#f7f7f7' : '#fff', borderWidth: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '2px' : '1px' }}>
                    <Block display="flex" justifyContent="space-between" alignItems="center">
                      <Block display="flex" alignItems="center" gridGap="12px">
                        <div style={{ width: 32, height: 32, borderRadius: '999px', background: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#000' : '#eee', color: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#fff' : '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11 }}>#{i + 1}</div>
                        <div style={{ width: 36, height: 36, borderRadius: '999px', background: '#fff', border: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{p.avatar}</div>
                        <Block>
                          <div style={{ fontWeight: p.name.toLowerCase()=== (username||'You').toLowerCase() ? 800 : 600, fontSize: 14 }}>{p.name} {p.name.toLowerCase()=== (username||'You').toLowerCase() && '• You'}</div>
                          <div style={{ fontSize: 11, color: '#6b6b6b' }}>{p.xp} XP</div>
                        </Block>
                      </Block>
                      <Block display="flex" alignItems="center" gridGap="8px">
                        {i < 3 && <span style={{ fontSize: 18 }}>{['🥇', '🥈', '🥉'][i]}</span>}
                        {adminMode && <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.circle} onClick={async()=> { const b = await deleteOnlineScore(p.name, adminToken); if(b){ setOnlineBoard(b); setToast(`Deleted ${p.name}`); } else setOnlineError('Delete failed'); setTimeout(()=> setToast(null),1500); setTimeout(()=> setOnlineError(null),2000); }}>×</Button>}
                      </Block>
                    </Block>
                  </UberCard>
                ))}
              </Block>
              <Block display="flex" justifyContent="space-between" alignItems="center" marginTop="12px">
                <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setAdminMode(!adminMode)}>{adminMode ? 'Exit admin' : 'Admin'}</Button>
                {adminMode && <LabelSmall color="#dc2626">Admin: tap × to delete</LabelSmall>}
              </Block>
              {adminMode && (
                <UberCard styleOverride={{marginTop:'8px', backgroundColor:'#fef2f2', borderColor:'#fecaca'}}>
                  <LabelSmall>Admin</LabelSmall>
                  <Input value={adminToken} onChange={e=> { setAdminToken(e.target.value); localStorage.setItem('gs_admin_token', e.target.value); }} placeholder="Admin token" size="compact" overrides={{Root:{style:{marginTop:'8px', borderRadius:'12px'}}}} />
                  <Block display="flex" gridGap="8px" marginTop="8px">
                    <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={async()=> { const b = await resetOnlineBoard(adminToken); if(b){ setOnlineBoard(b); setUseOnline(true); setToast('Board reset'); } else setOnlineError('Reset failed'); setTimeout(()=> setOnlineError(null),2000); setTimeout(()=> setToast(null),1500); }}>Reset</Button>
                    <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={async()=> { const b = await fetchOnlineLeaderboard(); if(b) setOnlineBoard(b); setUseOnline(true); }}>Refresh</Button>
                  </Block>
                </UberCard>
              )}
            </Block>
          </Tab>
          <Tab title="Profile">
            <Block paddingTop="16px">
              {!authUser ? (
                <UberCard styleOverride={{textAlign:'center', paddingTop:'30px', paddingBottom:'30px'}}>
                  <div style={{fontSize:40}}>👤</div>
                  <Heading $style={{fontSize:18}}>Not logged in</Heading>
                  <ParagraphSmall color="#6b6b6b">Sign up to save your XP, streak and weak words online. Works offline too.</ParagraphSmall>
                  <Block display="flex" gridGap="8px" justifyContent="center" marginTop="12px">
                    <Button shape={SHAPE.pill} onClick={()=> { setAuthMode('login'); setShowAuth(true); }}>Login</Button>
                    <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> { setAuthMode('signup'); setShowAuth(true); }}>Sign up</Button>
                  </Block>
                </UberCard>
              ) : (
                <>
                  <UberCard styleOverride={{backgroundColor:'#000', color:'#fff', borderWidth:0, borderRadius:'20px'}}>
                    <Block display="flex" justifyContent="space-between" alignItems="center">
                      <Block>
                        <div style={{fontSize:22, fontWeight:800}}>{authUser.username} {authUser.isAdmin && <span style={{fontSize:12, background:'#fff', color:'#000', padding:'2px 6px', borderRadius:'999px'}}>ADMIN</span>}</div>
                        <div style={{fontSize:12, color:'#d4d4d4'}}>{authUser.email || 'No email'} • Joined {new Date(authUser.createdAt).toLocaleDateString()}</div>
                        <div style={{fontSize:13, color:'#fff', marginTop:6}}>{selectedBookMeta?.label} • {stats.xp} XP • 🔥 {stats.streak} streak • {stats.totalReviews} reviews</div>
                      </Block>
                      <div style={{width:48,height:48, borderRadius:'999px', background:'#fff', color:'#000', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800}}>{authUser.username.slice(0,2).toUpperCase()}</div>
                    </Block>
                    <Block display="flex" gridGap="8px" marginTop="12px">
                      <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={handleLogout}>Logout</Button>
                      <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={async()=> { const b=await fetchOnlineLeaderboard(); if(b) setOnlineBoard(b); setUseOnline(true); setToast('Synced ✓'); setTimeout(()=> setToast(null),1200); }}>Sync XP</Button>
                    </Block>
                  </UberCard>
                  <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
                    <UberCard>
                      <LabelSmall>Progress — {selectedBookMeta?.label} {selectedLektion}</LabelSmall>
                      {(() => { const m = getLektionMastery(scopeWords, progressMap); return (
                        <>
                          <Block display="flex" justifyContent="space-between" alignItems="center" marginTop="8px">
                            <div style={{fontSize:22, fontWeight:800}}>{m.pct}% <span style={{fontSize:12, fontWeight:400}}>seen</span> <span style={{fontSize:14, color:'#16a34a'}}>• {m.masteredPct}% mas.</span></div>
                            <div style={{fontSize:12, color:'#6b6b6b'}}>{m.seen}/{m.total} seen • {m.mastered}★</div>
                          </Block>
                          <div style={{height:8, background:'#eee', borderRadius:999, marginTop:8, overflow:'hidden'}}>
                            <div style={{height:'100%', width:`${m.pct}%`, background: '#000', borderRadius:999, transition:'width 0.5s'}} />
                          </div>
                          <div style={{height:6, background:'#dcfce7', borderRadius:999, marginTop:6, overflow:'hidden'}}>
                            <div style={{height:'100%', width:`${m.masteredPct}%`, background: '#16a34a', borderRadius:999, transition:'width 0.5s'}} />
                          </div>
                          <ParagraphSmall color="#6b6b6b" marginTop="4px">{m.masteredPct >= 80 ? 'Mastered! Try next Lektion.' : `Study to see green grow — ${80 - m.masteredPct}% mastered to unlock`}</ParagraphSmall>
                        </>
                      );})()}
                    </UberCard>
                    <Block display="flex" gridGap="8px">
                      {BOOKS.map(b=> {
                        const m = getBookMastery(b.id, allWords, progressMap);
                        return (
                          <UberCard key={b.id} styleOverride={{flex:1, paddingTop:'12px', paddingBottom:'12px', background: b.gradient, color:'#fff', borderWidth:0}}>
                            <LabelSmall color="white">{b.label}</LabelSmall>
                            <div style={{fontWeight:800, fontSize:18}}>{m.pct}% <span style={{fontSize:10, opacity:0.8}}>seen</span></div>
                            <div style={{fontSize:11, opacity:0.9}}>{m.seen}/{m.total} seen • {m.mastered}★ {m.masteredPct}% mas.</div>
                          </UberCard>
                        );
                      })}
                    </Block>
                    <UberCard>
                      <LabelSmall>Stats</LabelSmall>
                      <Block display="flex" justifyContent="space-between" marginTop="8px">
                        <ParagraphSmall>Weak in scope</ParagraphSmall><ParagraphSmall>{weakForScope.length}</ParagraphSmall>
                      </Block>
                      <Block display="flex" justifyContent="space-between">
                        <ParagraphSmall>Total weak</ParagraphSmall><ParagraphSmall>{weakWords.length}</ParagraphSmall>
                      </Block>
                      <Block display="flex" justifyContent="space-between">
                        <ParagraphSmall>Custom cards</ParagraphSmall><ParagraphSmall>{allWords.filter(w=>w.isCustom).length}</ParagraphSmall>
                      </Block>
                      <Block display="flex" justifyContent="space-between">
                        <ParagraphSmall>Total words</ParagraphSmall><ParagraphSmall>{allWords.length}</ParagraphSmall>
                      </Block>
                    </UberCard>
                  </Block>
                </>
              )}
            </Block>
          </Tab>
          {authUser?.isAdmin && (
            <Tab title="Admin">
              <Block paddingTop="16px">
                <UberCard styleOverride={{backgroundColor:'#fef2f2', borderColor:'#fecaca'}}>
                  <Heading $style={{fontSize:16, margin:0}}>Admin — User management</Heading>
                  <ParagraphSmall color="#991b1b">You are admin ({authUser.username}).</ParagraphSmall>
                  <Block display="flex" gridGap="8px" marginTop="8px">
                    <Button size={SIZE.mini} shape={SHAPE.pill} onClick={loadUsersList}>Refresh users</Button>
                    <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={async()=> { const b=await resetOnlineBoard(adminToken); if(b){ setOnlineBoard(b); setUseOnline(true); setToast('Leaderboard reset'); } setTimeout(()=> setToast(null),1500); }}>Reset board</Button>
                  </Block>
                </UberCard>
                <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
                  {usersList.length===0 ? <ParagraphSmall color="#6b6b6b">No users loaded. Tap Refresh.</ParagraphSmall> :
                    usersList.map(u=>(
                      <UberCard key={u.username} styleOverride={{paddingTop:'12px', paddingBottom:'12px'}}>
                        <Block display="flex" justifyContent="space-between" alignItems="center">
                          <Block>
                            <div style={{fontWeight:700}}>{u.username} {u.isAdmin && <span style={{fontSize:10, background:'#000', color:'#fff', padding:'1px 5px', borderRadius:'999px'}}>admin</span>} <span style={{fontSize:11, color:'#6b6b6b'}}>• {u.xp} XP • {u.email || 'no email'}</span></div>
                            <div style={{fontSize:11, color:'#9a9a9a'}}>Joined {new Date(u.createdAt).toLocaleDateString()} • {u.streak||0} streak • {u.totalReviews||0} reviews</div>
                          </Block>
                          <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.circle} onClick={async()=> { if(!confirm(`Delete ${u.username}?`)) return; const r=await deleteUser(u.username); if(r){ setUsersList(usersList.filter(x=> x.username!==u.username)); const b=await fetchOnlineLeaderboard(); if(b) setOnlineBoard(b); setToast(`Deleted ${u.username}`); setTimeout(()=> setToast(null),1500); } else { setToast('Delete failed'); setTimeout(()=> setToast(null),1500); } }}>×</Button>
                        </Block>
                      </UberCard>
                    ))
                  }
                </Block>
              </Block>
            </Tab>
          )}
        </Tabs>
      </Block>

      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </HeadingLevel>
  );
}
