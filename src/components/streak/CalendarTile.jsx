import { memo } from 'react';
import { toPersianDigits } from '../../utils/streak.js';
import { STREAK_TIER_VISUALS } from '../../utils/streak.js';
import { TierEffect } from './effects.jsx';
import TodayRing from './TodayRing.jsx';
import FreezeOverlay from './FreezeOverlay.jsx';

/**
 * Legendary calendar tile — layered visuals per earned tier.
 * Completed tiles render their SAVED tier (never the current tier).
 * Memoized: only the visible month renders, tiles skip unrelated updates.
 */
function CalendarTile({ cell, onSelect }) {
  const {
    key,
    gregorianDay,
    jalali,
    status,
    isToday,
    inCurrentChain,
    chainTierLevel,
    streakLength,
    tierLevel,
    tierName,
    intensity,
    isMilestoneDay,
  } = cell;

  const completed = status === 'completed';
  const frozen = status === 'protected';
  const visuals = tierLevel ? STREAK_TIER_VISUALS[tierLevel] : null;

  const className = [
    'gs-cal-cell',
    `gs-cal-${status}`,
    completed && tierLevel ? `gs-tier-${tierLevel}` : '',
    inCurrentChain ? `gs-in-chain gs-chain-${chainTierLevel || tierLevel || 1}` : '',
    isToday ? 'gs-cal-today' : '',
    isMilestoneDay ? 'gs-cal-milestone' : '',
  ].filter(Boolean).join(' ');

  const style = completed && visuals
    ? { '--gs-tier-glow': visuals.glow, '--gs-tier-accent': visuals.accent }
    : undefined;

  const label = completed
    ? `${key}: completed, day ${streakLength ?? '?'}, ${tierName || 'Ember'} tier`
    : frozen
      ? `${key}: freeze protected`
      : `${key}: ${status}`;

  const interactive = completed || frozen || status === 'missed' || isToday;

  return (
    <div
      role="gridcell"
      aria-label={label}
      title={completed ? `${key} • day ${streakLength ?? '?'} • ${tierName || ''}` : `${key} • ${status}`}
      className={className}
      style={style}
      onClick={interactive ? () => onSelect?.(cell) : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(cell); } } : undefined}
      tabIndex={interactive ? 0 : -1}
    >
      {completed && tierLevel && <TierEffect level={tierLevel} />}
      {completed && visuals && (
        <span aria-hidden="true" className="gs-tile-glow" style={{ opacity: intensity ?? 0.7 }} />
      )}
      {isToday && <TodayRing completed={completed || frozen} tierLevel={tierLevel || chainTierLevel} />}
      {frozen && <FreezeOverlay />}
      <span className="gs-cal-g">{gregorianDay}</span>
      <span className="gs-cal-j" lang="fa">{toPersianDigits(jalali.jd)}</span>
      {inCurrentChain && <span aria-hidden="true" className="gs-tile-trail" />}
    </div>
  );
}

function propsEqual(prev, next) {
  const a = prev.cell;
  const b = next.cell;
  return (
    a.key === b.key &&
    a.status === b.status &&
    a.isToday === b.isToday &&
    a.inCurrentChain === b.inCurrentChain &&
    a.chainTierLevel === b.chainTierLevel &&
    a.streakLength === b.streakLength &&
    a.tierLevel === b.tierLevel &&
    a.intensity === b.intensity &&
    a.attempts === b.attempts &&
    a.xp === b.xp &&
    a.isMilestoneDay === b.isMilestoneDay &&
    prev.onSelect === next.onSelect
  );
}

export default memo(CalendarTile, propsEqual);
