import { Block } from 'baseui/block';
import { Button, KIND, SHAPE } from 'baseui/button';
import { LabelSmall, ParagraphSmall } from 'baseui/typography';
import {
  GREGORIAN_MONTHS,
  GREGORIAN_WEEKDAYS,
  PERSIAN_WEEKDAYS,
  jalaliLabel,
  persianWeekdayIndex,
  toPersianDigits,
} from '../../utils/streak.js';
import TierBadge from './TierBadge.jsx';
import { Snowflake, Zap, Target, Gamepad2 } from '../icons.jsx';

const MODE_LABELS = {
  pack: 'Flashcards',
  dictation: 'Dictation',
  artikel: 'Artikel',
  fa: 'Persian',
  mixed: 'Mixed quiz',
  choice: '4-Choice',
  quiz: 'Quiz',
  match: 'Match Dash',
  sprint: 'Lightning Sprint',
  satz: 'Sentence Forge',
  rain: 'Word Rain',
};

/**
 * Day detail bottom sheet: Gregorian + Shamsi + weekday header,
 * activity summary for that day, and the earned tier badge.
 */
export default function DayDetailSheet({ cell, onClose }) {
  if (!cell) return null;
  const date = new Date(Date.parse(`${cell.key}T12:00:00Z`));
  const gregWeekday = GREGORIAN_WEEKDAYS[date.getUTCDay()];
  const faWeekday = PERSIAN_WEEKDAYS[persianWeekdayIndex(date)];
  const gregTitle = `${gregWeekday}, ${GREGORIAN_MONTHS[date.getUTCMonth()]} ${cell.gregorianDay}, ${date.getUTCFullYear()}`;
  const modes = Object.entries(cell.sources || {})
    .filter(([mode]) => MODE_LABELS[mode])
    .map(([mode, count]) => ({ mode, label: MODE_LABELS[mode], count }));
  const sessionCount = Object.keys(cell.sessions || {}).length;
  const completed = cell.status === 'completed';
  const frozen = cell.status === 'protected';

  return (
    <div className="gs-sheet-overlay" role="dialog" aria-modal="true" aria-label={`Details for ${cell.key}`} onClick={onClose}>
      <div className="gs-sheet-card" onClick={(e) => e.stopPropagation()}>
        <span aria-hidden="true" className="gs-sheet-handle" />
        <LabelSmall color="#9aa0b2">{gregTitle}</LabelSmall>
        <div lang="fa" dir="rtl" style={{ fontFamily: 'IRANSans', fontSize: 15, fontWeight: 800, marginTop: 2 }}>
          {faWeekday} • {cell.jalaliLabel}
        </div>
        <div style={{ fontSize: 11, color: '#9aa0b2', marginTop: 2 }}>{jalaliLabel(`${cell.key}T12:00:00Z`)}</div>

        <Block marginTop="12px" display="flex" gridGap="8px" alignItems="center">
          {completed && cell.tierLevel ? (
            <TierBadge level={cell.tierLevel} name={cell.tierName || 'Ember'} icon={cell.tierIcon} />
          ) : frozen ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#e0f2fe', color: '#0369a1', borderRadius: 999, padding: '6px 12px', fontWeight: 800, fontSize: 13 }}>
              <Snowflake size={16} aria-hidden="true" /> Freeze protected
            </span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6b6b7a' }}>
              {cell.status === 'future' ? 'Upcoming day' : cell.isToday ? 'Today — not completed yet' : 'Rest day'}
            </span>
          )}
          {completed && cell.streakLength != null && (
            <span style={{ fontSize: 12, fontWeight: 800, color: '#0f0f12' }}>Day {cell.streakLength}</span>
          )}
        </Block>

        {(completed || frozen) && (
          <Block marginTop="12px" display="flex" flexDirection="column" gridGap="8px">
            <Block display="flex" gridGap="8px">
              <div className="gs-sheet-stat">
                <Zap size={16} aria-hidden="true" style={{ color: '#eab308' }} />
                <div><div className="gs-sheet-stat-v">{cell.xp}</div><div className="gs-sheet-stat-l">XP</div></div>
              </div>
              <div className="gs-sheet-stat">
                <Target size={16} aria-hidden="true" style={{ color: '#4f46e5' }} />
                <div><div className="gs-sheet-stat-v">{cell.attempts}</div><div className="gs-sheet-stat-l">Reviews</div></div>
              </div>
              <div className="gs-sheet-stat">
                <Gamepad2 size={16} aria-hidden="true" style={{ color: '#0ea5e9' }} />
                <div><div className="gs-sheet-stat-v">{sessionCount}</div><div className="gs-sheet-stat-l">Sessions</div></div>
              </div>
            </Block>
            {modes.length > 0 && (
              <div style={{ fontSize: 12, color: '#4b4b58', lineHeight: 1.6 }}>
                {modes.map((m) => `${m.label} ×${m.count}`).join(' • ')}
              </div>
            )}
            {cell.isMilestoneDay && (
              <div style={{ fontSize: 12, fontWeight: 800, color: '#b45309' }}>Milestone day — freeze earned</div>
            )}
          </Block>
        )}

        {!completed && !frozen && (
          <ParagraphSmall color="#6b6b6b" margin="12px 0 0">
            {cell.status === 'future'
              ? 'Keep your streak alive and this day will join your evolution timeline.'
              : 'Finish a pack, quiz, or game to add this day to your timeline.'}
          </ParagraphSmall>
        )}

        <Block marginTop="16px" display="flex" justifyContent="center">
          <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={onClose}>Close</Button>
        </Block>
        <div lang="fa" dir="rtl" style={{ fontFamily: 'IRANSans', fontSize: 11, color: '#9aa0b2', textAlign: 'center', marginTop: 8 }}>
          {completed && cell.streakLength != null ? `${toPersianDigits(cell.streakLength)}مین روز متوالی` : ''}
        </div>
      </div>
    </div>
  );
}
