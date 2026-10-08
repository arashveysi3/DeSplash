import { useState, useRef } from 'react';
import Icon from '../shell/Icon.jsx';
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

  // Intelligent display: handle sentences vs vocab
  const rawGerman = word.german || '';
  const hasSlash = rawGerman.includes(' / ');
  const displayGerman = hasSlash ? rawGerman.split(' / ')[0].trim() : rawGerman;
  const tokenCount = rawGerman.split(/\s+/).filter(Boolean).length;
  const isSentence = !hasSlash ? (tokenCount > 6 && /[?!.]/.test(rawGerman)) : false;
  const frontGerman = displayGerman;
  const isLongSentence = tokenCount > 6 && isSentence;
  const frontFontSize = isLongSentence ? '22px' : tokenCount > 4 ? '28px' : '40px';
  const articleClass = word.article === 'der' || word.article === 'die' || word.article === 'das' ? ` gender-${word.article}` : '';
  const transcriptOk = transcript && transcript.toLowerCase().trim() === rawGerman.toLowerCase().trim();

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
    <div className="card-swipe">
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
        <span className={`swipe-badge again${Math.abs(dragX) > 30 ? ' show' : ''}`}>NOCH MAL</span>
        <span className={`swipe-badge known${Math.abs(dragX) > 30 ? ' show' : ''}`}>GEWUSST</span>

        <button
          type="button"
          className={`flashcard${articleClass}${flipped ? ' flipped' : ''}`}
          onClick={() => {
            playFlip();
            const next = !flipped;
            setFlipped(next);
            if (next) speakGerman(word.german);
          }}
        >
          {!flipped ? (
            <div className="card-face front">
              <div className="card-meta">
                <span>
                  {word.bookLabel || word.level} · {word.lektion}
                </span>
                <span>{word.article || word.pos || ''}</span>
              </div>
              <div className="word-wrap">
                {word.article && !isLongSentence && (
                  <span className="article">{word.article}</span>
                )}
                <strong style={{ fontSize: frontFontSize }}>{frontGerman}</strong>
                {word.plural && <small>Pl: {word.plural}</small>}
                {isLongSentence && <small>Satz · sentence</small>}
                {!isLongSentence && hasSlash && rawGerman !== frontGerman && (
                  <small>auch: {rawGerman.split(' / ').slice(1).join(' / ').slice(0, 80)}</small>
                )}
              </div>
              <div className="tap-hint">
                Tippen zum Umdrehen <span>↻</span>
              </div>
            </div>
          ) : (
            <div className="card-face back">
              <div className="translation">
                <small>ENGLISH</small>
                <strong>{word.meaning_en || word.english || '—'}</strong>
                {word.plural && <small className="plural">Pl: {word.plural}</small>}
              </div>
              <div className="translation fa" dir="rtl">
                <small>فارسی</small>
                <strong>{word.meaning_fa || '—'}</strong>
              </div>
              {word.example ? (
                <div className="example">
                  <small>BEISPIEL</small>
                  <p>{word.example}</p>
                  <button
                    type="button"
                    aria-label="Beispiel anhören"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakGerman(word.example);
                    }}
                  >
                    <Icon name="sound" size={18} />
                  </button>
                </div>
              ) : isLongSentence ? (
                <div className="example">
                  <small>SATZ</small>
                  <p>{rawGerman}</p>
                  <button
                    type="button"
                    aria-label="Satz anhören"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakGerman(rawGerman);
                    }}
                  >
                    <Icon name="sound" size={18} />
                  </button>
                </div>
              ) : (
                <div className="example">
                  <small>MEANING</small>
                  <p>
                    {word.meaning_en || word.english || ''}
                    {word.meaning_fa ? ` · ${word.meaning_fa}` : ''}
                  </p>
                </div>
              )}
              <span className="tap-hint">
                Tippen für Vorderseite <span>↻</span>
              </span>
            </div>
          )}
        </button>
      </div>

      <div className="listen-row">
        <button
          type="button"
          onClick={() => speakGerman(flipped ? word.example || rawGerman : frontGerman)}
        >
          <Icon name="sound" /> {flipped ? 'Satz anhören' : 'Anhören'}
        </button>
        {!flipped && word.example && (
          <button type="button" onClick={() => speakGerman(word.example)}>
            <Icon name="quiz" /> Beispiel
          </button>
        )}
        {flipped && (
          <button type="button" onClick={startListening} disabled={listening}>
            <Icon name="mic" /> {listening ? 'Höre zu …' : 'Aussprache'}
          </button>
        )}
      </div>

      {transcript && (
        <p className={`transcript-box${transcriptOk ? ' ok' : ''}`}>
          {transcriptOk ? 'Perfekt! ' : ''}Du hast gesagt: „{transcript}“
          {!transcriptOk && <> — vergleiche: „{rawGerman}“</>}
        </p>
      )}

      {flipped ? (
        <div className="rating-row">
          {['Again', 'Hard', 'Good', 'Easy'].map((b) => (
            <button key={b} type="button" onClick={() => onRate(b)}>
              <span>{b}</span>
              <b>+{XP_MAP[b]}</b>
            </button>
          ))}
        </div>
      ) : (
        <p className="swipe-hint">← Noch mal &nbsp;&nbsp; Wischen oder tippen &nbsp;&nbsp; Gewusst →</p>
      )}
    </div>
  );
}
