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
import { db, initDB, getStats, updateStreak, addXP, COMPETITORS } from './db';
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

// TTS helper
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

// Flashcard component
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
        <span
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '6px 12px',
            borderTopLeftRadius: '999px',
            borderTopRightRadius: '999px',
            borderBottomLeftRadius: '999px',
            borderBottomRightRadius: '999px',
            fontWeight: 700,
            fontSize: 12,
            transform: dragX < -30 ? 'scale(1)' : 'scale(0.8)',
          }}
        >
          FORGOT
        </span>
        <span
          style={{
            background: '#dcfce7',
            color: '#16a34a',
            padding: '6px 12px',
            borderTopLeftRadius: '999px',
            borderTopRightRadius: '999px',
            borderBottomLeftRadius: '999px',
            borderBottomRightRadius: '999px',
            fontWeight: 700,
            fontSize: 12,
            transform: dragX > 30 ? 'scale(1)' : 'scale(0.8)',
          }}
        >
          KNEW IT
        </span>
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
          <Tag
            closeable={false}
            overrides={{
              Root: {
                style: {
                  backgroundColor: '#000',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '11px',
                },
              },
            }}
          >
            {word.level}
          </Tag>
          <Block display="flex" gridGap="8px" alignItems="center">
            <span style={{ width: 8, height: 8, borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', background: color, display: 'inline-block' }} />
            <LabelSmall color="#6b6b6b" overrides={{ Block: { style: { textTransform: 'uppercase' } } }}>
              {word.article ? `${word.article} • ${word.pos}` : word.pos}
            </LabelSmall>
          </Block>
        </Block>

        {!flipped ? (
          <Block textAlign="center" paddingTop="24px" paddingBottom="24px">
            <div style={{ fontSize: '42px', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, color: word.article ? color : '#000' }}>
              {word.article && <span style={{ fontSize: 18, fontWeight: 600, marginRight: 8, opacity: 0.9 }}>{word.article}</span>}
              {word.german}
            </div>
            <ParagraphSmall color="#9a9a9a" marginTop="12px">
              Tap to reveal • Swipe to answer
            </ParagraphSmall>
            <Block marginTop="16px">
              <Button
                size={SIZE.mini}
                kind={KIND.secondary}
                shape={SHAPE.pill}
                onClick={(e) => {
                  e.stopPropagation();
                  speakGerman(word.german);
                }}
              >
                🔊 Listen
              </Button>
            </Block>
          </Block>
        ) : (
          <Block textAlign="center">
            <DisplaySmall overrides={{ Block: { style: { fontWeight: 800, fontSize: '30px', lineHeight: '1.2' } } }}>{word.english}</DisplaySmall>
            <Block
              marginTop="16px"
              backgroundColor="white"
              padding="12px"
              overrides={{
                Block: {
                  style: {
                    borderTopLeftRadius: '14px',
                    borderTopRightRadius: '14px',
                    borderBottomLeftRadius: '14px',
                    borderBottomRightRadius: '14px',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderTopColor: '#eee',
                    borderBottomColor: '#eee',
                    borderLeftColor: '#eee',
                    borderRightColor: '#eee',
                    textAlign: 'left',
                  },
                },
              }}
            >
              <LabelSmall color="#6b6b6b" marginBottom="4px">
                Beispiel • Example
              </LabelSmall>
              <div style={{ fontStyle: 'italic', fontSize: 15, lineHeight: 1.4 }}>{word.example}</div>
              <div style={{ fontSize: 13, color: '#6b6b6b', marginTop: 4 }}>{word.exampleEn}</div>
            </Block>

            <Block display="flex" justifyContent="center" gridGap="8px" marginTop="16px">
              <Button
                size={SIZE.mini}
                kind={KIND.secondary}
                shape={SHAPE.pill}
                onClick={(e) => {
                  e.stopPropagation();
                  speakGerman(word.example);
                }}
              >
                🔊 Sentence
              </Button>
              <Button
                size={SIZE.mini}
                kind={KIND.secondary}
                shape={SHAPE.pill}
                onClick={(e) => {
                  e.stopPropagation();
                  startListening();
                }}
                isLoading={listening}
              >
                🎙️ {listening ? 'Listening...' : 'Check pronunciation'}
              </Button>
            </Block>
            {transcript && (
              <Block
                marginTop="8px"
                padding="8px"
                backgroundColor={transcript.toLowerCase().trim() === word.german.toLowerCase().trim() ? '#dcfce7' : '#fef2f2'}
                overrides={{
                  Block: { style: { borderTopLeftRadius: '8px', borderTopRightRadius: '8px', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' } },
                }}
              >
                <LabelSmall>
                  You said: “{transcript}” — {transcript.toLowerCase().trim() === word.german.toLowerCase().trim() ? '✅ Perfect!' : `Compare: “${word.german}”`}
                </LabelSmall>
              </Block>
            )}

            <Block display="flex" gridGap="8px" marginTop="16px">
              {[
                { label: 'Again', color: '#dc2626', bg: '#fef2f2' },
                { label: 'Hard', color: '#ea580c', bg: '#fff7ed' },
                { label: 'Good', color: '#16a34a', bg: '#f0fdf4' },
                { label: 'Easy', color: '#2563eb', bg: '#eff6ff' },
              ].map((b) => (
                <Button
                  key={b.label}
                  size={SIZE.mini}
                  overrides={{
                    BaseButton: {
                      style: {
                        flex: 1,
                        backgroundColor: b.bg,
                        color: b.color,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderTopColor: b.color + '30',
                        borderBottomColor: b.color + '30',
                        borderLeftColor: b.color + '30',
                        borderRightColor: b.color + '30',
                        borderTopLeftRadius: '12px',
                        borderTopRightRadius: '12px',
                        borderBottomLeftRadius: '12px',
                        borderBottomRightRadius: '12px',
                        fontWeight: 700,
                      },
                    },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRate(b.label);
                  }}
                >
                  {b.label}
                  <br />
                  <span style={{ fontSize: 10, opacity: 0.7 }}>+{XP_MAP[b.label]} XP</span>
                </Button>
              ))}
            </Block>
            <ParagraphSmall color="#9a9a9a" marginTop="8px" overrides={{ Block: { style: { fontSize: 11 } } }}>
              Swipe right = Good • Swipe left = Again
            </ParagraphSmall>
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
      setDbReady(true);
    })();
  }, []);

  const filteredWords = useMemo(() => {
    let w = wordsData;
    if (levelFilter.length) {
      const levels = levelFilter.map((o) => o.id);
      w = w.filter((x) => levels.includes(x.level));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      w = w.filter((x) => x.german.toLowerCase().includes(q) || x.english.toLowerCase().includes(q) || x.level.toLowerCase().includes(q) || x.example.toLowerCase().includes(q));
    }
    return w;
  }, [levelFilter, search]);

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

  useEffect(() => {
    setQueue(studyQueue);
    setCurrentIdx(0);
    setFlipped(false);
    setTranscript('');
  }, [studyQueue]);

  const currentWord = queue[currentIdx] || null;
  const progress = queue.length ? Math.round((currentIdx / queue.length) * 100) : 0;

  const handleRate = useCallback(
    async (label) => {
      if (!currentWord) return;
      const q = qualityFromLabel(label);
      const prev = progressMap[currentWord.id] || { interval: 0, repetition: 0, ease: 2.5, due: 0, lapses: 0 };
      const next = sm2(prev, q);
      const xp = XP_MAP[label] || 5;
      await db.progress.put({ id: currentWord.id, level: currentWord.level, ...next });
      setProgressMap((m) => ({ ...m, [currentWord.id]: { id: currentWord.id, ...next } }));
      if (label === 'Again') {
        setWeakIds((s) => {
          const n = new Set(s);
          n.add(currentWord.id);
          return n;
        });
      }
      await addXP(xp);
      await updateStreak();
      const s = await getStats();
      setStats(s);
      setToast(`+${xp} XP • ${label}`);
      setTimeout(() => setToast(null), 1600);
      setFlipped(false);
      setTranscript('');
      setCurrentIdx((i) => Math.min(i + 1, queue.length));
      if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
    },
    [currentWord, progressMap, queue.length]
  );

  const handleSwipe = (dir) => {
    if (!currentWord) return;
    if (dir === 'right') handleRate('Good');
    else handleRate('Again');
  };

  const weakWords = useMemo(() => wordsData.filter((w) => weakIds.has(w.id)), [weakIds]);

  const leaderboard = useMemo(() => {
    const me = { name: 'You', xp: stats.xp || 0, avatar: 'DU' };
    const all = [...COMPETITORS, me].sort((a, b) => b.xp - a.xp);
    const rank = all.findIndex((p) => p.name === 'You') + 1;
    return { all, rank, me };
  }, [stats.xp]);

  if (!dbReady)
    return (
      <Block display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Spinner size={48} />
      </Block>
    );

  return (
    <HeadingLevel>
      <Block
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        padding="16px 20px"
        overrides={{
          Block: {
            style: {
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: '#fff',
              borderBottomWidth: '1px',
              borderBottomStyle: 'solid',
              borderBottomColor: '#eee',
            },
          },
        }}
      >
        <Block display="flex" alignItems="center" gridGap="10px">
          <div style={{ width: 36, height: 36, background: '#000', color: '#fff', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>GS</div>
          <Block>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px', lineHeight: 1 }}>GermanSplash</div>
            <div style={{ fontSize: 11, color: '#6b6b6b', letterSpacing: '0.3px' }}>MENSCHEN • A1—B2 • 1025 words</div>
          </Block>
        </Block>
        <Block display="flex" alignItems="center" gridGap="12px">
          <Block
            backgroundColor="#fff7ed"
            padding="6px 10px"
            overrides={{
              Block: {
                style: {
                  borderTopLeftRadius: '999px',
                  borderTopRightRadius: '999px',
                  borderBottomLeftRadius: '999px',
                  borderBottomRightRadius: '999px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderTopColor: '#ffedd5',
                  borderBottomColor: '#ffedd5',
                  borderLeftColor: '#ffedd5',
                  borderRightColor: '#ffedd5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                },
              },
            }}
          >
            <span style={{ fontSize: 14 }}>🔥</span>
            <span style={{ fontWeight: 800, fontSize: 13 }}>{stats.streak}</span>
            <span style={{ fontSize: 11, color: '#9a3412' }}>STREAK</span>
          </Block>
          <Block
            backgroundColor="#000"
            color="#fff"
            padding="6px 12px"
            overrides={{
              Block: {
                style: {
                  borderTopLeftRadius: '999px',
                  borderTopRightRadius: '999px',
                  borderBottomLeftRadius: '999px',
                  borderBottomRightRadius: '999px',
                  fontWeight: 700,
                  fontSize: '12px',
                },
              },
            }}
          >
            {stats.xp} XP
          </Block>
        </Block>
      </Block>

      {toast && (
        <Block overrides={{ Block: { style: { position: 'fixed', top: '70px', left: '50%', transform: 'translateX(-50%)', zIndex: 20 } } }}>
          <Notification
            overrides={{
              Body: {
                style: {
                  backgroundColor: '#000',
                  color: '#fff',
                  borderTopLeftRadius: '999px',
                  borderTopRightRadius: '999px',
                  borderBottomLeftRadius: '999px',
                  borderBottomRightRadius: '999px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  fontWeight: 700,
                  fontSize: '13px',
                },
              },
            }}
          >
            {toast}
          </Notification>
        </Block>
      )}

      <Block maxWidth="520px" width="100%" margin="0 auto" padding="0 16px 100px">
        <Tabs
          activeKey={activeKey}
          onChange={({ activeKey }) => setActiveKey(activeKey)}
          overrides={{
            TabBar: { style: { backgroundColor: '#f7f7f7', borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', paddingTop: '4px', paddingBottom: '4px', paddingLeft: '4px', paddingRight: '4px', marginTop: '16px' } },
            Tab: {
              style: ({ $active }) => ({
                backgroundColor: $active ? '#000' : 'transparent',
                color: $active ? '#fff' : '#6b6b6b',
                borderTopLeftRadius: '999px',
                borderTopRightRadius: '999px',
                borderBottomLeftRadius: '999px',
                borderBottomRightRadius: '999px',
                fontWeight: 700,
                fontSize: '13px',
                flex: 1,
              }),
            },
            TabHighlight: { style: { display: 'none' } },
            TabBorder: { style: { display: 'none' } },
          }}
        >
          <Tab title="Study">
            <Block paddingTop="16px">
              <Block display="flex" gridGap="8px" marginBottom="12px">
                <Block flex="1">
                  <Select
                    options={[
                      { id: 'A1.1', label: 'A1.1' },
                      { id: 'A1.2', label: 'A1.2' },
                      { id: 'A2.1', label: 'A2.1' },
                      { id: 'A2.2', label: 'A2.2' },
                      { id: 'B1.1', label: 'B1.1' },
                      { id: 'B1.2', label: 'B1.2' },
                      { id: 'B2.1', label: 'B2.1' },
                      { id: 'B2.2', label: 'B2.2' },
                    ]}
                    value={levelFilter}
                    multi
                    placeholder="Filter level"
                    onChange={({ value }) => setLevelFilter(value)}
                    size="compact"
                    overrides={{
                      ControlContainer: {
                        style: {
                          backgroundColor: '#f7f7f7',
                          borderTopColor: '#e5e5e5',
                          borderBottomColor: '#e5e5e5',
                          borderLeftColor: '#e5e5e5',
                          borderRightColor: '#e5e5e5',
                          borderTopLeftRadius: '999px',
                          borderTopRightRadius: '999px',
                          borderBottomLeftRadius: '999px',
                          borderBottomRightRadius: '999px',
                        },
                      },
                    }}
                  />
                </Block>
                <Button kind={KIND.secondary} size={SIZE.compact} shape={SHAPE.pill} onClick={() => { setLevelFilter([]); setSearch(''); }}>
                  Reset
                </Button>
              </Block>

              <Block display="flex" justifyContent="space-between" alignItems="center" marginBottom="8px">
                <LabelSmall color="#6b6b6b">
                  {queue.length - currentIdx} cards left • {currentIdx}/{queue.length} reviewed
                </LabelSmall>
                <LabelSmall color="#000" overrides={{ Block: { style: { fontWeight: 700 } } }}>
                  {progress}%
                </LabelSmall>
              </Block>
              <ProgressBar
                value={progress}
                successValue={progress}
                overrides={{
                  Bar: { style: { height: '4px' } },
                  BarProgress: { style: { backgroundColor: '#000' } },
                  BarContainer: { style: { backgroundColor: '#eee', height: '4px', borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px' } },
                }}
              />

              <Block marginTop="16px">
                {currentWord ? (
                  <FlashCard
                    word={currentWord}
                    flipped={flipped}
                    setFlipped={setFlipped}
                    onSwipe={handleSwipe}
                    onRate={handleRate}
                    listening={listening}
                    setListening={setListening}
                    transcript={transcript}
                    setTranscript={setTranscript}
                  />
                ) : (
                  <UberCard
                    styleOverride={{
                      backgroundColor: '#f7f7f7',
                      borderTopColor: '#e5e5e5',
                      borderBottomColor: '#e5e5e5',
                      borderLeftColor: '#e5e5e5',
                      borderRightColor: '#e5e5e5',
                      borderTopLeftRadius: '24px',
                      borderTopRightRadius: '24px',
                      borderBottomLeftRadius: '24px',
                      borderBottomRightRadius: '24px',
                      textAlign: 'center',
                      paddingTop: '40px',
                      paddingBottom: '40px',
                    }}
                  >
                    <div style={{ fontSize: 48 }}>🎉</div>
                    <HeadingLevel>
                      <Heading $style={{ fontSize: 20, fontWeight: 800 }}>All caught up!</Heading>
                    </HeadingLevel>
                    <ParagraphSmall color="#6b6b6b">You’ve reviewed all cards. Change filter or come back tomorrow for SRS due cards.</ParagraphSmall>
                    <Block marginTop="16px" display="flex" justifyContent="center">
                      <Button shape={SHAPE.pill} onClick={() => setCurrentIdx(0)}>
                        Restart deck
                      </Button>
                    </Block>
                  </UberCard>
                )}
              </Block>

              <Block display="flex" justifyContent="center" gridGap="16px" marginTop="16px">
                <Block display="flex" alignItems="center" gridGap="6px">
                  <span style={{ width: 10, height: 10, borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', background: '#2563eb' }} />
                  <LabelSmall>der</LabelSmall>
                </Block>
                <Block display="flex" alignItems="center" gridGap="6px">
                  <span style={{ width: 10, height: 10, borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', background: '#dc2626' }} />
                  <LabelSmall>die</LabelSmall>
                </Block>
                <Block display="flex" alignItems="center" gridGap="6px">
                  <span style={{ width: 10, height: 10, borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', background: '#16a34a' }} />
                  <LabelSmall>das</LabelSmall>
                </Block>
              </Block>
              <ParagraphSmall color="#9a9a9a" textAlign="center" marginTop="8px">
                Tip: Allow microphone for accent check • Audio uses de-DE TTS • Swipe or use buttons
              </ParagraphSmall>
            </Block>
          </Tab>

          <Tab title="Search">
            <Block paddingTop="16px">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search German, English or level e.g. 'A1.1' or 'Haus'"
                clearable
                size="compact"
                overrides={{
                  Root: {
                    style: {
                      backgroundColor: '#f7f7f7',
                      borderTopColor: '#e5e5e5',
                      borderBottomColor: '#e5e5e5',
                      borderLeftColor: '#e5e5e5',
                      borderRightColor: '#e5e5e5',
                      borderTopLeftRadius: '999px',
                      borderTopRightRadius: '999px',
                      borderBottomLeftRadius: '999px',
                      borderBottomRightRadius: '999px',
                      paddingTop: '4px',
                      paddingBottom: '4px',
                    },
                  },
                  Input: { style: { fontSize: '14px' } },
                }}
                startEnhancer="🔍"
              />
              <Block display="flex" gridGap="6px" marginTop="12px" overrides={{ Block: { style: { flexWrap: 'wrap' } } }}>
                {['A1.1', 'A1.2', 'A2.1', 'A2.2', 'B1.1', 'B1.2', 'B2.1', 'B2.2'].map((l) => (
                  <Tag
                    key={l}
                    closeable={false}
                    variant={levelFilter.find((x) => x.id === l) ? 'solid' : 'outlined'}
                    onClick={() => {
                      const exists = levelFilter.find((x) => x.id === l);
                      if (exists) setLevelFilter(levelFilter.filter((x) => x.id !== l));
                      else setLevelFilter([...levelFilter, { id: l, label: l }]);
                    }}
                  >
                    {l}
                  </Tag>
                ))}
              </Block>
              <LabelSmall color="#6b6b6b" marginTop="12px">
                {filteredWords.length} results {search && `for “${search}”`}
              </LabelSmall>
              <Block
                display="flex"
                flexDirection="column"
                gridGap="8px"
                marginTop="8px"
                overrides={{ Block: { style: { maxHeight: '62vh', overflowY: 'auto', paddingBottom: '20px' } } }}
              >
                {filteredWords.slice(0, 100).map((w) => (
                  <UberCard
                    key={w.id}
                    onClick={() => speakGerman(w.german)}
                    styleOverride={{
                      cursor: 'pointer',
                      backgroundColor: w.article ? genderBg(w.article) : '#fff',
                      borderTopColor: w.article ? genderColor(w.article) + '30' : '#eee',
                      borderBottomColor: w.article ? genderColor(w.article) + '30' : '#eee',
                      borderLeftColor: w.article ? genderColor(w.article) + '30' : '#eee',
                      borderRightColor: w.article ? genderColor(w.article) + '30' : '#eee',
                    }}
                  >
                    <Block display="flex" justifyContent="space-between" alignItems="center">
                      <Block>
                        <div style={{ fontWeight: 700, fontSize: 15, color: w.article ? genderColor(w.article) : '#000' }}>
                          {w.article && <span style={{ fontSize: 11, marginRight: 6, opacity: 0.8 }}>{w.article}</span>}
                          {w.german} <span style={{ fontWeight: 400, color: '#6b6b6b' }}>— {w.english}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#6b6b6b', fontStyle: 'italic', marginTop: 2 }}>{w.example}</div>
                      </Block>
                      <Tag closeable={false} overrides={{ Root: { style: { backgroundColor: '#000', color: '#fff', flexShrink: 0 } } }}>
                        {w.level}
                      </Tag>
                    </Block>
                  </UberCard>
                ))}
                {filteredWords.length > 100 && <LabelSmall color="#9a9a9a">Showing 100 of {filteredWords.length}. Refine search.</LabelSmall>}
              </Block>
            </Block>
          </Tab>

          <Tab title={`Weak (${weakWords.length})`}>
            <Block paddingTop="16px">
              <UberCard
                styleOverride={{
                  backgroundColor: '#fef2f2',
                  borderTopColor: '#fecaca',
                  borderBottomColor: '#fecaca',
                  borderLeftColor: '#fecaca',
                  borderRightColor: '#fecaca',
                }}
              >
                <Block display="flex" justifyContent="space-between" alignItems="center">
                  <Block>
                    <Heading $style={{ fontSize: 16, margin: 0 }}>Mistake Bank</Heading>
                    <ParagraphSmall margin="4px 0 0" color="#991b1b">
                      Failed cards are auto-collected here for targeted practice.
                    </ParagraphSmall>
                  </Block>
                  <div style={{ fontSize: 28 }}>⚠️</div>
                </Block>
                {weakWords.length > 0 && (
                  <Block marginTop="12px">
                    <Button
                      size={SIZE.mini}
                      shape={SHAPE.pill}
                      kind={KIND.primary}
                      onClick={() => {
                        setQueue(weakWords);
                        setCurrentIdx(0);
                        setFlipped(false);
                        setActiveKey('0');
                      }}
                    >
                      Practice Weak Words
                    </Button>
                  </Block>
                )}
              </UberCard>
              <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
                {weakWords.length === 0 ? (
                  <UberCard styleOverride={{ textAlign: 'center', paddingTop: '30px', paddingBottom: '30px' }}>
                    <ParagraphSmall>No weak words yet. Keep studying — cards you mark “Again” or fail will appear here.</ParagraphSmall>
                  </UberCard>
                ) : (
                  weakWords.slice(0, 80).map((w) => (
                    <UberCard
                      key={w.id}
                      styleOverride={{
                        borderTopColor: '#fecaca',
                        borderBottomColor: '#fecaca',
                        borderLeftColor: '#fecaca',
                        borderRightColor: '#fecaca',
                      }}
                    >
                      <Block display="flex" justifyContent="space-between" alignItems="center">
                        <div>
                          <span style={{ fontWeight: 700, color: genderColor(w.article) }}>{w.fullGerman}</span> <span style={{ color: '#6b6b6b' }}>— {w.english}</span>{' '}
                          <span style={{ fontSize: 11, background: '#000', color: '#fff', borderTopLeftRadius: '999px', borderTopRightRadius: '999px', borderBottomLeftRadius: '999px', borderBottomRightRadius: '999px', padding: '2px 6px', marginLeft: 6 }}>{w.level}</span>
                        </div>
                        <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={() => speakGerman(w.german)}>
                          🔊
                        </Button>
                      </Block>
                      <div style={{ fontSize: 12, fontStyle: 'italic', color: '#6b6b6b', marginTop: 6 }}>{w.example}</div>
                    </UberCard>
                  ))
                )}
              </Block>
            </Block>
          </Tab>

          <Tab title="Board">
            <Block paddingTop="16px">
              <UberCard
                styleOverride={{
                  backgroundColor: '#000',
                  borderWidth: 0,
                  borderTopLeftRadius: '20px',
                  borderTopRightRadius: '20px',
                  borderBottomLeftRadius: '20px',
                  borderBottomRightRadius: '20px',
                  paddingTop: '12px',
                }}
              >
                <Block display="flex" justifyContent="space-between" alignItems="center">
                  <Block>
                    <LabelSmall color="#a3a3a3" overrides={{ Block: { style: { letterSpacing: '1px', textTransform: 'uppercase' } } }}>
                      Your rank
                    </LabelSmall>
                    <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: '#fff' }}>
                      #{leaderboard.rank} <span style={{ fontSize: 14, fontWeight: 600, opacity: 0.7 }}>/ {leaderboard.all.length}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#d4d4d4' }}>
                      {stats.xp} XP • {stats.totalReviews} reviews • 🔥 {stats.streak} day streak
                    </div>
                  </Block>
                  <Block
                    backgroundColor="white"
                    color="black"
                    padding="12px 16px"
                    overrides={{ Block: { style: { borderTopLeftRadius: '16px', borderTopRightRadius: '16px', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', textAlign: 'center' } } }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{stats.xp}</div>
                    <div style={{ fontSize: 10, letterSpacing: '1px', fontWeight: 700 }}>TOTAL XP</div>
                  </Block>
                </Block>
                <Block marginTop="12px" display="flex" justifyContent="space-between">
                  <LabelSmall color="#a3a3a3">{Math.max(0, (leaderboard.all[0]?.xp || 0) - stats.xp)} XP to #1</LabelSmall>
                  <LabelSmall color="#fff" overrides={{ Block: { style: { fontWeight: 700 } } }}>
                    Season ends in 12 days
                  </LabelSmall>
                </Block>
              </UberCard>

              <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
                {leaderboard.all.map((p, i) => (
                  <UberCard
                    key={p.name}
                    styleOverride={{
                      borderTopColor: p.name === 'You' ? '#000' : '#eee',
                      borderBottomColor: p.name === 'You' ? '#000' : '#eee',
                      borderLeftColor: p.name === 'You' ? '#000' : '#eee',
                      borderRightColor: p.name === 'You' ? '#000' : '#eee',
                      backgroundColor: p.name === 'You' ? '#f7f7f7' : '#fff',
                      borderWidth: p.name === 'You' ? '2px' : '1px',
                    }}
                  >
                    <Block display="flex" justifyContent="space-between" alignItems="center">
                      <Block display="flex" alignItems="center" gridGap="12px">
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderTopLeftRadius: '999px',
                            borderTopRightRadius: '999px',
                            borderBottomLeftRadius: '999px',
                            borderBottomRightRadius: '999px',
                            background: p.name === 'You' ? '#000' : '#eee',
                            color: p.name === 'You' ? '#fff' : '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 11,
                          }}
                        >
                          #{i + 1}
                        </div>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderTopLeftRadius: '999px',
                            borderTopRightRadius: '999px',
                            borderBottomLeftRadius: '999px',
                            borderBottomRightRadius: '999px',
                            background: '#fff',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderTopColor: '#e5e5e5',
                            borderBottomColor: '#e5e5e5',
                            borderLeftColor: '#e5e5e5',
                            borderRightColor: '#e5e5e5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          {p.avatar}
                        </div>
                        <Block>
                          <div style={{ fontWeight: p.name === 'You' ? 800 : 600, fontSize: 14 }}>
                            {p.name} {p.name === 'You' && '• You'}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b6b6b' }}>{p.xp} XP</div>
                        </Block>
                      </Block>
                      {i < 3 && <span style={{ fontSize: 18 }}>{['🥇', '🥈', '🥉'][i]}</span>}
                    </Block>
                  </UberCard>
                ))}
              </Block>
              <ParagraphSmall color="#9a9a9a" textAlign="center" marginTop="12px">
                Leaderboard is local-first • Sync with Supabase/Firebase when configured • Earn XP per review (Again 2, Hard 5, Good 10, Easy 15)
              </ParagraphSmall>
            </Block>
          </Tab>
        </Tabs>
      </Block>

      <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </HeadingLevel>
  );
}
