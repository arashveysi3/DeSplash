import { Block } from 'baseui/block';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { LabelSmall, ParagraphSmall } from 'baseui/typography';
import UberCard from '../cards/UberCard.jsx';
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

export function lektionTitle(lektion) {
  if (!lektion || lektion === '__unassigned__') return '';
  return LEKTION_META?.[lektion]?.title || '';
}

/** Small stat tile: big value + caption. Reuses DeSplash card language. */
export function StatTile({ value, label, sub, color, delay = 0 }) {
  return (
    <div
      className="gs-report-item"
      style={{
        backgroundColor: '#f7f7fb',
        border: '1px solid #e9e8f0',
        borderRadius: 16,
        padding: '12px 10px',
        textAlign: 'center',
        minWidth: 0,
        animationDelay: `${delay}ms`,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 20, color: color || '#0f0f12', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#0f0f12', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#9aa0b2', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/** Thin progress bar with animated fill. value null => empty track + "—". */
export function AccuracyBar({ value, height = 6, delay = 0 }) {
  return (
    <div style={{ height, background: '#eee', borderRadius: 999, overflow: 'hidden' }}>
      <div
        className="gs-bar-fill"
        style={{
          height: '100%',
          width: value === null || value === undefined ? '0%' : `${value}%`,
          background: accuracyColor(value),
          borderRadius: 999,
          animationDelay: `${delay}ms`,
        }}
      />
    </div>
  );
}

/** One Lektion performance row: name, counts, accuracy, bar, optional practice action. */
export function LektionPerfRow({ entry, index = 0, onPractice, showWords }) {
  const title = lektionTitle(entry.key);
  return (
    <div
      className="gs-report-item"
      style={{
        border: '1px solid #e9e8f0',
        borderRadius: 14,
        padding: '10px 12px',
        background: '#fff',
        animationDelay: `${Math.min(index, 8) * 60}ms`,
      }}
    >
      <Block display="flex" justifyContent="space-between" alignItems="flex-start" gridGap="8px">
        <Block>
          <div style={{ fontWeight: 800, fontSize: 13 }}>{entry.label}</div>
          {title && <div style={{ fontSize: 11, color: '#9aa0b2', marginTop: 1, lineHeight: 1.3 }}>{title}</div>}
          <div style={{ fontSize: 11, color: '#6b6b7a', marginTop: 3 }}>
            {entry.questions} question{entry.questions === 1 ? '' : 's'} • {entry.correct} correct
            {entry.incorrect > 0 && <span style={{ color: '#dc2626' }}> • {entry.incorrect} missed</span>}
            {showWords && entry.totalWords > 0 && <span> • {entry.seen}/{entry.totalWords} seen</span>}
          </div>
        </Block>
        <Block display="flex" flexDirection="column" alignItems="flex-end" gridGap="4px" overrides={{ Block: { style: { flexShrink: 0 } } }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: accuracyColor(entry.accuracy) }}>{fmtPct(entry.accuracy)}</div>
          {entry.lowConfidence && <div style={{ fontSize: 10, color: '#9aa0b2' }}>thin sample</div>}
        </Block>
      </Block>
      <Block marginTop="8px">
        <AccuracyBar value={entry.accuracy} delay={Math.min(index, 8) * 60 + 150} />
      </Block>
      {onPractice && entry.key !== '__unassigned__' && (
        <Block marginTop="8px">
          <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={() => onPractice(entry.key)}>
            Practice {entry.label} →
          </Button>
        </Block>
      )}
    </div>
  );
}

/** Non-punitive strongest/weakest callout. */
export function StrengthCallout({ strongest, weakest, delay = 0 }) {
  if (!strongest && !weakest) return null;
  const same = strongest && weakest && strongest.key === weakest.key;
  return (
    <div className="gs-report-item" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, animationDelay: `${delay}ms` }}>
      {strongest && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, color: '#16a34a' }}>GOING WELL ✓</div>
          <div style={{ fontWeight: 800, fontSize: 13, marginTop: 4 }}>{strongest.label}</div>
          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>{fmtPct(strongest.accuracy)} • {strongest.correct}/{strongest.questions}</div>
        </div>
      )}
      {weakest && !same && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, color: '#b45309' }}>NEEDS PRACTICE</div>
          <div style={{ fontWeight: 800, fontSize: 13, marginTop: 4 }}>{weakest.label}</div>
          <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>{fmtPct(weakest.accuracy)} • {weakest.incorrect} missed</div>
        </div>
      )}
      {same && (
        <div style={{ background: '#f7f7fb', border: '1px solid #e9e8f0', borderRadius: 14, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, color: '#6b6b7a' }}>FOCUS</div>
          <div style={{ fontWeight: 800, fontSize: 13, marginTop: 4 }}>{weakest.label}</div>
          <div style={{ fontSize: 11, color: '#6b6b7a', marginTop: 2 }}>{fmtPct(weakest.accuracy)} • keep practicing</div>
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
    <div
      className="gs-report-item"
      style={{
        background: low ? '#f7f7fb' : '#0f0f12',
        color: low ? '#0f0f12' : '#fff',
        border: low ? '1px solid #e9e8f0' : 'none',
        borderRadius: 14,
        padding: '12px 14px',
        animationDelay: `${delay}ms`,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, color: low ? '#6b6b7a' : 'rgba(255,255,255,0.7)' }}>
        {low ? 'SUGGESTION' : '💡 RECOMMENDATION'}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6, lineHeight: 1.5 }}>{recommendation.text}</div>
    </div>
  );
}

export function AnalyticsEmpty({ emoji = '📊', title, hint }) {
  return (
    <UberCard styleOverride={{ textAlign: 'center', paddingTop: 24, paddingBottom: 24, backgroundColor: '#f7f7fb', borderColor: '#e9e8f0' }}>
      <div style={{ fontSize: 32 }}>{emoji}</div>
      <div style={{ fontWeight: 800, fontSize: 15, marginTop: 8 }}>{title}</div>
      {hint && <ParagraphSmall color="#6b6b6b" margin="6px 0 0">{hint}</ParagraphSmall>}
    </UberCard>
  );
}

export function AnalyticsError({ message, onRetry }) {
  return (
    <UberCard styleOverride={{ textAlign: 'center', backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
      <div style={{ fontSize: 28 }}>⚠️</div>
      <div style={{ fontWeight: 800, fontSize: 14, marginTop: 6 }}>Couldn&apos;t load analytics</div>
      <ParagraphSmall color="#991b1b" margin="4px 0 0">{message || 'Something went wrong reading your history.'}</ParagraphSmall>
      {onRetry && (
        <Block marginTop="12px" display="flex" justifyContent="center">
          <Button size={SIZE.compact} shape={SHAPE.pill} onClick={onRetry}>Retry</Button>
        </Block>
      )}
    </UberCard>
  );
}

export function SectionLabel({ children }) {
  return <LabelSmall color="#6b6b6b" overrides={{ Block: { style: { fontWeight: 800, letterSpacing: 0.6, fontSize: 11 } } }}>{children}</LabelSmall>;
}
