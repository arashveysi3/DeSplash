import { Snowflake } from '../icons.jsx';

/** Frozen-day overlay: ice glass, crystal border, shield icon, shimmer. */
export default function FreezeOverlay({ compact = false }) {
  return (
    <span aria-hidden="true" className="gs-freeze-overlay">
      <span aria-hidden="true" className="gs-freeze-shimmer" />
      <Snowflake size={compact ? 12 : 16} aria-hidden="true" className="gs-freeze-icon" />
    </span>
  );
}
