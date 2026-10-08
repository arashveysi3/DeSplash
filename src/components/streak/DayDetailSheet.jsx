import {
  GREGORIAN_MONTHS,
  GREGORIAN_WEEKDAYS,
  PERSIAN_WEEKDAYS,
  jalaliLabel,
  persianWeekdayIndex,
  toPersianDigits,
} from '../../utils/streak.js';
import { Snowflake, Zap, Target, Gamepad2 } from 'lucide-react';
import TierBadge from './TierBadge.jsx';

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
    <div className="sk-sheet-overlay" role="dialog" aria-modal="true" aria-label={`Details for ${cell.key}`} onClick={onClose}>
      <div className="sk-sheet-card" onClick={(e) => e.stopPropagation()}>
        <span aria-hidden="true" className="sk-sheet-handle" />
        <span className="sk-sheet-date">{gregTitle}</span>
        <div lang="fa" dir="rtl" className="sk-sheet-fa">
          {faWeekday} • {jalaliLabel(`${cell.key}T12:00:00Z`)}
        </div>

        <div className="sk-sheet-badges">
          {completed && cell.tierLevel ? (
            <TierBadge level={cell.tierLevel} name={cell.tierName || 'Ember'} icon={cell.tierIcon} />
          ) : frozen ? (
            <span className="sk-sheet-freeze">
              <Snowflake size={16} strokeWidth={1.8} aria-hidden="true" /> Freeze protected
            </span>
          ) : (
            <span className="sk-sheet-status">
              {cell.status === 'future' ? 'Upcoming day' : cell.isToday ? 'Today — not completed yet' : 'Rest day'}
            </span>
          )}
          {completed && cell.streakLength != null && (
            <span className="sk-sheet-day">Day {cell.streakLength}</span>
          )}
        </div>

        {(completed || frozen) && (
          <div className="sk-sheet-body">
            <div className="sk-sheet-stats">
              <div className="sk-sheet-stat">
                <Zap size={16} strokeWidth={1.8} aria-hidden="true" style={{ color: '#d97706' }} />
                <div><div className="sk-sheet-stat-v">{cell.xp}</div><div className="sk-sheet-stat-l">XP</div></div>
              </div>
              <div className="sk-sheet-stat">
                <Target size={16} strokeWidth={1.8} aria-hidden="true" style={{ color: '#4675e8' }} />
                <div><div className="sk-sheet-stat-v">{cell.attempts}</div><div className="sk-sheet-stat-l">Reviews</div></div>
              </div>
              <div className="sk-sheet-stat">
                <Gamepad2 size={16} strokeWidth={1.8} aria-hidden="true" style={{ color: '#4675e8' }} />
                <div><div className="sk-sheet-stat-v">{sessionCount}</div><div className="sk-sheet-stat-l">Sessions</div></div>
              </div>
            </div>
            {modes.length > 0 && (
              <div className="sk-sheet-modes">
                {modes.map((m) => `${m.label} ×${m.count}`).join(' • ')}
              </div>
            )}
            {cell.isMilestoneDay && (
              <div className="sk-sheet-milestone">Milestone day — freeze earned</div>
            )}
          </div>
        )}

        {!completed && !frozen && (
          <p className="sk-sheet-note">
            {cell.status === 'future'
              ? 'Keep your streak alive and this day will join your evolution timeline.'
              : 'Finish a pack, quiz, or game to add this day to your timeline.'}
          </p>
        )}

        <div className="sk-sheet-close">
          <button type="button" className="btn light" onClick={onClose}>Close</button>
        </div>
        <div lang="fa" dir="rtl" className="sk-sheet-fa-note">
          {completed && cell.streakLength != null ? `${toPersianDigits(cell.streakLength)}مین روز متوالی` : ''}
        </div>
      </div>
    </div>
  );
}
