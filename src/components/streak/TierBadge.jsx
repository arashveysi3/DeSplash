import { getIconByName, ICON_SIZES } from '../icons.jsx';
import { STREAK_TIER_VISUALS } from '../../utils/streak.js';

/**
 * Reusable premium tier badge: Lucide icon + gradient + glow + tier name.
 * No emojis — visual identity comes from gradient, glow and icon.
 */
export default function TierBadge({ level, name, icon, size = 'md', style }) {
  const visuals = STREAK_TIER_VISUALS[Number(level)] || STREAK_TIER_VISUALS[1];
  const Icon = getIconByName(icon);
  const dims = size === 'lg'
    ? { pad: 14, icon: 30, font: 15 }
    : size === 'sm'
      ? { pad: 6, icon: 14, font: 11 }
      : { pad: 10, icon: ICON_SIZES.card, font: 13 };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: `${dims.pad - 2}px ${dims.pad + 4}px`,
        borderRadius: 999,
        background: visuals.gradient,
        color: '#fff',
        fontWeight: 800,
        fontSize: dims.font,
        boxShadow: `0 4px 16px ${visuals.glow}`,
        ...style,
      }}
    >
      <Icon size={dims.icon} aria-hidden="true" style={{ flexShrink: 0 }} />
      {name}
    </span>
  );
}
