import { BarChart3, Medal, PartyPopper, Target } from 'lucide-react';
import { LektionPerfRow, StrengthCallout, RecommendationBox, SectionLabel, fmtPct } from './shared.jsx';

const MODE_LABELS = { dictation: 'Diktation', artikel: 'Artikel', mixed: 'Gemischt', choice: '4-Choice', fa: 'DE → فارسی' };

/**
 * Quiz completion performance report.
 * Pure presentational component — all math comes from calcQuizReport().
 */
export default function QuizReport({ report, meta = {}, actions = {} }) {
  if (!report || report.total === 0) {
    return (
      <div className="rpr-empty">
        <div className="rpr-empty-ic"><BarChart3 size={44} aria-hidden="true" /></div>
        <h2>Keine Fragen beantwortet</h2>
        <p>Starte ein Quiz, um deinen Leistungsbericht zu sehen.</p>
        {(actions.onNewQuiz || actions.onGoToBook) && (
          <div className="next-actions">
            {actions.onNewQuiz && <button type="button" className="btn dark" onClick={actions.onNewQuiz}>Neues Quiz</button>}
            {actions.onGoToBook && <button type="button" className="btn light" onClick={actions.onGoToBook}>Zurück zum Buch</button>}
          </div>
        )}
      </div>
    );
  }

  const { onRetake, onNewQuiz, onGoToBook, onPracticeWeak, onPracticeLektion } = actions;
  const modeLabel = MODE_LABELS[meta.mode] || meta.mode || 'Quiz';
  const scopeLabel = meta.scopeLabel || '';
  const passed = report.accuracy !== null && report.accuracy >= 60;
  const low = report.accuracy !== null && report.accuracy < 40;
  const headline = report.accuracy !== null && report.accuracy < 40
    ? 'Weiter üben.'
    : report.accuracy !== null && report.accuracy < 60
      ? 'Guter Lauf.'
      : 'Sehr stark.';

  const focusLektion = report.recommendation?.focusLektion;
  const focusAction = onPracticeLektion && focusLektion;

  const primary = focusAction
    ? { label: `Lektion ${focusLektion} üben`, onClick: () => onPracticeLektion(focusLektion) }
    : onPracticeWeak
      ? { label: 'Schwache Wörter üben', onClick: onPracticeWeak }
      : onRetake
        ? { label: 'Quiz wiederholen', onClick: onRetake }
        : onNewQuiz
          ? { label: 'Neues Quiz', onClick: onNewQuiz }
          : null;

  const secondary = onNewQuiz && primary?.label !== 'Neues Quiz'
    ? { label: 'Neues Quiz', onClick: onNewQuiz }
    : null;

  const more = [];
  if (onPracticeWeak && primary?.label !== 'Schwache Wörter üben') more.push({ label: 'Schwache Wörter üben', onClick: onPracticeWeak });
  if (onRetake && primary?.label !== 'Quiz wiederholen' && secondary?.label !== 'Quiz wiederholen') more.push({ label: 'Quiz wiederholen', onClick: onRetake });
  if (onGoToBook) more.push({ label: 'Zurück zum Buch', onClick: onGoToBook });

  return (
    <div className="rpr-stack">
      {/* Result overview */}
      <div className="report-hero">
        {passed ? (
          <div className="success-mark"><PartyPopper size={36} aria-hidden="true" /></div>
        ) : (
          <div className={`rpr-mark ${low ? 'low' : 'warn'}`}>
            {low ? <Target size={30} aria-hidden="true" /> : <BarChart3 size={30} aria-hidden="true" />}
          </div>
        )}
        <span className="eyebrow">{modeLabel} ABGESCHLOSSEN{scopeLabel ? ` · ${scopeLabel}` : ''}</span>
        <h1>{headline}</h1>
        <p>{scopeLabel || 'Dein Wortschatz wird sicherer.'}</p>
        <div className="accuracy">
          <strong>{fmtPct(report.accuracy)}</strong>
          <span>GENAUIGKEIT</span>
        </div>
      </div>

      <div className="report-stats">
        <div>
          <span>RICHTIG</span>
          <b>{report.correct}</b>
          <small>von {report.total}</small>
        </div>
        <div>
          <span>XP</span>
          <b>+{report.xp}</b>
          <small>verdient</small>
        </div>
        <div>
          <span>FEHLER</span>
          <b>{report.incorrect}</b>
        </div>
      </div>

      {/* Lektion performance */}
      {report.hasLektionData ? (
        <section className="rpr-card">
          <SectionLabel>LEKTIONSLEISTUNG</SectionLabel>
          <div className="rpr-lek-list">
            {report.perLektion.filter((e) => e.key !== '__unassigned__').map((e, i) => (
              <LektionPerfRow key={e.key} entry={e} index={i} book={meta.book} onPractice={onPracticeLektion} />
            ))}
          </div>
          {report.unassigned && (
            <p className="rpr-unassigned">
              + {report.unassigned.questions} Frage{report.unassigned.questions === 1 ? '' : 'n'} ohne Lektion-Angabe (oben nicht gezählt).
            </p>
          )}
        </section>
      ) : (
        <section className="rpr-card">
          <SectionLabel>LEKTIONSLEISTUNG</SectionLabel>
          <p className="rpr-unassigned">
            Diese Fragen hatten keine Lektion-Infos — die Aufschlüsselung pro Lektion ist daher nicht verfügbar. Dein Gesamtwert oben zählt trotzdem.
          </p>
        </section>
      )}

      {/* Strengths + focus */}
      {(report.strongest || report.weakest) && (
        <section className="rpr-card">
          <SectionLabel>STÄRKEN & FOKUS</SectionLabel>
          <div className="rpr-strength">
            <StrengthCallout strongest={report.strongest} weakest={report.weakest} delay={80} />
          </div>
          {report.needsPractice.length > 0 && (
            <div className="rpr-words">
              <div className="rpr-words-label">Wörter zum Wiederholen</div>
              <div className="rpr-words-list">
                {report.needsPractice.map((e) => `${e.label} (${e.incorrect} falsch)`).join(' • ')}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Recommendation */}
      <RecommendationBox recommendation={report.recommendation} delay={120} />

      {/* Next actions — reuse app routing via callbacks */}
      {(primary || secondary) && (
        <div className="next-actions">
          {primary && <button type="button" className="btn dark" onClick={primary.onClick}>{primary.label}</button>}
          {secondary && <button type="button" className="btn light" onClick={secondary.onClick}>{secondary.label}</button>}
        </div>
      )}

      {more.length > 0 && (
        <div className="rpr-more">
          {more.map((m) => (
            <button key={m.label} type="button" className="btn small light" onClick={m.onClick}>{m.label}</button>
          ))}
        </div>
      )}

      <p className="rpr-note"><Medal size={14} aria-hidden="true" /> Zählt für deinen Lernstand</p>
    </div>
  );
}