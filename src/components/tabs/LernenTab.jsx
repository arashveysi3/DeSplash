import Icon from '../shell/Icon.jsx';
import { getLektionMastery } from '../../utils/progress.js';
import FlashCard from '../cards/FlashCard.jsx';

export default function LernenTab({
  selectedLektions, selectedBookMeta, scopeWords, weakForScope, studyQueue, packSize, setPackSize, packWords, packIdx, packAnswers, showPackSummary, flipped, setFlipped, listening, setListening, transcript, setTranscript, handlePackSwipe, handlePackRate, startNewPack, savePack, isSavingPack, progressMap, setActiveKey, onDiscard
}) {
  const m = getLektionMastery(scopeWords, progressMap);
  const activePack = packWords.length > 0 && !showPackSummary;
  const scopeLabel = selectedLektions.length ? selectedLektions.join(', ') : 'Ganzes Buch';
  const correctCount = packAnswers.filter((a) => a.correct).length;
  const packXp = packAnswers.reduce((a, b) => a + b.xp, 0);
  const progressPct = Math.round((packIdx / Math.max(packWords.length, 1)) * 100);

  return (
    <div className="page study-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">SPACED REPETITION</span>
          <h1>Lernen</h1>
          <p>
            {selectedBookMeta?.label} · {scopeLabel} · {scopeWords.length} Wörter · {weakForScope.length} schwach
          </p>
        </div>
        <button type="button" className="scope-pill" onClick={() => setActiveKey('books')}>
          <span>
            {selectedBookMeta?.shortLabel || selectedBookMeta?.label} · {scopeLabel}
            <small>{scopeWords.length} Wörter</small>
          </span>
          <Icon name="arrow" size={16} />
        </button>
      </div>

      {activePack ? (
        <section className="study-active">
          <div className="pack-status">
            <button
              type="button"
              aria-label="Zur Startseite"
              onClick={() => setActiveKey('home')}
            >
              <Icon name="close" />
            </button>
            <div>
              <span>
                PACK {packIdx + 1} / {packWords.length}
              </span>
              <span className="progress yellow">
                <span style={{ width: `${progressPct}%` }} />
              </span>
            </div>
            <b>+{packXp} XP</b>
          </div>

          <FlashCard
            word={packWords[packIdx]}
            flipped={flipped}
            setFlipped={setFlipped}
            onSwipe={handlePackSwipe}
            onRate={handlePackRate}
            listening={listening}
            setListening={setListening}
            transcript={transcript}
            setTranscript={setTranscript}
          />

          <p className="swipe-hint" style={{ textAlign: 'center' }}>
            {packWords.length - packIdx - 1} übrig
          </p>
        </section>
      ) : showPackSummary ? (
        <section className="summary-card">
          <span className="success-mark">
            <Icon name="check" size={36} />
          </span>
          <span className="eyebrow">PACK GESCHAFFT</span>
          <h2>Geschafft.</h2>
          <p>
            {correctCount} von {packAnswers.length} richtig · {selectedBookMeta?.label} · {scopeLabel}
          </p>
          <div className="score-circle">
            <strong>
              {correctCount}<small>/{packAnswers.length}</small>
            </strong>
            <span>RICHTIG</span>
          </div>
          <div className="summary-stats">
            <div>
              <Icon name="bolt" />
              <b>+{packXp}</b>
              <span>XP verdient</span>
            </div>
            <div>
              <Icon name="cards" />
              <b>{packAnswers.length}</b>
              <span>Wörter</span>
            </div>
          </div>
          <div className="word-pills">
            {packAnswers.map((a, i) => (
              <span key={i} className={a.correct ? '' : 'miss'}>
                {a.word.german}
                {a.correct ? ' ✓' : ` · ${a.label}`}
              </span>
            ))}
          </div>
          <button type="button" className="btn" onClick={savePack} disabled={isSavingPack}>
            {isSavingPack ? 'Speichert …' : 'Speichern & weiter'}
          </button>
          <button type="button" className="text-link" onClick={onDiscard}>
            Pack verwerfen
          </button>
          <small className="meta">Tippe auf Speichern, um deinen Fortschritt zu behalten.</small>
        </section>
      ) : (
        <section className="study-ready">
          <div className="pack-visual">
            <div className="mini-card m1">der</div>
            <div className="mini-card m2">die</div>
            <div className="mini-card m3">das</div>
            <span>{packSize}</span>
          </div>
          <span className="eyebrow">DEIN NÄCHSTES PACK</span>
          <h2>Bereit für {packSize} Wörter?</h2>
          <p>
            Im Bereich <b>{selectedBookMeta?.label} · {scopeLabel}</b> · {scopeWords.length} Wörter. Mit jedem
            Durchgang festigen sich Artikel und Bedeutung.
          </p>
          <div className="pack-options">
            {[10, 20, 50].map((n, i) => (
              <button
                key={n}
                type="button"
                className={packSize === n ? 'selected' : ''}
                onClick={() => setPackSize(n)}
              >
                {n}
                <small>{['sanft', 'fokussiert', 'intensiv'][i]}</small>
              </button>
            ))}
          </div>
          <button type="button" className="btn dark" onClick={startNewPack}>
            Pack starten <Icon name="arrow" size={18} />
          </button>
          {studyQueue.length === 0 && (
            <p className="warn">Keine fälligen Wörter in diesem Bereich — wähle eine andere Lektion oder ein ganzes Buch.</p>
          )}
          <div className="gender-legend">
            <span className="der">der</span>
            <span className="die">die</span>
            <span className="das">das</span>
          </div>
        </section>
      )}

      <section className="scope-card study-progress">
        <div>
          <span className="eyebrow">FORTSCHRITT IM BEREICH</span>
          <h3>
            {m.seen}/{m.total} gesehen · {m.mastered} gemeistert
          </h3>
          <p>
            {m.pct}% gesehen · {m.masteredPct}% gemeistert — gemeistert = 3× Good, Intervall ≥ 14 Tage.
          </p>
          <div className="progress">
            <span style={{ width: `${m.pct}%` }} />
          </div>
          <div className="progress green">
            <span style={{ width: `${m.masteredPct}%` }} />
          </div>
        </div>
        <button type="button" onClick={() => setActiveKey('books')}>
          Ändern <Icon name="arrow" size={16} />
        </button>
      </section>
    </div>
  );
}
