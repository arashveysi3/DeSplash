import TierBadge from './TierBadge.jsx';
import { TierEffect } from './effects.jsx';
import { toPersianDigits } from '../../utils/streak.js';

const CELEBRATION_COPY = {
  1: { title: 'Ember ignited', sub: 'Your journey begins. One day at a time.' },
  2: { title: 'Inferno unlocked', sub: 'Fire expands. Ten days of dedication.' },
  3: { title: 'Thunderstorm unlocked', sub: 'Lightning strikes. Energy builds on fire.' },
  4: { title: 'Tsunami unlocked', sub: 'A wave washes across your timeline.' },
  5: { title: 'Hurricane unlocked', sub: 'Wind spins up. Ninety days strong.' },
  6: { title: 'Volcano unlocked', sub: 'The ground cracks. Lava emerges.' },
  7: { title: 'Solar Storm unlocked', sub: 'Golden light explosion. Elite territory.' },
  8: { title: 'Cosmic unlocked', sub: 'A galaxy expands behind your calendar. One full year.' },
  9: { title: 'Legendary unlocked', sub: 'Aurora and constellations. Two years. Unforgettable.' },
};

/**
 * Fullscreen one-time tier celebration. Rendered once per tier unlock;
 * the caller persists the seen state (localStorage).
 */
export default function TierCelebration({ tier, streakDays, onDone }) {
  if (!tier) return null;
  const copy = CELEBRATION_COPY[tier.level] || { title: `${tier.name} unlocked`, sub: 'Your streak evolves.' };
  return (
    <div className={`sk-tier-celebrate sk-tier-celebrate-${tier.level}`} role="dialog" aria-modal="true" aria-label={`${tier.name} unlocked`}>
      <div aria-hidden="true" className="sk-tier-celebrate-fx">
        <TierEffect level={tier.level} />
      </div>
      <div className="sk-tier-celebrate-card">
        <TierBadge level={tier.level} name={tier.name} icon={tier.icon} size="lg" />
        <h2 className="sk-celebrate-title">{copy.title}</h2>
        <div className="sk-celebrate-sub">{copy.sub}</div>
        <div lang="fa" dir="rtl" className="sk-celebrate-fa">
          {toPersianDigits(streakDays)} روز متوالی
        </div>
        <div className="sk-celebrate-actions">
          <button type="button" className="btn yellow" onClick={onDone}>Continue the streak</button>
        </div>
      </div>
    </div>
  );
}
