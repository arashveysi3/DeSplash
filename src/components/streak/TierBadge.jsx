import { Flame, Waves, Wind, Mountain, Sun, Orbit, Crown, Zap } from 'lucide-react';
import { STREAK_TIER_VISUALS } from '../../utils/streak.js';

/** Tier icon name -> Lucide component (static map, no factory calls in render). */
const TIER_GLYPHS = {
  flame: Flame,
  zap: Zap,
  waves: Waves,
  wind: Wind,
  mountain: Mountain,
  sun: Sun,
  orbit: Orbit,
  crown: Crown,
};

/** Bare tier glyph for use outside the badge (hero orb, tier list, overlays). */
export function TierGlyph({ icon, size = 22, strokeWidth = 1.8, ...rest }) {
  const Glyph = TIER_GLYPHS[icon] || TIER_GLYPHS.flame;
  return <Glyph size={size} strokeWidth={strokeWidth} aria-hidden="true" {...rest} />;
}

const DIMS = {
  lg: { pad: 14, icon: 30, font: 15 },
  md: { pad: 10, icon: 18, font: 13 },
  sm: { pad: 6, icon: 14, font: 11 },
};

/**
 * Reusable tier badge: Lucide glyph + tier gradient + glow + tier name.
 * No emojis — visual identity comes from gradient, glow and icon.
 */
export default function TierBadge({ level, name, icon, size = 'md', style }) {
  const visuals = STREAK_TIER_VISUALS[Number(level)] || STREAK_TIER_VISUALS[1];
  const dims = DIMS[size] || DIMS.md;
  return (
    <span
      className={`sk-badge sk-badge-${size}`}
      style={{
        padding: `${dims.pad - 2}px ${dims.pad + 4}px`,
        fontSize: dims.font,
        background: visuals.gradient,
        boxShadow: `0 4px 16px ${visuals.glow}`,
        ...style,
      }}
    >
      <TierGlyph icon={icon} size={dims.icon} style={{ flexShrink: 0 }} />
      {name}
    </span>
  );
}
