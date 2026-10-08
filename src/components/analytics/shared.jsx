import { BarChart3, CheckCircle2, TriangleAlert } from 'lucide-react';
import Icon from '../shell/Icon.jsx';
import { LEKTION_META } from '../../data/menschen.js';

export function fmtPct(value) {
  return value === null || value === undefined ? '—' : `${value}%`;
}

export function accuracyColor(value) {
  if (value === null || value === undefined) return '#9aa0b2';
  if (value >= 80) return '#16a34a';
  if (value >= 40) return '#0f0f12';
  return '#ea580c';
}

export function lektionTitle(lektion, book) {
  if (!lektion || lektion === '__unassigned__') return '';
  if (!book) return '';
  return LEKTION_META?.[`${book}::${lektion}`]?.title || '';
}

/** Small stat tile: big value + caption. */
export function StatTile({ icon: IconCmp, value, label, sub, color, delay = 0 }) {
  return (
    <div className="rpr-in rpr-tile" style={{ animationDelay: `${delay}ms` }}>
      {IconCmp && (
        <div className="rpr-tile-ic">
          <IconCmp size={22} aria-hidden="true" style={{ color: color || '#0f0f12' }} />
        </div>
      )}
      <div className="rpr-tile-value" style={{ color: color || '#0f0f12' }}>{value}</div>
      <div className="rpr-tile-label">{label}</div>
      {sub && <div className="rpr-tile-sub">{sub}</div>}
    </div>
  );
}

/** Thin progress bar with animated fill. value null => empty track + "—". */
export function AccuracyBar({ value, height = 6, delay = 0 }) {
  return (
    <div className="rpr-track" style={{ height }}>
      <div
        className="rpr-fill"
        style={{
          height: '100%',
          width: value === null || value === undefined ? '0%' : `${value}%`,
          background: accuracyColor(value),
          animationDelay: `${delay}ms`,
        }}
      />
    </div>
  );
}

/** One Lektion performance row: name, counts, accuracy, bar, optional practice action. */
export function LektionPerfRow({ entry, index = 0, onPractice, showWords, book }) {
  const title = lektionTitle(entry.key, book);
  return (
    <div className="rpr-in rpr-lektion" style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}>
      <div className="rpr-lek-head">
        <div>
          <div className="rpr-lek-name">{entry.label}</div>
          {title && <div className="rpr-lek-title">{title}</div>}
          <div className="rpr-lek-stats">
            {entry.questions} Frage{entry.questions === 1 ? '' : 'n'} • {entry.correct} richtig
            {entry.incorrect > 0 && <span className="rpr-lek-missed"> • {entry.incorrect} falsch</span>}
            {showWords && entry.totalWords > 0 && <span> • {entry.seen}/{entry.totalWords} gesehen</span>}
          </div>
        </div>
        <div className="rpr-lek-pct">
          <b style={{ color: accuracyColor(entry.accuracy) }}>{fmtPct(entry.accuracy)}</b>
          {entry.lowConfidence && <small>wenig Daten</small>}
        </div>
      </div>
      <div className="rpr-lek-bar">
        <AccuracyBar value={entry.accuracy} delay={Math.min(index, 8) * 60 + 150} />
      </div>
      {onPractice && entry.key !== '__unassigned__' && (
        <div className="rpr-lek-practice">
          <button type="button" className="btn small light" onClick={() => onPractice(entry.key)}>{entry.label} üben →</button>
        </div>
      )}
    </div>
  );
}

/** Non-punitive strongest/weakest callout. */
export function StrengthCallout({ strongest, weakest, delay = 0 }) {
  if (!strongest && !weakest) return null;
  const same = strongest && weakest && strongest.key === weakest.key;
  return (
    <div className="rpr-callout" style={{ animationDelay: `${delay}ms` }}>
      {strongest && (
        <div className="rpr-call good">
          <div className="rpr-call-tag"><CheckCircle2 size={12} aria-hidden="true" /> LÄUFT GUT</div>
          <div className="rpr-call-name">{strongest.label}</div>
          <div className="rpr-call-sub">{fmtPct(strongest.accuracy)} • {strongest.correct}/{strongest.questions}</div>
        </div>
      )}
      {weakest && !same && (
        <div className="rpr-call focus">
          <div className="rpr-call-tag">MEHR ÜBEN</div>
          <div className="rpr-call-name">{weakest.label}</div>
          <div className="rpr-call-sub">{fmtPct(weakest.accuracy)} • {weakest.incorrect} falsch</div>
        </div>
      )}
      {same && (
        <div className="rpr-call neutral">
          <div className="rpr-call-tag">FOKUS</div>
          <div className="rpr-call-name">{weakest.label}</div>
          <div className="rpr-call-sub">{fmtPct(weakest.accuracy)} • weiter üben</div>
        </div>
      )}
    </div>
  );
}

/** Deterministic recommendation box. */
export function RecommendationBox({ recommendation, delay = 0 }) {
  if (!recommendation) return null;
  const low = recommendation.confidence !== 'high';
  return (
    <div className={`rpr-in rpr-reco ${low ? 'lo' : 'hi'}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="rpr-reco-ic"><Icon name="bolt" /></div>
      <div className="rpr-reco-body">
        <span className="eyebrow">{low ? 'TIPP' : 'EMPFEHLUNG'}</span>
        <p>{recommendation.text}</p>
      </div>
    </div>
  );
}

export function AnalyticsEmpty({ icon: IconCmp = BarChart3, title, hint }) {
  return (
    <div className="ana-empty">
      <div className="ana-empty-ic">
        <IconCmp size={44} aria-hidden="true" />
      </div>
      <b>{title}</b>
      {hint && <p>{hint}</p>}
    </div>
  );
}

export function AnalyticsError({ message, onRetry }) {
  return (
    <div className="ana-error">
      <TriangleAlert size={28} aria-hidden="true" />
      <b>Analyse nicht laden</b>
      <p>{message || 'Beim Lesen deiner Historie ist etwas schiefgegangen.'}</p>
      {onRetry && (
        <div className="ana-error-retry">
          <button type="button" className="btn small light" onClick={onRetry}>Erneut versuchen</button>
        </div>
      )}
    </div>
  );
}

export function SectionLabel({ children }) {
  return <div className="ana-label">{children}</div>;
}