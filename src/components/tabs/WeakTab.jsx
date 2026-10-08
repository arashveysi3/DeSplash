import Icon from '../shell/Icon.jsx';
import { CheckCircle2 } from 'lucide-react';
import { speakGerman } from '../../utils/speak';

export default function WeakTab({ weakWords, weakForScope, weakIds, scopeWords, packSize, selectedBook, selectedLektions, selectedBookMeta, setPackWords, setPackIdx, setPackAnswers, setPendingProgress, setShowPackSummary, setFlipped, setActiveKey, setQuizBook, setQuizLektions, startQuiz, setToast }) {
  return (
    <div className="page weak-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">FEHLERBANK</span>
          <h1>Schwache Wörter</h1>
          <p>Deine Fehlerkarten — gezielt wiederholen und meistern.</p>
        </div>
        <button type="button" className="scope-pill" onClick={() => setActiveKey('books')}>
          <span>
            {selectedBookMeta?.shortLabel || selectedBookMeta?.label} · {selectedLektions.length ? selectedLektions.join(', ') : 'Ganzes Buch'}
            <small>{weakForScope.length} schwach</small>
          </span>
          <Icon name="arrow" size={16} />
        </button>
      </div>

      <section className="weak-hero">
        <div className="weak-hero-icon">
          <Icon name="weak" size={26} />
        </div>
        <div className="weak-hero-copy">
          <span className="eyebrow">MISTAKE BANK</span>
          <h2>Mistake Bank</h2>
          <p>Failed cards auto-collected. Filtered to current scope: {selectedBookMeta?.label} {selectedLektions.length ? selectedLektions.join(', ') : 'Whole book'}</p>
        </div>
        {weakWords.length > 0 && (
          <div className="weak-hero-actions">
            <button
              type="button"
              className="btn dark"
              onClick={() => {
                const w = weakForScope.slice(0, packSize);
                if (!w.length) {
                  setToast('No weak in this scope');
                  setTimeout(() => setToast(null), 1500);
                  return;
                }
                setPackWords(w);
                setPackIdx(0);
                setPackAnswers([]);
                setPendingProgress({});
                setShowPackSummary(false);
                setFlipped(false);
                setActiveKey('study');
              }}
            >
              <Icon name="target" size={16} /> Practice Weak ({weakForScope.length})
            </button>
            <button
              type="button"
              className="btn light"
              onClick={() => {
                setQuizBook(selectedBook);
                setQuizLektions([...selectedLektions]);
                setTimeout(() => startQuiz('mixed', Math.min(10, weakForScope.length)), 100);
                setActiveKey('quiz');
              }}
            >
              Quiz Weak
            </button>
            <span className="weak-count">{weakForScope.length} in scope • {weakWords.length} total</span>
          </div>
        )}
      </section>

      {weakWords.length === 0 ? (
        <div className="weak-empty">
          <div className="weak-empty-icon">
            <CheckCircle2 size={44} strokeWidth={1.8} style={{ color: '#16a34a' }} aria-hidden="true" />
          </div>
          <p>No weak words yet. Cards marked “Again” appear here.</p>
        </div>
      ) : (
        <div className="weak-list">
          {(scopeWords.filter((w) => weakIds.has(w.id)).length ? scopeWords.filter((w) => weakIds.has(w.id)) : weakWords)
            .slice(0, 60)
            .map((w) => (
              <div key={w.id} className={`weak-rep${w.article ? ` is-${w.article}` : ''}`}>
                <span className={w.article || ''}>{w.article || ''}</span>
                <div className="weak-main">
                  <div className="weak-line">
                    <b>{w.fullGerman || (w.article ? `${w.article} ${w.german}` : w.german)}</b>
                    <span className="weak-en">— {w.meaning_en || w.english}</span>
                    <span className="weak-fa" dir="rtl">— {w.meaning_fa}</span>
                  </div>
                  {w.example ? <div className="weak-ex">{w.example}</div> : null}
                  {w.plural ? <div className="weak-pl">Plural: {w.plural}</div> : null}
                </div>
                <span className="weak-lek">{w.lektion}</span>
                <button type="button" className="weak-audio" onClick={() => speakGerman(w.german)} aria-label="Listen">
                  <Icon name="sound" size={16} />
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}