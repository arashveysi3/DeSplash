import { useState, useRef } from 'react';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { Tag } from 'baseui/tag';
import { Block } from 'baseui/block';
import { LabelSmall, ParagraphSmall } from 'baseui/typography';
import { genderColor, genderBg } from '../../theme';
import { XP_MAP } from '../../srs';
import { speakGerman } from '../../utils/speak';
import { playFlip } from '../../utils/sounds.js';

export default function FlashCard({ word, flipped, setFlipped, onSwipe, onRate, listening, setListening, transcript, setTranscript }) {
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
          playFlip();
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
