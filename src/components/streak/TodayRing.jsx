import { STREAK_TIER_VISUALS } from '../../utils/streak.js';

const C = 2 * Math.PI * 20;

/**
 * Today's progress ring: animated outer SVG ring around the tile.
 * Pending (not yet completed): partially-empty rotating dashed ring.
 * Completed: full ring with a satisfying fill + soft pulse.
 */
export default function TodayRing({ completed, tierLevel }) {
  const visuals = STREAK_TIER_VISUALS[Number(tierLevel)] || STREAK_TIER_VISUALS[1];
  const accent = completed ? visuals.accent : '#0f0f12';
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 44 44"
      className={`gs-today-ring${completed ? ' gs-today-ring-done' : ''}`}
      focusable="false"
    >
      <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(15,15,18,0.12)" strokeWidth="2.5" />
      <circle
        cx="22"
        cy="22"
        r="20"
        fill="none"
        stroke={accent}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={completed ? `${C} ${C}` : `${C * 0.28} ${C * 0.72}`}
        strokeDashoffset={completed ? 0 : C * 0.25}
        transform="rotate(-90 22 22)"
      />
    </svg>
  );
}
