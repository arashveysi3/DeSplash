import { BOOK_EXAM_COUNTS, EXAM_BOOK_TITLES, GRAMMAR_TOPICS_A11, GRAMMAR_TOPICS_A12, findReadingText } from '../../data/exam.js';
import { EXAM_SECTION_LABELS, EXAM_SECTIONS, examModeTotal, examModeLabel, readExamBest } from '../../utils/exam.js';
import { speakGerman } from '../../utils/speak';
import Icon from '../shell/Icon.jsx';
import { CircleX, Sparkles } from 'lucide-react';

const SECTION_ICON_NAMES = {
  diktation: 'sound',
  grammatik: 'puzzle',
  wortschatz: 'cards',
  lesen: 'book',
};

const SECTION_NOTES = {
  diktation: 'Rechtschreibung',
  grammatik: 'Strukturen',
  wortschatz: 'Bedeutung',
  lesen: 'Verständnis',
};

const SECTION_MODES = ['diktation', 'grammatik', 'wortschatz', 'lesen'];

function readingTextFor(question) {
  if (!question || question.section !== 'lesen' || !question.textId) return null;
  return findReadingText(question.textId);
}

function bestLine(best) {
  if (!best) return 'Noch kein Versuch';
  return `Bestleistung: ${best.correct}/${best.total} (${best.pct}%)`;
}

export default function ExamTab(props) {
  const {
    examStarted,
    examQuestions,
    examIdx,
    examPicks,
    examResult,
    examMode,
    examBook,
    examFinishing,
    onStartExam,
    onExamBook,
    onExamPick,
    onExamNav,
    onRetakeExam,
    onExitExam,
    onPracticeWeak,
    onGoToBooks,
  } = props;

  // ---------------------------------------------------------- result screen
  if (examResult) {
    const { score, analysis, bonus, isNewBest } = examResult;
    const mode = examResult.mode || examMode || 'full';
    const resultBook = examResult.book || examBook || 'a1.2';
    const resultTag = resultBook === 'a1.1' ? 'A1.1' : 'A1.2';
    const incorrect = (score.results || []).filter((r) => !r.correct);
    const byId = new Map((examQuestions || []).map((q) => [q.id, q]));
    const presentSections = EXAM_SECTIONS.filter((s) => (score.perSection[s] || { total: 0 }).total > 0);
    return (
      <div className="page exam-page exam-result">
        <section className="exam-hero">
          <div className="exam-copy">
            <span className="eyebrow">PRÜFUNGSERGEBNIS · MENSCHEN {resultTag}</span>
            <h2>{examModeLabel(mode, resultBook)}</h2>
            <p>
              {score.correct}/{score.total} richtig
              {isNewBest ? ' · Neue Bestleistung!' : ''}
              {bonus > 0 ? ` · +${bonus} XP` : ''}
            </p>
          </div>
          <div className="best-score">
            <span>ERGEBNIS</span>
            <strong>
              {score.pct}<small>%</small>
            </strong>
            <p>{score.correct} von {score.total}</p>
            {bonus > 0 && <small>+{bonus} XP</small>}
          </div>
        </section>

        <div className="ex-actions">
          <button type="button" className="btn dark" onClick={onRetakeExam}>
            <Icon name="refresh" size={16} /> Neu mischen &amp; erneut versuchen
          </button>
          <button type="button" className="btn light" onClick={onPracticeWeak}>Schwache Wörter üben</button>
          <button type="button" className="btn light" onClick={onGoToBooks}>Bücher</button>
        </div>

        <div className="ex-card">
          <span className="ex-card-label">Teil-Ergebnisse</span>
          <div className="ex-rows">
            {presentSections.map((key) => {
              const sec = score.perSection[key] || { total: 0, correct: 0, accuracy: null };
              return (
                <div className="ex-row" key={key}>
                  <span className="ex-row-icon"><Icon name={SECTION_ICON_NAMES[key]} size={16} /></span>
                  <span className="ex-row-label">{EXAM_SECTION_LABELS[key]}</span>
                  <b className="ex-row-value">
                    {sec.correct}/{sec.total}{sec.accuracy !== null ? ` • ${sec.accuracy}%` : ''}
                  </b>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ex-card">
          <div className="ex-card-head">
            <Icon name="target" size={16} />
            <span className="ex-card-label">Übungsbedarf</span>
          </div>
          {analysis && (analysis.weakTopics.length > 0 || analysis.weakLektions.length > 0) ? (
            <div className="ex-pills">
              {analysis.weakTopics.map((t) => (
                <span className="ex-pill bad" key={`t-${t.label}`}>
                  {t.label} • {t.incorrect}/{t.total} falsch
                </span>
              ))}
              {analysis.weakLektions.map((l) => (
                <span className="ex-pill" key={`l-${l.label}`}>
                  {l.label} • {l.incorrect}/{l.total} falsch
                </span>
              ))}
            </div>
          ) : (
            <p className="ex-ok">Stark in allen Bereichen — keine klaren Schwächen in dieser Prüfung.</p>
          )}
        </div>

        <h2 className="ex-section-title">Auswertung — {incorrect.length} falsch</h2>
        {incorrect.length === 0 ? (
          <div className="ex-card ex-perfect">
            <span className="success-mark">
              <Icon name="check" size={36} />
            </span>
            <p><b>Fehlerfrei!</b> Alle {score.total} Fragen richtig — herausragend.</p>
          </div>
        ) : (
          <div className="ex-review-list">
            {incorrect.map((r) => {
              const q = byId.get(r.questionId);
              if (!q) return null;
              const text = readingTextFor(q);
              return (
                <div className="ex-review" key={r.questionId}>
                  <div className="ex-review-top">
                    <span className="ex-review-label">
                      {EXAM_SECTION_LABELS[q.section]}{q.topic ? ` • ${q.topic}` : ''}{q.lektion ? ` • ${q.lektion}` : ''}
                    </span>
                    <CircleX size={16} strokeWidth={1.8} aria-hidden="true" />
                  </div>
                  {text && <div className="ex-review-text">Text: {text.title}</div>}
                  <div className="ex-review-q">{q.prompt}</div>
                  <div className="ex-review-line">
                    <span className="bad">Deine Antwort: </span>
                    <span>{r.picked || '— (übersprungen)'}</span>
                  </div>
                  <div className="ex-review-line">
                    <span className="ok">Richtig: </span>
                    <span className="ans">{q.answer}</span>
                  </div>
                  {q.explanation && (
                    <div className="ex-review-note">{q.explanation}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------- question screen
  if (examStarted && examQuestions && examQuestions.length > 0) {
    const q = examQuestions[examIdx];
    if (!q) return null;
    const text = readingTextFor(q);
    const picked = examPicks[q.id] ?? null;
    const answered = Object.keys(examPicks).length;
    const isLast = examIdx + 1 >= examQuestions.length;
    return (
      <div className="page exam-page exam-play">
        <div className="quiz-top">
          <button type="button" aria-label="Prüfung abbrechen" onClick={onExitExam}>
            <Icon name="close" />
          </button>
          <div>
            <span>{EXAM_SECTION_LABELS[q.section]} • Frage {examIdx + 1}/{examQuestions.length}</span>
            <div className="progress yellow">
              <span style={{ width: `${(examIdx / examQuestions.length) * 100}%` }} />
            </div>
          </div>
          <b>{answered}/{examQuestions.length} beantwortet</b>
        </div>

        <section className="ex-question" key={q.id}>
          <div className="ex-q-head">
            <span className="eyebrow">
              {q.section === 'diktation'
                ? (q.kind === 'find-error' ? 'DIKTATION — Welches ist FALSCH geschrieben?' : 'DIKTATION — Welches ist RICHTIG geschrieben?')
                : `${EXAM_SECTION_LABELS[q.section].toUpperCase()}${q.topic ? ` — ${q.topic}` : ''}`}
            </span>
          </div>
          {text && (
            <div className="ex-reading">
              <div className="ex-reading-kind">{text.kind.toUpperCase()} — {text.title}</div>
              <div className="ex-reading-body">{text.text}</div>
            </div>
          )}
          <div className="ex-prompt">{q.prompt}</div>
          {q.section === 'diktation' && q.kind === 'find-correct' && q.hint && (
            <>
              <div className="ex-hint">{q.hint.en}</div>
              <div className="ex-listen">
                <button type="button" className="speak-button" onClick={() => speakGerman(q.answer)} aria-label="Wort anhören">
                  <Icon name="sound" size={14} /> Anhören
                </button>
              </div>
            </>
          )}
          {q.section === 'diktation' && q.kind === 'find-error' && (
            <div className="ex-hint">3 sind richtig geschrieben — 1 hat einen Fehler.</div>
          )}
          <div className="ex-options" role="group" aria-label="Antwortmöglichkeiten">
            {(q.shuffledOptions || []).map((opt) => {
              const selected = picked === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onExamPick && onExamPick(opt)}
                  aria-pressed={selected}
                  className={selected ? 'ex-option on' : 'ex-option'}
                >
                  <span className="ex-option-dot" aria-hidden="true">
                    {selected && <Icon name="check" size={13} />}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="ex-actions">
          <button type="button" className="btn light" disabled={examIdx === 0} onClick={() => onExamNav && onExamNav('prev')}>
            Zurück
          </button>
          {!isLast ? (
            <button type="button" className="btn dark" onClick={() => onExamNav && onExamNav('next')}>
              Weiter →
            </button>
          ) : (
            <button
              type="button"
              className="btn dark"
              disabled={!!examFinishing}
              aria-busy={!!examFinishing}
              onClick={() => onExamNav && onExamNav('finish')}
            >
              {examFinishing && <span className="ex-spin" aria-hidden="true" />} Prüfung abgeben
            </button>
          )}
        </div>
        <div className="ex-cancel">
          <button type="button" className="text-link" onClick={onExitExam}>
            Abbrechen (Fortschritt geht verloren)
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------- start screen
  // Prüfung is divided by book: one Final Mock per book (A1.1 / A1.2).
  const book = examBook === 'a1.1' ? 'a1.1' : 'a1.2';
  const bookTag = book === 'a1.1' ? 'A1.1' : 'A1.2';
  const bookCounts = BOOK_EXAM_COUNTS[book];
  const bookTotal = bookCounts.diktation + bookCounts.grammatik + bookCounts.wortschatz + bookCounts.lesen;
  const fullBest = readExamBest('full', book);
  const otherBook = book === 'a1.1' ? 'a1.2' : 'a1.1';
  const otherBest = readExamBest('full', otherBook);
  const otherTag = otherBook === 'a1.1' ? 'A1.1' : 'A1.2';
  const grammarTopics = book === 'a1.1' ? GRAMMAR_TOPICS_A11.length : GRAMMAR_TOPICS_A12.length;
  return (
    <div className="page exam-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">PRÜFUNGSVORBEREITUNG</span>
          <h1>Probeprüfung</h1>
          <p>Realistisch üben. Ruhig abliefern.</p>
        </div>
        <div className="book-toggle" role="group" aria-label="Buch wählen">
          {['a1.1', 'a1.2'].map((b) => {
            const active = b === book;
            const label = b === 'a1.1' ? 'A1.1' : 'A1.2';
            const sub = b === 'a1.1' ? 'Lektion 1–12' : 'Lektion 13–24';
            return (
              <button
                key={b}
                type="button"
                onClick={() => onExamBook && onExamBook(b)}
                aria-pressed={active}
                className={active ? 'active' : ''}
              >
                {label}
                <small>{sub}</small>
              </button>
            );
          })}
        </div>
      </div>

      <section className="exam-hero">
        <div className="exam-copy">
          <span className="eyebrow">MENSCHEN {bookTag} · FINAL MOCK</span>
          <h2>{bookTag} Final Mock</h2>
          <p>
            {EXAM_BOOK_TITLES[book]} — {bookTotal} Fragen in vier Teilen. {bestLine(fullBest)}.
          </p>
          <button type="button" className="btn yellow" onClick={() => onStartExam && onStartExam('full', book)}>
            Prüfung starten <Icon name="arrow" size={18} />
          </button>
        </div>
        <div className="best-score">
          <span>BESTLEISTUNG</span>
          <strong>
            {fullBest ? fullBest.pct : '—'}{fullBest ? <small>%</small> : null}
          </strong>
          <p>{fullBest ? `${fullBest.correct} von ${fullBest.total}` : 'Noch kein Versuch'}</p>
          <small>{otherTag} Final Mock: {bestLine(otherBest)}</small>
        </div>
      </section>

      <p className="ex-caption">Komplette Prüfung ({bookTag}) · Antwort pro Frage genau 1 von 4</p>
      <div className="exam-parts">
        {EXAM_SECTIONS.map((key, i) => (
          <div key={key}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>{EXAM_SECTION_LABELS[key]}</h3>
              <p>{SECTION_NOTES[key]}</p>
            </div>
            <b>{bookCounts[key]} Fragen</b>
          </div>
        ))}
      </div>

      <section className="practice-parts">
        <div>
          <span className="eyebrow">EINZELTEILE ÜBEN ({bookTag})</span>
          <h2>Noch nicht bereit für alles?</h2>
          <p>
            Nur ein Teil pro Lauf aus {EXAM_BOOK_TITLES[book]} — ideal zum gezielten Üben. Jedes Mal neu gemischt.
          </p>
        </div>
      </section>

      <div className="ex-mode-list">
        {SECTION_MODES.map((key) => {
          const best = readExamBest(key, book);
          return (
            <div className="ex-mode" key={key}>
              <span className="ex-mode-icon"><Icon name={SECTION_ICON_NAMES[key]} size={18} /></span>
              <div>
                <div className="ex-mode-title">{EXAM_SECTION_LABELS[key]} · {examModeTotal(key)} Fragen</div>
                <div className="ex-mode-best">{bestLine(best)}</div>
              </div>
              <button
                type="button"
                className="btn dark ex-mode-start"
                onClick={() => onStartExam && onStartExam(key, book)}
              >
                Start
              </button>
            </div>
          );
        })}
      </div>

      <div className="honest-note">
        <Sparkles size={20} strokeWidth={1.8} aria-hidden="true" />
        <div>
          <p>
            Der {bookTag} Final Mock deckt <b>alle {grammarTopics} Grammatik-Themen</b> des Buches ab — jedes Thema
            mindestens 1× pro Lauf. Dazu <b>Wortschatz</b> und <b>Lesen</b> aus {EXAM_BOOK_TITLES[book]} (plus
            Diktation aus den Wörtern des Buches). Keine zwei Läufe sind gleich.
          </p>
        </div>
      </div>

      <div className="honest-note">
        <Icon name="sound" size={20} />
        <div>
          <b>Hören ist nicht dabei</b>
          <p>
            Die App hat noch keine Audio-Prüfung. Abschluss-Bonus: bis zu 40 XP, einmalig — Wiederholungen zählen nur
            bei Verbesserung.
          </p>
        </div>
      </div>
    </div>
  );
}
