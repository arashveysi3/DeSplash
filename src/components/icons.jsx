// Central icon system — single source of truth for all UI icons.
// Every component must import icons only from this file to preserve
// tree-shaking, consistent sizing, and accessible defaults.
//
// Uses lucide-react (MIT, tree-shakeable, currentColor by default).
// No emojis here. Streak tiers map to Lucide components with gradient
// styling applied by callers (see StreakTierIcon).

export {
  // Navigation / layout
  BookOpen,
  GraduationCap,
  Brain,
  Flame,
  Search,
  Target,
  Trophy,
  User,
  ShieldCheck,
  Home,
  Settings,
  Bell,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  LogIn,
  LogOut,
  Plus,
  RotateCcw,
  // Status / feedback
  CheckCircle2,
  CircleCheck,
  CircleX,
  CircleAlert,
  TriangleAlert,
  Info,
  LoaderCircle,
  Loader2,
  // Learning / quiz
  Zap,
  Star,
  Gem,
  Medal,
  Award,
  Heart,
  Clock3,
  CalendarDays,
  CalendarCheck,
  Sparkles,
  Rocket,
  Languages,
  Compass,
  Timer,
  // Audio / interaction
  Volume2,
  VolumeX,
  Mic,
  MessageCircle,
  Eye,
  Play,
  Pause,
  // Games
  Gamepad2,
  Swords,
  Puzzle,
  Shapes,
  Hammer,
  CloudRainWind,
  // Streak system
  Mountain,
  MountainSnow,
  FlameKindling,
  Waves,
  Wind,
  Tornado,
  Orbit,
  Sun,
  Crown,
  Snowflake,
  Sprout,
  PartyPopper,
  Skull,
  // Analytics / empty states
  BarChart3,
  Package,
  BookMarked,
  Library,
  // Misc
  X,
  Check,
} from "lucide-react";

import {
  Flame,
  Zap,
  Mountain,
  MountainSnow,
  Waves,
  Wind,
  Tornado,
  FlameKindling,
  Orbit,
  Sun,
  Crown,
  Snowflake,
  Sprout,
  PartyPopper,
  Trophy,
  Medal,
  Target,
  BookOpen,
  GraduationCap,
  Brain,
  Gamepad2,
  Swords,
  Puzzle,
  CheckCircle2,
  CircleX,
  Clock3,
  Star,
  Gem,
  ShieldCheck,
  CalendarDays,
  Sparkles,
  Timer,
  CalendarCheck,
  Languages,
  Compass,
  Volume2,
  LoaderCircle,
  Heart,
  Search,
  User,
  Settings,
  TriangleAlert,
  BarChart3,
  Package,
  Hammer,
  CloudRainWind,
} from "lucide-react";

// Shared size scale (px). Callers should use these, not magic numbers.
export const ICON_SIZES = {
  nav: 20,
  button: 18,
  card: 22,
  hero: 26,
  achievement: 28,
  empty: 44,
  dialog: 22,
  small: 14,
  medium: 18,
};

// Semantic emoji -> icon mapping (for reference, do not render emojis).
// fire -> Flame, star/xp -> Star/Zap, trophy -> Trophy, target -> Target,
// books -> BookOpen, learn -> GraduationCap, quiz -> Brain,
// energy -> Zap, premium -> Gem, health -> Heart, time -> Clock3,
// calendar -> CalendarDays, games -> Gamepad2, freeze -> Snowflake,
// correct -> CheckCircle2, wrong -> CircleX, home -> Home, etc.

/**
 * Streak tier -> Lucide component.
 * Legendary evolution: 1 Ember (Flame), 2 Inferno (Flame glow),
 * 3 Thunderstorm (Zap), 4 Tsunami (Waves), 5 Hurricane (Wind),
 * 6 Volcano (Mountain), 7 Solar Storm (Sun), 8 Cosmic (Orbit),
 * 9 Legendary (Crown).
 * Levels follow src/utils/streak.js STREAK_MILESTONES (level 1..9).
 */
export const STREAK_TIER_ICONS = {
  1: Flame,
  2: Flame,
  3: Zap,
  4: Waves,
  5: Wind,
  6: Mountain,
  7: Sun,
  8: Orbit,
  9: Crown,
};

/** Legacy emoji-era icon identifiers -> Lucide component. */
const ICON_BY_NAME = {
  flame: Flame,
  fire: Flame,
  ember: Flame,
  inferno: Flame,
  zap: Zap,
  thunderstorm: Zap,
  lightning: Zap,
  mountain: Mountain,
  volcano: Mountain,
  mountainsnow: MountainSnow,
  waves: Waves,
  wave: Waves,
  tsunami: Waves,
  wind: Wind,
  hurricane: Wind,
  tornado: Tornado,
  flamekindling: FlameKindling,
  orbit: Orbit,
  cosmic: Orbit,
  sun: Sun,
  solar: Sun,
  crown: Crown,
  legendary: Crown,
  snowflake: Snowflake,
  freeze: Snowflake,
  sprout: Sprout,
  party: PartyPopper,
  celebration: PartyPopper,
  trophy: Trophy,
  medal: Medal,
  award: Medal,
  target: Target,
  book: BookOpen,
  bookopen: BookOpen,
  package: Package,
  graduation: GraduationCap,
  brain: Brain,
  gamepad: Gamepad2,
  swords: Swords,
  puzzle: Puzzle,
  hammer: Hammer,
  rain: CloudRainWind,
  check: CheckCircle2,
  cross: CircleX,
  clock: Clock3,
  timer: Timer,
  star: Star,
  gem: Gem,
  shield: ShieldCheck,
  calendar: CalendarDays,
  calendarcheck: CalendarCheck,
  sparkles: Sparkles,
  languages: Languages,
  compass: Compass,
  volume: Volume2,
  loader: LoaderCircle,
  heart: Heart,
  search: Search,
  user: User,
  settings: Settings,
  warning: TriangleAlert,
  chart: BarChart3,
};

export function getStreakTierIcon(level) {
  return STREAK_TIER_ICONS[level] || Flame;
}

/** Resolve a streak icon identifier (from streak.js) to a Lucide component. */
export function getIconByName(name) {
  if (!name) return Flame;
  const key = String(name).toLowerCase();
  return ICON_BY_NAME[key] || Flame;
}

/**
 * Professional streak tier icon with tier-appropriate gradient styling.
 * Styling carries the evolution (not emoji changes).
 */
export function StreakTierIcon({ level, iconName, size = ICON_SIZES.hero, style, ...props }) {
  const Cmp = iconName
    ? getIconByName(iconName)
    : getStreakTierIcon(level);
  const glow = level === 2 || level >= 8 ? "0 0 18px rgba(249,115,22,0.55)" : undefined;
  const gradients = {
    1: "#f97316",
    2: "#ef4444",
    3: "#eab308",
    4: "#0ea5e9",
    5: "#22d3ee",
    6: "#fb923c",
    7: "#f59e0b",
    8: "#8b5cf6",
    9: "#e9d5ff",
  };
  return (
    <Cmp
      size={size}
      aria-hidden="true"
      color={gradients[level] || "currentColor"}
      style={{ filter: glow ? `drop-shadow(${glow})` : undefined, flexShrink: 0, ...style }}
      {...props}
    />
  );
}

/** Rounded icon container for cards / metrics. Inherits theme via currentColor. */
export function IconBadge({ children, background = "rgba(15,15,18,0.06)", color, size = 40, radius = 12, style }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background,
        color: color || "currentColor",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Centered large icon for empty states (muted, accessible). */
export function EmptyStateIcon({ icon: Cmp = BookOpen, size = ICON_SIZES.empty, style }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, ...style }}>
      <Cmp size={size} aria-hidden="true" style={{ color: "#9aa0b2", flexShrink: 0 }} />
    </div>
  );
}
