import { Snowflake } from 'lucide-react';

/** Frozen-day overlay: ice glass, crystal border, shield icon, shimmer. */
export default function FreezeOverlay({ compact = false }) {
  return (
    <span aria-hidden="true" className="sk-freeze-overlay">
      <span aria-hidden="true" className="sk-freeze-shimmer" />
      <Snowflake size={compact ? 12 : 16} strokeWidth={1.8} aria-hidden="true" className="sk-freeze-icon" />
    </span>
  );
}
