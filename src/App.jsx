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
import { db, initDB, getStats, updateStreak, addXP, COMPETITORS, getAllWords, addCustomWord, deleteCustomWord, fetchOnlineLeaderboard, submitOnlineScore } from './db';
import { sm2, qualityFromLabel, XP_MAP } from './srs';
import { genderColor, genderBg } from './theme';
import wordsData from './data/words.js';

// -- Uber-style Card using Block (avoids baseui Card hasThumbnail bug) --
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

function normalizeInput(s) {
  return s.trim();
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
      alert('Speech Recognition not supported on this browser. Use Chrome/Safari iOS.');
      return;
    }
    const rec = new SR();
    rec.lang = 'de-DE';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setTranscript(t);
    };
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
        <span style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 12px', borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', fontWeight: 700, fontSize: 12, transform: dragX < -30 ? 'scale(1)' : 'scale(0.8)' }}>FORGOT</span>
        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '6px 12px', borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', fontWeight: 700, fontSize: 12, transform: dragX > 30 ? 'scale(1)' : 'scale(0.8)' }}>KNEW IT</span>
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
              borderTopColor: flipped ? color : '#000',
              borderBottomColor: flipped ? color : '#000',
              borderLeftColor: flipped ? color : '#000',
              borderRightColor: flipped ? color : '#000',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              borderBottomLeftRadius: '24px',
              borderBottomRightRadius: '24px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              minHeight: '380px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              overflow: 'hidden',
              paddingTop: '16px',
              paddingBottom: '16px',
              paddingLeft: '16px',
              paddingRight: '16px',
            },
          },
        }}
      >
        <Block display="flex" justifyContent="space-between" alignItems="center" marginBottom="16px">
          <Tag closeable={false} overrides={{ Root: { style: { backgroundColor: '#000', color: '#fff', fontWeight: 700, fontSize: '11px' } } }}>{word.level}</Tag>
          <Block display="flex" gridGap="8px" alignItems="center">
            <span style={{ width: 8, height: 8, borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', background: color, display: 'inline-block' }} />
            <LabelSmall color="#6b6b6b" overrides={{ Block: { style: { textTransform: 'uppercase' } } }}>{word.article ? `${word.article} • ${word.pos}` : word.pos}</LabelSmall>
          </Block>
        </Block>

        {!flipped ? (
          <Block textAlign="center" paddingTop="24px" paddingBottom="24px">
            <div style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, color: word.article ? color : '#000' }}>
              {word.article && <span style={{ fontSize: 18, fontWeight: 600, marginRight: 8, opacity: 0.9 }}>{word.article}</span>}
              {word.german}
            </div>
            <ParagraphSmall color="#9a9a9a" marginTop="12px">Tap to reveal • Swipe to answer</ParagraphSmall>
            <Block marginTop="16px">
              <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={(e) => { e.stopPropagation(); speakGerman(word.german); }}>🔊 Listen</Button>
            </Block>
          </Block>
        ) : (
          <Block textAlign="center">
            <DisplaySmall overrides={{ Block: { style: { fontWeight: 800, fontSize: '30px', lineHeight: '1.2' } } }}>{word.english}</DisplaySmall>
            <Block marginTop="16px" backgroundColor="white" padding="12px" overrides={{ Block: { style: { borderTopLeftRadius: '14px', borderTopRightRadius: '14px', borderBottomLeftRadius: '14px', borderBottomRightRadius: '14px', borderWidth: '1px', borderStyle: 'solid', borderTopColor: '#eee', borderBottomColor: '#eee', borderLeftColor: '#eee', borderRightColor: '#eee', textAlign: 'left' } } }}>
              <LabelSmall color="#6b6b6b" marginBottom="4px">Beispiel • Example</LabelSmall>
              <div style={{ fontStyle: 'italic', fontSize: 15, lineHeight: 1.4 }}>{word.example}</div>
              <div style={{ fontSize: 13, color: '#6b6b6b', marginTop: 4 }}>{word.exampleEn}</div>
            </Block>

            <Block display="flex" justifyContent="center" gridGap="8px" marginTop="16px">
              <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={(e) => { e.stopPropagation(); speakGerman(word.example); }}>🔊 Sentence</Button>
              <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={(e) => { e.stopPropagation(); startListening(); }} isLoading={listening}>🎙️ {listening ? 'Listening...' : 'Check pronunciation'}</Button>
            </Block>
            {transcript && (
              <Block marginTop="8px" padding="8px" backgroundColor={transcript.toLowerCase().trim() === word.german.toLowerCase().trim() ? '#dcfce7' : '#fef2f2'} overrides={{ Block: { style: { borderTopLeftRadius: '8px', borderTopRightRadius: '8px', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' } } }}>
                <LabelSmall>You said: “{transcript}” — {transcript.toLowerCase().trim() === word.german.toLowerCase().trim() ? '✅ Perfect!' : `Compare: “${word.german}”`}</LabelSmall>
              </Block>
            )}

            <Block display="flex" gridGap="8px" marginTop="16px">
              {[
                { label: 'Again', color: '#dc2626', bg: '#fef2f2' },
                { label: 'Hard', color: '#ea580c', bg: '#fff7ed' },
                { label: 'Good', color: '#16a34a', bg: '#f0fdf4' },
                { label: 'Easy', color: '#2563eb', bg: '#eff6ff' },
              ].map((b) => (
                <Button key={b.label} size={SIZE.mini} overrides={{ BaseButton: { style: { flex: 1, backgroundColor: b.bg, color: b.color, borderWidth: '1px', borderStyle: 'solid', borderTopColor: b.color + '30', borderBottomColor: b.color + '30', borderLeftColor: b.color + '30', borderRightColor: b.color + '30', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', fontWeight: 700 } } }} onClick={(e) => { e.stopPropagation(); onRate(b.label); }}>
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
  const [levelFilter, setLevelFilter] = useState([]);
  const [search, setSearch] = useState('');
  const [queue, setQueue] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [progressMap, setProgressMap] = useState({});
  const [weakIds, setWeakIds] = useState(new Set());
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [dbReady, setDbReady] = useState(false);
  const [toast, setToast] = useState(null);
  const [allWords, setAllWords] = useState(wordsData);
  const [showAdd, setShowAdd] = useState(false);
  const [newCard, setNewCard] = useState({ german: '', english: '', article: '', level: 'Custom', example: '', exampleEn: '' });
  const [onlineBoard, setOnlineBoard] = useState(null);
  const [onlineError, setOnlineError] = useState(null);
  const [username, setUsername] = useState(() => localStorage.getItem('gs_username') || '');
  const [useOnline, setUseOnline] = useState(false);

  // quiz state
  const [quizMode, setQuizMode] = useState('mixed'); // dictation | artikel | mixed
  const [quizQueue, setQuizQueue] = useState([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0, xp: 0 });
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizArtikelChoice, setQuizArtikelChoice] = useState('');

  useEffect(() => {
    (async () => {
      await initDB();
      const s = await getStats();
      setStats(s);
      const allProg = await db.progress.toArray();
      const map = {};
      const weak = new Set();
      allProg.forEach((p) => {
        map[p.id] = p;
        if (p.lapses > 0 || (p.ease && p.ease < 1.8)) weak.add(p.id);
      });
      setProgressMap(map);
      setWeakIds(weak);
      try {
        const wordsFromDB = await getAllWords();
        if (wordsFromDB.length > 0) setAllWords(wordsFromDB);
      } catch {}
      setDbReady(true);
      // try fetch online board silently
      fetchOnlineLeaderboard().then(b => { if (b) { setOnlineBoard(b); setUseOnline(true); } }).catch(()=>{});
      const savedName = localStorage.getItem('gs_username');
      if (savedName) setUsername(savedName);
    })();
  }, []);

  const filteredWords = useMemo(() => {
    let w = allWords;
    if (levelFilter.length) {
      const levels = levelFilter.map((o) => o.id);
      w = w.filter((x) => levels.includes(x.level));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      w = w.filter((x) => x.german.toLowerCase().includes(q) || x.english.toLowerCase().includes(q) || x.level.toLowerCase().includes(q) || x.example.toLowerCase().includes(q));
    }
    return w;
  }, [allWords, levelFilter, search]);

  const studyQueue = useMemo(() => {
    if (search.trim()) return filteredWords;
    const withDue = filteredWords.map((w) => {
      const p = progressMap[w.id];
      return { w, due: p?.due || 0 };
    });
    withDue.sort((a, b) => {
      const aDue = a.due === 0 ? Infinity : a.due;
      const bDue = b.due === 0 ? Infinity : b.due;
      if (aDue !== bDue) return aDue - bDue;
      return a.w.id - b.w.id;
    });
    return withDue.map((x) => x.w);
  }, [filteredWords, progressMap, search]);

  const filterKey = useMemo(() => levelFilter.map((o) => o.id).sort().join(',') + '|' + search.trim().toLowerCase(), [levelFilter, search]);
  const prevFilterKey = useRef(filterKey);
  useEffect(() => {
    if (!dbReady) return;
    if (queue.length === 0 || prevFilterKey.current !== filterKey) {
      prevFilterKey.current = filterKey;
      setQueue(studyQueue);
      setCurrentIdx(0);
      setFlipped(false);
      setTranscript('');
    }
  }, [studyQueue, filterKey, dbReady]);

  const currentWord = queue[currentIdx] || null;
  const progress = queue.length ? Math.round((currentIdx / queue.length) * 100) : 0;

  const handleRate = useCallback(async (label) => {
    if (!currentWord) return;
    const q = qualityFromLabel(label);
    const prev = progressMap[currentWord.id] || { interval: 0, repetition: 0, ease: 2.5, due: 0, lapses: 0 };
    const next = sm2(prev, q);
    const xp = XP_MAP[label] || 5;
    await db.progress.put({ id: currentWord.id, level: currentWord.level, ...next });
    setProgressMap((m) => ({ ...m, [currentWord.id]: { id: currentWord.id, ...next } }));
    if (label === 'Again') {
      setWeakIds((s) => { const n = new Set(s); n.add(currentWord.id); return n; });
    }
    await addXP(xp);
    await updateStreak();
    const s = await getStats();
    setStats(s);
    if (useOnline && username) submitOnlineScore(username, s.xp + 0).then(b => { if (b) setOnlineBoard(b); }).catch(()=>{});
    setToast(`+${xp} XP • ${label}`);
    setTimeout(() => setToast(null), 1600);
    setFlipped(false);
    setTranscript('');
    setCurrentIdx((i) => Math.min(i + 1, queue.length));
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
  }, [currentWord, progressMap, queue.length, useOnline, username]);

  const handleSwipe = (dir) => {
    if (!currentWord) return;
    if (dir === 'right') handleRate('Good');
    else handleRate('Again');
  };

  const weakWords = useMemo(() => allWords.filter((w) => weakIds.has(w.id)), [allWords, weakIds]);

  const leaderboard = useMemo(() => {
    const board = (useOnline && onlineBoard) ? onlineBoard : COMPETITORS;
    const me = { name: username || 'You', xp: stats.xp || 0, avatar: (username || 'DU').slice(0,2).toUpperCase() };
    const all = [...board, me].sort((a, b) => b.xp - a.xp);
    // dedup me if already in board
    const seen = new Set();
    const dedup = [];
    for (const p of all) { const k = p.name.toLowerCase(); if (!seen.has(k)) { seen.add(k); dedup.push(p); } }
    const sorted = dedup.sort((a,b)=> b.xp - a.xp);
    const rank = sorted.findIndex((p) => p.name.toLowerCase() === me.name.toLowerCase()) + 1;
    return { all: sorted, rank, me };
  }, [stats.xp, username, useOnline, onlineBoard]);

  // custom card handlers
  const handleAddCard = async () => {
    if (!newCard.german.trim() || !newCard.english.trim()) {
      setToast('German and English required');
      setTimeout(()=> setToast(null),1500);
      return;
    }
    const isNoun = !!newCard.article;
    const pos = isNoun ? 'noun' : 'other';
    try {
      const w = await addCustomWord({ german: newCard.german.trim(), english: newCard.english.trim(), article: newCard.article || null, level: newCard.level || 'Custom', example: newCard.example.trim() || `Ich lerne "${newCard.german}".`, exampleEn: newCard.exampleEn.trim() || `I learn "${newCard.english}".`, pos });
      const updated = await getAllWords();
      setAllWords(updated);
      setShowAdd(false);
      setNewCard({ german: '', english: '', article: '', level: 'Custom', example: '', exampleEn: '' });
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

  // quiz smart logic
  const buildQuizQueue = useCallback((count = 10, mode = quizMode) => {
    let pool = [];
    // prioritize weak words
    let candidates = [...weakWords];
    // sort weak by most lapses / lowest ease / overdue
    candidates.sort((a,b)=>{
      const pa = progressMap[a.id] || { lapses:0, ease:2.5, due:0 };
      const pb = progressMap[b.id] || { lapses:0, ease:2.5, due:0 };
      if (pb.lapses !== pa.lapses) return pb.lapses - pa.lapses;
      if (pa.ease !== pb.ease) return pa.ease - pb.ease;
      return (pa.due||Infinity) - (pb.due||Infinity);
    });
    pool = [...candidates];
    if (pool.length < count) {
      // fill with hardest non-weak: lowest ease or not yet studied
      const remaining = allWords.filter(w => !weakIds.has(w.id));
      remaining.sort((a,b)=>{
        const pa = progressMap[a.id]; const pb = progressMap[b.id];
        const ea = pa ? pa.ease : 2.5; const eb = pb ? pb.ease : 2.5;
        if (ea !== eb) return ea - eb;
        return a.id - b.id;
      });
      pool.push(...remaining.slice(0, count - pool.length));
    }
    // filter by mode
    if (mode === 'artikel') {
      pool = pool.filter(w => w.article); // only nouns
      if (pool.length < count) {
        const nouns = allWords.filter(w => w.article && !pool.includes(w));
        // shuffle fill
        for (let i = nouns.length -1; i>0; i--) { const j=Math.floor(Math.random()*(i+1)); [nouns[i], nouns[j]]=[nouns[j], nouns[i]]; }
        pool.push(...nouns.slice(0, count - pool.length));
      }
    }
    // shuffle and slice
    for (let i = pool.length -1; i>0; i--) { const j=Math.floor(Math.random()*(i+1)); [pool[i], pool[j]]=[pool[j], pool[i]]; }
    return pool.slice(0, count);
  }, [weakWords, allWords, weakIds, progressMap, quizMode]);

  const startQuiz = (mode, count=10) => {
    const q = buildQuizQueue(count, mode);
    if (q.length===0) { setToast('No words for this mode'); setTimeout(()=> setToast(null),1500); return; }
    setQuizMode(mode);
    setQuizQueue(q);
    setQuizIdx(0);
    setQuizAnswer('');
    setQuizArtikelChoice('');
    setQuizFeedback(null);
    setQuizScore({ correct:0, total:0, xp:0 });
    setQuizStarted(true);
    // speak first if dictation
    setTimeout(()=> { if ((mode==='dictation' || mode==='mixed') && q[0]) { const w=q[0]; if (mode==='dictation' || (mode==='mixed' && !w.article)) speakGerman(w.german); } }, 300);
  };

  const currentQuizWord = quizQueue[quizIdx] || null;
  const isQuizArtikel = currentQuizWord ? (quizMode==='artikel' || (quizMode==='mixed' && currentQuizWord.article && Math.random()<0.5)) : false;
  // we determine per item: for mixed, decide based on article existence and parity

  const submitQuiz = async () => {
    if (!currentQuizWord) return;
    const isArtikelQ = quizMode==='artikel' || (quizMode==='mixed' && currentQuizWord.article && quizIdx %2===0);
    let correct = false;
    let xpAdd = 0;
    if (isArtikelQ) {
      correct = quizArtikelChoice === currentQuizWord.article;
      xpAdd = correct ? 10 : 0;
    } else {
      // dictation: expect exact german (case-sensitive for nouns, but we use exact lower for leniency? umlauts strict)
      const expected = currentQuizWord.german; // without article
      // also accept fullGerman for nouns? we check both
      const ans = normalizeInput(quizAnswer);
      const expNorm = normalizeInput(expected);
      const expFullNorm = normalizeInput(currentQuizWord.fullGerman);
      // umlauts strict: ä != a, ö != o, ü != u, ß != ss
      correct = ans === expNorm || ans === expFullNorm || ans.toLowerCase() === expNorm.toLowerCase() && ans === expNorm ? true : ans.toLowerCase() === expNorm.toLowerCase() ? false : false;
      // simpler: require exact, but allow case-insensitive but still umlaut exact
      if (!correct) {
        // allow case-insensitive exact (umlaut must match)
        correct = ans.toLowerCase() === expNorm.toLowerCase() || ans.toLowerCase() === expFullNorm.toLowerCase();
        // but if ans differs only by case, we consider correct; umlaut still must match because lowercasing preserves it
      }
      xpAdd = correct ? 15 : 0;
      if (correct && ans !== expNorm && ans.toLowerCase()===expNorm.toLowerCase()) {
        // case mismatch but umlaut correct -> still correct
        correct = true;
      }
    }
    const label = correct ? 'Good' : 'Again';
    const q = qualityFromLabel(correct ? 'Good' : 'Again');
    const prev = progressMap[currentQuizWord.id] || { interval:0, repetition:0, ease:2.5, due:0, lapses:0 };
    const next = sm2(prev, q);
    await db.progress.put({ id: currentQuizWord.id, level: currentQuizWord.level, ...next });
    setProgressMap(m=> ({...m, [currentQuizWord.id]: {id: currentQuizWord.id, ...next }}));
    if (!correct) setWeakIds(s=> { const n=new Set(s); n.add(currentQuizWord.id); return n; });
    if (xpAdd>0) { await addXP(xpAdd); await updateStreak(); const s=await getStats(); setStats(s); if (useOnline && username) submitOnlineScore(username, s.xp).then(b=>{ if(b) setOnlineBoard(b); }).catch(()=>{}); }
    setQuizScore(sc=> ({ correct: sc.correct + (correct?1:0), total: sc.total+1, xp: sc.xp + xpAdd }));
    setQuizFeedback({ correct, expected: currentQuizWord.article ? `${currentQuizWord.article} ${currentQuizWord.german}` : currentQuizWord.german, xp: xpAdd });
    setToast(correct ? `+${xpAdd} XP ✓` : `+0 XP • was "${currentQuizWord.article ? currentQuizWord.article+' '+currentQuizWord.german : currentQuizWord.german}"`);
    setTimeout(()=> setToast(null),1400);
  };

  const nextQuiz = () => {
    if (quizIdx +1 >= quizQueue.length) {
      // finished
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
    if (!isArtikelNext) setTimeout(()=> speakGerman(w.german), 250);
  };

  const insertUmlaut = (ch) => {
    setQuizAnswer(a=> a + ch);
  };

  if (!dbReady) return <Block display="flex" justifyContent="center" alignItems="center" height="100vh"><Spinner size={48} /></Block>;

  return (
    <HeadingLevel>
      <Block display="flex" justifyContent="space-between" alignItems="center" padding="16px 20px" overrides={{ Block: { style: { position: 'sticky', top: 0, zIndex: 10, background: '#fff', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: '#eee' } } }}>
        <Block display="flex" alignItems="center" gridGap="10px">
          <div style={{ width: 36, height: 36, background: '#000', color: '#fff', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>GS</div>
          <Block>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px', lineHeight: 1 }}>GermanSplash</div>
            <div style={{ fontSize: 11, color: '#6b6b6b', letterSpacing: '0.3px' }}>MENSCHEN • A1—B2 • {allWords.length} words</div>
          </Block>
        </Block>
        <Block display="flex" alignItems="center" gridGap="8px">
          <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setShowAdd(true)}>＋ Add</Button>
          <Block backgroundColor="#fff7ed" padding="6px 10px" overrides={{ Block: { style: { borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', borderWidth: '1px', borderStyle: 'solid', borderTopColor: '#ffedd5', borderBottomColor: '#ffedd5', borderLeftColor: '#ffedd5', borderRightColor: '#ffedd5', display: 'flex', alignItems: 'center', gap: '6px' } } }}>
            <span style={{ fontSize: 14 }}>🔥</span>
            <span style={{ fontWeight: 800, fontSize: 13 }}>{stats.streak}</span>
          </Block>
          <Block backgroundColor="#000" color="#fff" padding="6px 12px" overrides={{ Block: { style: { borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', fontWeight: 700, fontSize: '12px' } } }}>{stats.xp} XP</Block>
        </Block>
      </Block>

      {toast && (
        <Block overrides={{ Block: { style: { position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 } } }}>
          <Notification overrides={{ Body: { style: { backgroundColor: '#000', color: '#fff', borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', paddingTop: '8px', paddingBottom: '8px', paddingLeft: '16px', paddingRight: '16px', fontWeight: 700, fontSize: '13px' } } }}>{toast}</Notification>
        </Block>
      )}

      {/* Add Card Modal */}
      {showAdd && (
        <Block overrides={{ Block: { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' } } }} onClick={()=> setShowAdd(false)}>
          <Block onClick={(e)=> e.stopPropagation()} overrides={{ Block: { style: { background: '#fff', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px', padding: '20px', width: '100%', maxWidth: '420px', maxHeight: '85vh', overflowY: 'auto' } } }}>
            <Heading $style={{ fontSize: 18, marginTop: 0 }}>Add custom card</Heading>
            <ParagraphSmall color="#6b6b6b">Creates an offline card (stored in IndexedDB). Works in Study/Search/Quiz immediately.</ParagraphSmall>
            <Block display="flex" flexDirection="column" gridGap="10px" marginTop="12px">
              <Input value={newCard.german} onChange={(e)=> setNewCard({...newCard, german: e.target.value})} placeholder="German word (e.g. Mädchen)" overrides={{ Root: { style: { borderTopLeftRadius: '12px', borderTopRightRadius: '12px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' } } }} />
              <Input value={newCard.english} onChange={(e)=> setNewCard({...newCard, english: e.target.value})} placeholder="English (e.g. girl)" overrides={{ Root: { style: { borderTopLeftRadius: '12px', borderTopRightRadius: '12px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' } } }} />
              <Block display="flex" gridGap="8px">
                <Select options={[{id:'', label:'— no article'},{id:'der', label:'der (m)'},{id:'die', label:'die (f)'},{id:'das', label:'das (n)'}]} value={newCard.article ? [{id:newCard.article, label:newCard.article}] : []} placeholder="Article (for nouns)" onChange={({value})=> setNewCard({...newCard, article: value[0]?.id || ''})} size="compact" />
                <Select options={[{id:'Custom', label:'Custom'},{id:'A1.1', label:'A1.1'},{id:'A1.2', label:'A1.2'},{id:'A2.1', label:'A2.1'},{id:'A2.2', label:'A2.2'},{id:'B1.1', label:'B1.1'},{id:'B1.2', label:'B1.2'},{id:'B2.1', label:'B2.1'},{id:'B2.2', label:'B2.2'}]} value={[{id:newCard.level, label:newCard.level}]} onChange={({value})=> setNewCard({...newCard, level: value[0]?.id || 'Custom'})} size="compact" />
              </Block>
              <Input value={newCard.example} onChange={(e)=> setNewCard({...newCard, example: e.target.value})} placeholder="Example sentence (optional)" />
              <Input value={newCard.exampleEn} onChange={(e)=> setNewCard({...newCard, exampleEn: e.target.value})} placeholder="Example EN (optional)" />
              <Block display="flex" gridGap="8px" marginTop="8px">
                <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setShowAdd(false)}>Cancel</Button>
                <Button shape={SHAPE.pill} onClick={handleAddCard}>Add card</Button>
              </Block>
            </Block>
          </Block>
        </Block>
      )}

      <Block maxWidth="520px" width="100%" margin="0 auto" padding="0 16px 100px">
        <Tabs activeKey={activeKey} onChange={({ activeKey }) => setActiveKey(activeKey)} overrides={{
            TabBar: { style: { backgroundColor: '#f7f7f7', borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', paddingTop: '4px', paddingBottom: '4px', paddingLeft: '4px', paddingRight: '4px', marginTop: '16px' } },
            Tab: { style: ({ $active }) => ({ backgroundColor: $active ? '#000' : 'transparent', color: $active ? '#fff' : '#6b6b6b', borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', fontWeight: 700, fontSize: '12px', flex: 1 }) },
            TabHighlight: { style: { display: 'none' } },
            TabBorder: { style: { display: 'none' } },
          }}>
          <Tab title="Study">
            <Block paddingTop="16px">
              <Block display="flex" gridGap="8px" marginBottom="12px">
                <Block flex="1">
                  <Select options={[{id:'A1.1', label:'A1.1'},{id:'A1.2', label:'A1.2'},{id:'A2.1', label:'A2.1'},{id:'A2.2', label:'A2.2'},{id:'B1.1', label:'B1.1'},{id:'B1.2', label:'B1.2'},{id:'B2.1', label:'B2.1'},{id:'B2.2', label:'B2.2'},{id:'Custom', label:'Custom'}]} value={levelFilter} multi placeholder="Filter level" onChange={({ value }) => setLevelFilter(value)} size="compact" overrides={{ ControlContainer: { style: { backgroundColor: '#f7f7f7', borderTopColor: '#e5e5e5', borderBottomColor: '#e5e5e5', borderLeftColor: '#e5e5e5', borderRightColor: '#e5e5e5', borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px' } } }} />
                </Block>
                <Button kind={KIND.secondary} size={SIZE.compact} shape={SHAPE.pill} onClick={() => { setLevelFilter([]); setSearch(''); }}>Reset</Button>
              </Block>

              <Block display="flex" justifyContent="space-between" alignItems="center" marginBottom="8px">
                <LabelSmall color="#6b6b6b">{queue.length - currentIdx} cards left • {currentIdx}/{queue.length} reviewed</LabelSmall>
                <LabelSmall color="#000" overrides={{ Block: { style: { fontWeight: 700 } } }}>{progress}%</LabelSmall>
              </Block>
              <ProgressBar value={progress} successValue={progress} overrides={{ Bar: { style: { height: '4px' } }, BarProgress: { style: { backgroundColor: '#000' } }, BarContainer: { style: { backgroundColor: '#eee', height: '4px', borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px' } } }} />

              <Block marginTop="16px">
                {currentWord ? (
                  <FlashCard word={currentWord} flipped={flipped} setFlipped={setFlipped} onSwipe={handleSwipe} onRate={handleRate} listening={listening} setListening={setListening} transcript={transcript} setTranscript={setTranscript} />
                ) : (
                  <UberCard styleOverride={{ backgroundColor: '#f7f7f7', borderTopColor: '#e5e5e5', borderBottomColor: '#e5e5e5', borderLeftColor: '#e5e5e5', borderRightColor: '#e5e5e5', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px', textAlign: 'center', paddingTop: '40px', paddingBottom: '40px' }}>
                    <div style={{ fontSize: 48 }}>🎉</div>
                    <HeadingLevel><Heading $style={{ fontSize: 20, fontWeight: 800 }}>All caught up!</Heading></HeadingLevel>
                    <ParagraphSmall color="#6b6b6b">You’ve reviewed all cards. Change filter or come back tomorrow for SRS due cards.</ParagraphSmall>
                    <Block marginTop="16px" display="flex" justifyContent="center"><Button shape={SHAPE.pill} onClick={() => setCurrentIdx(0)}>Restart deck</Button></Block>
                  </UberCard>
                )}
              </Block>

              <Block display="flex" justifyContent="center" gridGap="16px" marginTop="16px">
                <Block display="flex" alignItems="center" gridGap="6px"><span style={{ width: 10, height: 10, borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', background: '#2563eb' }} /><LabelSmall>der</LabelSmall></Block>
                <Block display="flex" alignItems="center" gridGap="6px"><span style={{ width: 10, height: 10, borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', background: '#dc2626' }} /><LabelSmall>die</LabelSmall></Block>
                <Block display="flex" alignItems="center" gridGap="6px"><span style={{ width: 10, height: 10, borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', background: '#16a34a' }} /><LabelSmall>das</LabelSmall></Block>
              </Block>
              <ParagraphSmall color="#9a9a9a" textAlign="center" marginTop="8px">Tip: Allow microphone for accent check • Audio uses de-DE TTS • Swipe or use buttons</ParagraphSmall>
            </Block>
          </Tab>

          <Tab title="Search">
            <Block paddingTop="16px">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search German, English or level e.g. 'A1.1' or 'Haus'" clearable size="compact" overrides={{ Root: { style: { backgroundColor: '#f7f7f7', borderTopColor: '#e5e5e5', borderBottomColor: '#e5e5e5', borderLeftColor: '#e5e5e5', borderRightColor: '#e5e5e5', borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', paddingTop: '4px', paddingBottom: '4px' } }, Input: { style: { fontSize: '14px' } } }} startEnhancer="🔍" />
              <Block display="flex" gridGap="6px" marginTop="12px" overrides={{ Block: { style: { flexWrap: 'wrap' } } }}>
                {['A1.1','A1.2','A2.1','A2.2','B1.1','B1.2','B2.1','B2.2','Custom'].map((l) => (
                  <Tag key={l} closeable={false} variant={levelFilter.find((x) => x.id === l) ? 'solid' : 'outlined'} onClick={() => { const exists = levelFilter.find((x) => x.id === l); if (exists) setLevelFilter(levelFilter.filter((x) => x.id !== l)); else setLevelFilter([...levelFilter, { id: l, label: l }]); }}>{l}</Tag>
                ))}
              </Block>
              <LabelSmall color="#6b6b6b" marginTop="12px">{filteredWords.length} results {search && `for “${search}”`}</LabelSmall>
              <Block display="flex" flexDirection="column" gridGap="8px" marginTop="8px" overrides={{ Block: { style: { maxHeight: '62vh', overflowY: 'auto', paddingBottom: '20px' } } }}>
                {filteredWords.slice(0, 100).map((w) => (
                  <UberCard key={w.id} onClick={() => speakGerman(w.german)} styleOverride={{ cursor: 'pointer', backgroundColor: w.article ? genderBg(w.article) : '#fff', borderTopColor: w.article ? genderColor(w.article) + '30' : '#eee', borderBottomColor: w.article ? genderColor(w.article) + '30' : '#eee', borderLeftColor: w.article ? genderColor(w.article) + '30' : '#eee', borderRightColor: w.article ? genderColor(w.article) + '30' : '#eee' }}>
                    <Block display="flex" justifyContent="space-between" alignItems="center">
                      <Block>
                        <div style={{ fontWeight: 700, fontSize: 15, color: w.article ? genderColor(w.article) : '#000' }}>
                          {w.article && <span style={{ fontSize: 11, marginRight: 6, opacity: 0.8 }}>{w.article}</span>}
                          {w.german} <span style={{ fontWeight: 400, color: '#6b6b6b' }}>— {w.english}</span>{w.isCustom ? <span style={{ fontSize:10, background:'#000', color:'#fff', borderTopLeftRadius:'999px', borderTopRightRadius:'999px', borderBottomLeftRadius:'999px', borderBottomRightRadius:'999px', padding:'1px 6px', marginLeft:6 }}>custom</span>:null}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b6b6b', fontStyle: 'italic', marginTop: 2 }}>{w.example}</div>
                      </Block>
                      <Block display="flex" gridGap="6px" alignItems="center">
                        <Tag closeable={false} overrides={{ Root: { style: { backgroundColor: '#000', color: '#fff', flexShrink: 0 } } }}>{w.level}</Tag>
                        {w.isCustom && <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.circle} onClick={(e)=> {e.stopPropagation(); handleDeleteCustom(w.id);}}>×</Button>}
                      </Block>
                    </Block>
                  </UberCard>
                ))}
                {filteredWords.length > 100 && <LabelSmall color="#9a9a9a">Showing 100 of {filteredWords.length}. Refine search.</LabelSmall>}
              </Block>
            </Block>
          </Tab>

          <Tab title={`Weak (${weakWords.length})`}>
            <Block paddingTop="16px">
              <UberCard styleOverride={{ backgroundColor: '#fef2f2', borderTopColor: '#fecaca', borderBottomColor: '#fecaca', borderLeftColor: '#fecaca', borderRightColor: '#fecaca' }}>
                <Block display="flex" justifyContent="space-between" alignItems="center">
                  <Block>
                    <Heading $style={{ fontSize: 16, margin: 0 }}>Mistake Bank</Heading>
                    <ParagraphSmall margin="4px 0 0" color="#991b1b">Failed cards are auto-collected here for targeted practice.</ParagraphSmall>
                  </Block>
                  <div style={{ fontSize: 28 }}>⚠️</div>
                </Block>
                {weakWords.length > 0 && (
                  <Block marginTop="12px" display="flex" gridGap="8px">
                    <Button size={SIZE.mini} shape={SHAPE.pill} kind={KIND.primary} onClick={() => { setQueue(weakWords); setCurrentIdx(0); setFlipped(false); setActiveKey('0'); }}>Practice Weak Words</Button>
                    <Button size={SIZE.mini} shape={SHAPE.pill} kind={KIND.secondary} onClick={()=> {startQuiz('mixed', Math.min(10, weakWords.length)); setActiveKey('3');}}>Quiz Weak</Button>
                  </Block>
                )}
              </UberCard>
              <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
                {weakWords.length === 0 ? (
                  <UberCard styleOverride={{ textAlign: 'center', paddingTop: '30px', paddingBottom: '30px' }}><ParagraphSmall>No weak words yet. Keep studying — cards you mark “Again” or fail will appear here.</ParagraphSmall></UberCard>
                ) : (
                  weakWords.slice(0, 80).map((w) => (
                    <UberCard key={w.id} styleOverride={{ borderTopColor: '#fecaca', borderBottomColor: '#fecaca', borderLeftColor: '#fecaca', borderRightColor: '#fecaca' }}>
                      <Block display="flex" justifyContent="space-between" alignItems="center">
                        <div><span style={{ fontWeight: 700, color: genderColor(w.article) }}>{w.fullGerman}</span> <span style={{ color: '#6b6b6b' }}>— {w.english}</span> <span style={{ fontSize: 11, background: '#000', color: '#fff', borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', padding: '2px 6px', marginLeft: 6 }}>{w.level}</span></div>
                        <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={() => speakGerman(w.german)}>🔊</Button>
                      </Block>
                      <div style={{ fontSize: 12, fontStyle: 'italic', color: '#6b6b6b', marginTop: 6 }}>{w.example}</div>
                    </UberCard>
                  ))
                )}
              </Block>
            </Block>
          </Tab>

          <Tab title="Quiz">
            <Block paddingTop="16px">
              {!quizStarted ? (
                <>
                  <UberCard styleOverride={{ backgroundColor:'#f7f7f7', borderTopColor:'#e5e5e5', borderBottomColor:'#e5e5e5', borderLeftColor:'#e5e5e5', borderRightColor:'#e5e5e5' }}>
                    <Heading $style={{fontSize:16, margin:0}}>Smart Quiz — Weak Words</Heading>
                    <ParagraphSmall color="#6b6b6b">Dictation (umlaut-sensitive) & Artikel. Prioritizes your hardest words (most lapses / lowest ease). Quiz updates SRS & XP.</ParagraphSmall>
                    <Block display="flex" gridGap="8px" marginTop="12px" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
                      <Button size={SIZE.compact} shape={SHAPE.pill} kind={quizMode==='dictation'?KIND.primary:KIND.secondary} onClick={()=> setQuizMode('dictation')}>Dictation</Button>
                      <Button size={SIZE.compact} shape={SHAPE.pill} kind={quizMode==='artikel'?KIND.primary:KIND.secondary} onClick={()=> setQuizMode('artikel')}>Artikel</Button>
                      <Button size={SIZE.compact} shape={SHAPE.pill} kind={quizMode==='mixed'?KIND.primary:KIND.secondary} onClick={()=> setQuizMode('mixed')}>Mixed</Button>
                    </Block>
                    <Block display="flex" gridGap="8px" marginTop="12px">
                      <Button shape={SHAPE.pill} onClick={()=> startQuiz(quizMode, 5)}>Start 5</Button>
                      <Button shape={SHAPE.pill} kind={KIND.secondary} onClick={()=> startQuiz(quizMode, 10)}>Start 10</Button>
                      <Button shape={SHAPE.pill} kind={KIND.secondary} onClick={()=> startQuiz(quizMode, 20)}>Start 20</Button>
                    </Block>
                    <ParagraphSmall color="#9a9a9a" marginTop="8px">{weakWords.length} weak words available • {allWords.filter(w=>w.article).length} nouns with Artikel</ParagraphSmall>
                  </UberCard>
                  <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
                    <LabelSmall>How it works</LabelSmall>
                    <UberCard styleOverride={{paddingTop:'12px', paddingBottom:'12px'}}>
                      <ParagraphSmall margin={0}><b>Dictation:</b> Hear German → type exact word (<b>ä ö ü Ä Ö Ü ß</b> must be correct). Use the toolbar below the input if your keyboard lacks umlauts. +15 XP correct.</ParagraphSmall>
                    </UberCard>
                    <UberCard styleOverride={{paddingTop:'12px', paddingBottom:'12px'}}>
                      <ParagraphSmall margin={0}><b>Artikel:</b> Pick <span style={{color:genderColor('der'), fontWeight:700}}>der</span> / <span style={{color:genderColor('die'), fontWeight:700}}>die</span> / <span style={{color:genderColor('das'), fontWeight:700}}>das</span> for the noun. +10 XP correct.</ParagraphSmall>
                    </UberCard>
                    <UberCard styleOverride={{paddingTop:'12px', paddingBottom:'12px'}}>
                      <ParagraphSmall margin={0}>Wrong answers count as <b>Again</b> → added to Weak / SRS interval reset. Correct counts as <b>Good</b>.</ParagraphSmall>
                    </UberCard>
                  </Block>
                </>
              ) : (
                <>
                  <Block display="flex" justifyContent="space-between" alignItems="center" marginBottom="8px">
                    <LabelSmall color="#6b6b6b">Quiz {quizIdx+1}/{quizQueue.length} • {quizMode}</LabelSmall>
                    <LabelSmall color="#000" overrides={{Block:{style:{fontWeight:700}}}}>{quizScore.correct}/{quizScore.total} correct • {quizScore.xp} XP</LabelSmall>
                  </Block>
                  <ProgressBar value={quizQueue.length ? (quizIdx/quizQueue.length)*100 : 0} overrides={{ BarProgress:{style:{backgroundColor:'#000'}}, BarContainer:{style:{backgroundColor:'#eee', height:'4px', borderTopLeftRadius:'999px', borderTopRightRadius:'999px', borderBottomLeftRadius:'999px', borderBottomRightRadius:'999px'}}, Bar:{style:{height:'4px'}} }} />
                  {currentQuizWord && (
                    <UberCard styleOverride={{marginTop:'12px', minHeight:'260px'}}>
                      {(quizMode==='artikel' || (quizMode==='mixed' && currentQuizWord.article && quizIdx %2===0)) ? (
                        <Block textAlign="center">
                          <LabelSmall color="#6b6b6b">ARTIKEL - Wahl den Artikel</LabelSmall>
                          <div style={{fontSize:28, fontWeight:800, marginTop:8}}>{currentQuizWord.german} <span style={{fontWeight:400, color:'#6b6b6b', fontSize:16}}>- {currentQuizWord.english}</span></div>
                          <div style={{fontSize:12, color:'#9a9a9a', marginTop:4}}>{currentQuizWord.example}</div>
                          {!quizFeedback ? (
                            <Block display="flex" gridGap="8px" marginTop="16px" justifyContent="center">
                              {['der','die','das'].map(a=>(
                                <Button key={a} shape={SHAPE.pill} kind={quizArtikelChoice===a?KIND.primary:KIND.secondary} onClick={()=> setQuizArtikelChoice(a)} overrides={{BaseButton:{style:{flex:1, backgroundColor: quizArtikelChoice===a ? genderColor(a) : undefined, borderTopColor: genderColor(a), borderBottomColor: genderColor(a), borderLeftColor: genderColor(a), borderRightColor: genderColor(a)}}}}>{a}</Button>
                              ))}
                            </Block>
                          ) : (
                            <Block marginTop="12px" padding="10px" backgroundColor={quizFeedback.correct ? '#dcfce7' : '#fef2f2'} overrides={{Block:{style:{borderTopLeftRadius:'12px', borderTopRightRadius:'12px', borderBottomLeftRadius:'12px', borderBottomRightRadius:'12px'}}}}>
                              <LabelSmall>{quizFeedback.correct ? 'Correct!' : `Was "${quizFeedback.expected}"`} {quizFeedback.correct ? `+${quizFeedback.xp} XP` : ''}</LabelSmall>
                            </Block>
                          )}
                          {!quizFeedback ? (
                            <Button shape={SHAPE.pill} disabled={!quizArtikelChoice} onClick={submitQuiz} overrides={{BaseButton:{style:{marginTop:'16px', width:'100%'}}}}>Check</Button>
                          ) : (
                            <Button shape={SHAPE.pill} onClick={nextQuiz} overrides={{BaseButton:{style:{marginTop:'16px', width:'100%'}}}}>{quizIdx+1>=quizQueue.length ? 'Finish' : 'Next'}</Button>
                          )}
                        </Block>
                      ) : (
                        <Block textAlign="center">
                          <LabelSmall color="#6b6b6b">DICTATION - Hor und tippe (Umlaute wichtig!)</LabelSmall>
                          <DisplaySmall $style={{fontSize:16, color:'#6b6b6b', marginTop:'8px'}}>{currentQuizWord.english} - {currentQuizWord.level}</DisplaySmall>
                          <Block marginTop="12px">
                            <Button size={SIZE.compact} shape={SHAPE.pill} onClick={()=> speakGerman(currentQuizWord.german)}>Play German</Button>
                            <Button size={SIZE.compact} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> speakGerman(currentQuizWord.example)} overrides={{BaseButton:{style:{marginLeft:'8px'}}}}>Sentence</Button>
                          </Block>
                          {!quizFeedback ? (
                            <>
                              <Input value={quizAnswer} onChange={(e)=> setQuizAnswer(e.target.value)} placeholder="Tippe das deutsche Wort..." onKeyDown={(e)=> { if(e.key==='Enter') submitQuiz(); }} autoFocus overrides={{ Root:{style:{marginTop:'12px', borderTopLeftRadius:'12px', borderTopRightRadius:'12px', borderBottomLeftRadius:'12px', borderBottomRightRadius:'12px'}}}} />
                              <Block display="flex" gridGap="6px" marginTop="8px" justifyContent="center">
                                {['ä','ö','ü','Ä','Ö','Ü','ß'].map(ch=>(
                                  <Button key={ch} size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.circle} onClick={()=> insertUmlaut(ch)}>{ch}</Button>
                                ))}
                                <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setQuizAnswer('')}>Clear</Button>
                              </Block>
                              <Button shape={SHAPE.pill} disabled={!quizAnswer.trim()} onClick={submitQuiz} overrides={{BaseButton:{style:{marginTop:'12px', width:'100%'}}}}>Check (a o u beachten!)</Button>
                            </>
                          ) : (
                            <>
                              <Block marginTop="12px" padding="10px" backgroundColor={quizFeedback.correct ? '#dcfce7' : '#fef2f2'} overrides={{Block:{style:{borderTopLeftRadius:'12px', borderTopRightRadius:'12px', borderBottomLeftRadius:'12px', borderBottomRightRadius:'12px'}}}}>
                                <LabelSmall>{quizFeedback.correct ? `Correct! "${quizFeedback.expected}" +${quizFeedback.xp} XP` : `"${quizAnswer.trim()}" is wrong -> "${quizFeedback.expected}"`}</LabelSmall>
                                {!quizFeedback.correct && <ParagraphSmall margin="4px 0 0">Umlaute: <b>a</b> != a, <b>o</b> != o, <b>u</b> != u, <b>ss</b> != ss</ParagraphSmall>}
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

          <Tab title="Board">
            <Block paddingTop="16px">
              <UberCard styleOverride={{ backgroundColor: '#000', borderWidth: 0, borderTopLeftRadius: '20px', borderTopRightRadius: '20px', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px', paddingTop: '12px' }}>
                <Block display="flex" justifyContent="space-between" alignItems="center">
                  <Block>
                    <LabelSmall color="#a3a3a3" overrides={{ Block: { style: { letterSpacing: '1px', textTransform: 'uppercase' } } }}>Your rank</LabelSmall>
                    <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: '#fff' }}>#{leaderboard.rank} <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.7 }}>/ {leaderboard.all.length}</span></div>
                    <div style={{ fontSize: 13, color: '#d4d4d4' }}>{stats.xp} XP • {stats.totalReviews} reviews • 🔥 {stats.streak} day streak</div>
                  </Block>
                  <Block backgroundColor="white" color="black" padding="12px 16px" overrides={{ Block: { style: { borderTopLeftRadius: '16px', borderTopRightRadius: '16px', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', textAlign: 'center' } } }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{stats.xp}</div>
                    <div style={{ fontSize: 10, letterSpacing: '1px', fontWeight: 700 }}>TOTAL XP</div>
                  </Block>
                </Block>
                <Block marginTop="12px" display="flex" justifyContent="space-between">
                  <LabelSmall color="#a3a3a3">{Math.max(0, (leaderboard.all[0]?.xp || 0) - stats.xp)} XP to #1</LabelSmall>
                  <LabelSmall color="#fff" overrides={{ Block: { style: { fontWeight: 700 } } }}>Season ends in 12 days</LabelSmall>
                </Block>
                <Block marginTop="12px" display="flex" gridGap="8px">
                  <Input value={username} onChange={(e)=> { setUsername(e.target.value); localStorage.setItem('gs_username', e.target.value); }} placeholder="Your name" size="compact" overrides={{ Root:{style:{backgroundColor:'#1a1a1a', borderTopColor:'#333', borderBottomColor:'#333', borderLeftColor:'#333', borderRightColor:'#333', borderTopLeftRadius:'999px', borderTopRightRadius:'999px', borderBottomLeftRadius:'999px', borderBottomRightRadius:'999px' }}, Input:{style:{color:'#fff'}}}} />
                  <Button size={SIZE.compact} kind={KIND.secondary} shape={SHAPE.pill} onClick={async()=> {
                    if(!username.trim()) { setOnlineError('Enter a name first'); setTimeout(()=> setOnlineError(null),1500); return; }
                    const b = await submitOnlineScore(username.trim(), stats.xp);
                    if (b) { setOnlineBoard(b); setUseOnline(true); setToast('Score synced online ✓'); } else { setOnlineError('Online not configured — see instructions below'); }
                    setTimeout(()=> setToast(null),1500); setTimeout(()=> setOnlineError(null),2500);
                  }}>Sync</Button>
                </Block>
                {onlineError && <ParagraphSmall color="#fca5a5" marginTop="8px">{onlineError}</ParagraphSmall>}
                <Block display="flex" gridGap="8px" marginTop="8px">
                  <Button size={SIZE.mini} kind={useOnline?KIND.primary:KIND.secondary} shape={SHAPE.pill} onClick={()=> setUseOnline(false)}>Local</Button>
                  <Button size={SIZE.mini} kind={useOnline?KIND.secondary:KIND.primary} shape={SHAPE.pill} onClick={async()=> { const b=await fetchOnlineLeaderboard(); if(b){ setOnlineBoard(b); setUseOnline(true);} else setOnlineError('Online board not available. Deploy api/leaderboard.js + add Vercel KV free store.'); setTimeout(()=> setOnlineError(null),3000); }}>{onlineBoard ? 'Online ✓' : 'Online'}</Button>
                  <LabelSmall color="#6b6b6b" overrides={{Block:{style:{alignSelf:'center'}}}}>{useOnline ? 'Synced board' : 'Local mock board'}</LabelSmall>
                </Block>
              </UberCard>

              <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
                {leaderboard.all.map((p, i) => (
                  <UberCard key={p.name} styleOverride={{ borderTopColor: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#000' : '#eee', borderBottomColor: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#000' : '#eee', borderLeftColor: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#000' : '#eee', borderRightColor: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#000' : '#eee', backgroundColor: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#f7f7f7' : '#fff', borderWidth: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '2px' : '1px' }}>
                    <Block display="flex" justifyContent="space-between" alignItems="center">
                      <Block display="flex" alignItems="center" gridGap="12px">
                        <div style={{ width: 32, height: 32, borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', background: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#000' : '#eee', color: p.name.toLowerCase()=== (username||'You').toLowerCase() ? '#fff' : '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11 }}>#{i + 1}</div>
                        <div style={{ width: 36, height: 36, borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', background: '#fff', borderWidth: '1px', borderStyle: 'solid', borderTopColor: '#e5e5e5', borderBottomColor: '#e5e5e5', borderLeftColor: '#e5e5e5', borderRightColor: '#e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{p.avatar}</div>
                        <Block>
                          <div style={{ fontWeight: p.name.toLowerCase()=== (username||'You').toLowerCase() ? 800 : 600, fontSize: 14 }}>{p.name} {p.name.toLowerCase()=== (username||'You').toLowerCase() && '• You'}</div>
                          <div style={{ fontSize: 11, color: '#6b6b6b' }}>{p.xp} XP</div>
                        </Block>
                      </Block>
                      {i < 3 && <span style={{ fontSize: 18 }}>{['🥇', '🥈', '🥉'][i]}</span>}
                    </Block>
                  </UberCard>
                ))}
              </Block>
              <UberCard styleOverride={{marginTop:'12px', backgroundColor:'#f7f7f7'}}>
                <LabelSmall>How to go online on Vercel Free:</LabelSmall>
                <ParagraphSmall margin="8px 0 0" overrides={{Block:{style:{fontSize:12, lineHeight:'1.5'}}}}>
                  1) Push this <b>api/leaderboard.js</b> to Vercel (already included). <br/>
                  2) In Vercel Dashboard → your project → <b>Storage</b> → <b>Create KV</b> (Upstash, free 256 MB) → Connect to project. This auto-sets <b>KV_REST_API_URL</b> + <b>TOKEN</b>.<br/>
                  3) Redeploy. Your app will auto-detect KV and `/api/leaderboard` will persist globally.<br/>
                  No KV? It falls back to in-memory (resets on cold start). Alternatives on free plan: <b>Vercel Postgres</b> (Neon free 0.5 GB) or <b>Supabase free</b> — swap `api/leaderboard.js` to use Postgres. No backend needed for offline use; XP still saved locally in IndexedDB.
                </ParagraphSmall>
              </UberCard>
            </Block>
          </Tab>
        </Tabs>
      </Block>

      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </HeadingLevel>
  );
}
