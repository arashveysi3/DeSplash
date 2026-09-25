import { Block } from 'baseui/block';
import { Button, SHAPE } from 'baseui/button';
import { Heading } from 'baseui/heading';
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
    <div className={`gs-tier-celebrate gs-tier-celebrate-${tier.level}`} role="dialog" aria-modal="true" aria-label={`${tier.name} unlocked`}>
      <div aria-hidden="true" className="gs-tier-celebrate-fx">
        <TierEffect level={tier.level} />
      </div>
      <div className="gs-tier-celebrate-card">
        <TierBadge level={tier.level} name={tier.name} icon={tier.icon} size="lg" />
        <Heading $style={{ fontSize: 24, margin: '14px 0 4px', color: '#fff' }}>{copy.title}</Heading>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{copy.sub}</div>
        <div lang="fa" dir="rtl" style={{ fontFamily: 'IRANSans', fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 8 }}>
          {toPersianDigits(streakDays)} روز متوالی
        </div>
        <Block marginTop="20px" display="flex" justifyContent="center">
          <Button shape={SHAPE.pill} onClick={onDone}>Continue the streak</Button>
        </Block>
      </div>
    </div>
  );
}
