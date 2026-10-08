import Icon from '../shell/Icon.jsx';
import { Star, Library } from 'lucide-react';
import { BOOKS, lektionenForBook } from '../../data/menschen.js';
import { getBookMastery, getLektionMastery } from '../../utils/progress.js';
import { speakGerman } from '../../utils/speak.js';
import BookAnalytics from '../analytics/BookAnalytics.jsx';

export default function BuecherTab({ selectedBook, setSelectedBook, selectedLektions, setSelectedLektions, bookView, setBookView, allWords, progressMap, scopeWords, setActiveKey, setQuizBook, setQuizLektions, selectedBookMeta, quizHistory, historyLoading, historyError, onReloadHistory }) {
  if (!bookView) {
    return (
      <div className="page bk-page">
        <div className="page-title-row">
          <div>
            <span className="eyebrow">DEIN LERNPLAN</span>
            <h1>Wähle dein Buch</h1>
            <p>Menschen — {BOOKS.reduce((a, b) => a + b.lektionCount, 0)} Lektionen • {BOOKS.reduce((a, b) => a + b.total, 0)} Wörter • Deutsch + English + فارسی</p>
          </div>
        </div>

        <div className="bk-list">
          {BOOKS.map((book) => {
            const mastery = getBookMastery(book.id, allWords, progressMap);
            const isSelected = selectedBook === book.id;
            return (
              <div key={book.id} className={`bk-book${isSelected ? ' on' : ''}`} style={{ background: book.gradient }} onClick={() => setBookView(book.id)}>
                <div className="bk-art">
                  <Library size={92} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div className="bk-head">
                  <div>
                    <div className="bk-kicker">{book.levels} • {book.publisher}</div>
                    <h2>{book.label}</h2>
                    <div className="bk-title">{book.title}{book.isbn ? ` • ${book.isbn}` : ''}</div>
                    <div className="bk-chips">
                      <span>{book.total} Wörter</span>
                      <span className={`bk-cta${isSelected ? ' on' : ''}`}>{isSelected && <Icon name="check" size={12} />}{isSelected ? 'Selected' : 'Tap to open'}</span>
                    </div>
                  </div>
                  <div className="bk-pct">
                    <b>{mastery.pct}%</b>
                    <span>{mastery.seen}/{mastery.total} seen • {mastery.mastered} mastered</span>
                  </div>
                </div>
                <div className="bk-bar">
                  <span style={{ width: `${mastery.pct}%` }} />
                </div>
                <div className="bk-actions">
                  <button
                    type="button"
                    className="btn light"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBook(book.id);
                      setSelectedLektions([]);
                      setActiveKey('study');
                    }}
                  >
                    <Icon name="book" size={16} /> Whole book — Study
                  </button>
                  <button type="button" className="bk-lek" onClick={(e) => { e.stopPropagation(); setBookView(book.id); }}>
                    Lektionen →
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bk-scope">
          <span className="eyebrow">AKTUELLER LERNBEREICH</span>
          <h3>{selectedBookMeta?.label} • {selectedLektions.length === 0 ? 'Whole book' : selectedLektions.join(', ')} • {scopeWords.length} words</h3>
          <p>{selectedLektions.length ? `${selectedLektions.length} Lektionen selected` : 'All Lektionen'}</p>
          <div className="bk-scope-actions">
            <button type="button" className="btn dark" onClick={() => setActiveKey('study')}>
              Go to Study →
            </button>
            <button
              type="button"
              className="btn light"
              onClick={() => {
                setQuizBook(selectedBook);
                setQuizLektions([...selectedLektions]);
                setActiveKey('quiz');
              }}
            >
              Quiz this scope
            </button>
          </div>
        </div>
      </div>
    );
  }

  const book = BOOKS.find((b) => b.id === bookView);
  const lektions = lektionenForBook(bookView);

  return (
    <div className="page bk-page">
      <div className="bk-top">
        <button type="button" className="back-link" onClick={() => setBookView(null)}>
          <span aria-hidden="true">←</span> All books
        </button>
        <span className="bk-tag" style={{ background: book.gradient }}>{book.label}</span>
        <span className="bk-levels">{book.levels}</span>
      </div>

      <section className="bk-hero" style={{ background: book.gradient }}>
        <div>
          <span className="eyebrow">ALLE LEKTIONEN</span>
          <h2>{book.label} — Alle Lektionen</h2>
          <p>{book.total} Wörter • Tap a Lektion to focus</p>
          <div className="bk-hero-actions">
            <button
              type="button"
              className="btn light"
              onClick={() => {
                setSelectedBook(book.id);
                setSelectedLektions([]);
                setActiveKey('study');
              }}
            >
              Study whole book
            </button>
            {selectedBook === book.id && selectedLektions.length > 0 && (
              <button
                type="button"
                className="btn dark"
                onClick={() => setActiveKey('study')}
              >
                Study {selectedLektions.length} selected →
              </button>
            )}
          </div>
          <div className="bk-hero-tools">
            <button type="button" className="btn light" onClick={() => setSelectedLektions(lektionenForBook(book.id).map((x) => x.lektion))}>
              Select all
            </button>
            <button type="button" className="btn light" onClick={() => setSelectedLektions([])}>
              Clear
            </button>
            {selectedBook === book.id && selectedLektions.length > 0 && <span className="bk-hero-sel">{selectedLektions.join(', ')}</span>}
          </div>
        </div>
      </section>

      <div className="bk-analytics">
        <BookAnalytics
          book={book}
          allWords={allWords}
          progressMap={progressMap}
          attempts={quizHistory}
          loading={historyLoading}
          error={historyError}
          onRetry={onReloadHistory}
          actions={{
            onStudy: () => {
              setSelectedBook(book.id);
              setSelectedLektions([]);
              setActiveKey('study');
            },
            onQuizBook: () => {
              setQuizBook(book.id);
              setQuizLektions([]);
              setActiveKey('quiz');
            },
            onQuizLektion: (lektion) => {
              setQuizBook(book.id);
              setQuizLektions([lektion]);
              setActiveKey('quiz');
            },
            onPracticeWeak: () => setActiveKey('weak'),
          }}
        />
      </div>

      <div className="bk-lek-grid">
        {lektions.map((l) => {
          const words = allWords.filter((w) => w.book === l.book && w.lektion === l.lektion);
          const mastery = getLektionMastery(words, progressMap);
          const isActive = selectedBook === l.book && selectedLektions.includes(l.lektion);
          const isBookActive = selectedBook === l.book;
          return (
            <div key={l.key} className={`bk-lek-card${isActive ? ' on' : ''}`}>
              <div className="bk-lek-head">
                <div>
                  <div className="bk-lek-num">{l.lektion}</div>
                  <h3>{l.title}</h3>
                  <div className="bk-lek-theme">{l.theme}</div>
                </div>
                <div className="bk-lek-pct">
                  <b style={{ color: mastery.pct >= 80 ? '#16a34a' : mastery.pct >= 40 ? '#ea580c' : '#000' }}>{mastery.pct}%</b>
                  <span>{mastery.seen}/{mastery.total} seen • {mastery.mastered} <Star size={10} strokeWidth={1.8} style={{ color: '#eab308' }} aria-hidden="true" /></span>
                </div>
              </div>
              <div className="progress">
                <span style={{ width: `${mastery.pct}%`, background: mastery.pct >= 80 ? '#16a34a' : mastery.pct >= 40 ? '#000' : '#9a9a9a' }} />
              </div>
              <div className="bk-lek-foot">
                <span className="bk-lek-info">{words.length} words • {mastery.mastered} mastered</span>
                <span className="bk-lek-status" style={{ color: mastery.pct >= 80 ? '#16a34a' : '#9a9a9a' }}>
                  {mastery.pct >= 80 ? (
                    <><Icon name="check" size={12} /> Studied</>
                  ) : mastery.pct >= 30 ? (
                    'In progress'
                  ) : (
                    'Not started'
                  )}
                </span>
              </div>
              <div className="bk-lek-actions">
                <button
                  type="button"
                  className={`bk-add${isActive ? ' on' : ''}`}
                  onClick={() => {
                    if (isBookActive && !isActive) {
                      setSelectedLektions((prev) => [...prev, l.lektion]);
                    } else if (isActive) {
                      setSelectedLektions((prev) => prev.filter((x) => x !== l.lektion));
                    } else {
                      setSelectedBook(l.book);
                      setSelectedLektions([l.lektion]);
                    }
                  }}
                >
                  {isActive && <Icon name="check" size={12} />}{isActive ? 'Selected' : '+ Add'}
                </button>
                <button
                  type="button"
                  className="btn light small"
                  onClick={() => {
                    if (isActive) setActiveKey('study');
                    else {
                      setSelectedBook(l.book);
                      setSelectedLektions([l.lektion]);
                      setActiveKey('study');
                    }
                  }}
                >
                  Study
                </button>
                <button
                  type="button"
                  className="btn light small"
                  onClick={() => {
                    setQuizBook(l.book);
                    setQuizLektions([l.lektion]);
                    setActiveKey('quiz');
                  }}
                >
                  Quiz
                </button>
                <button type="button" className="bk-lek-sound" onClick={() => speakGerman(words[0]?.german || l.title)} aria-label="Listen">
                  <Icon name="sound" size={18} />
                </button>
              </div>
              {isActive && (
                <p className="bk-lek-note">
                  <Icon name="check" size={12} /> In your multi-scope • tap to remove
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}