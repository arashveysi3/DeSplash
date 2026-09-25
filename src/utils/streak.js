/**
 * Shared streak domain engine (GermanSplash streak system).
 *
 * Single source of truth for streak state transitions. Pure functions only:
 * no Date.now() inside transitions (callers pass `today`/`now`), no storage,
 * no network, no DOM. Usable from the Dexie persistence layer, the Redis API
 * route, and node:test.
 *
 * Day convention: UTC calendar day `YYYY-MM-DD`, matching the app's existing
 * UTC-day convention (see src/utils/selection.js todayKey/dayStartOf).
 * A completed learning event belongs to exactly one deterministic UTC day
 * derived from its trusted timestamp — never from client-asserted counters.
 */

export const STREAK_TIMEZONE = 'UTC';
export const STREAK_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const STREAK_FUTURE_SKEW_MS = 5 * 60 * 1000;

/** Activity modes that qualify as a real learning action (all persisted attempts). */
export const STREAK_QUALIFYING_MODES = new Set([
  'pack',
  'dictation',
  'artikel',
  'fa',
  'mixed',
  'choice',
  'quiz',
  'match',
  'sprint',
  'satz',
  'rain',
]);

/**
 * Data-driven milestone tiers. Add future tiers by appending entries —
 * no UI/core-logic rewrite required.
 *
 * `icon` is a Lucide icon identifier (see src/components/icons.jsx
 * getIconByName). Never an emoji — UI renders SVG via StreakTierIcon.
 *
 * Golden rule: a completed day preserves the tier earned when it was
 * completed (see streakLength/tierLevel stamped on day records). History
 * is a timeline — never recolored to the current tier.
 */
export const STREAK_MILESTONES = [
  { level: 1, minDays: 1, maxDays: 9, name: 'Ember', icon: 'flame', rewardFreezes: 0 },
  { level: 2, minDays: 10, maxDays: 29, name: 'Inferno', icon: 'flame', rewardFreezes: 1 },
  { level: 3, minDays: 30, maxDays: 59, name: 'Thunderstorm', icon: 'zap', rewardFreezes: 1 },
  { level: 4, minDays: 60, maxDays: 89, name: 'Tsunami', icon: 'waves', rewardFreezes: 1 },
  { level: 5, minDays: 90, maxDays: 149, name: 'Hurricane', icon: 'wind', rewardFreezes: 1 },
  { level: 6, minDays: 150, maxDays: 249, name: 'Volcano', icon: 'mountain', rewardFreezes: 1 },
  { level: 7, minDays: 250, maxDays: 364, name: 'Solar Storm', icon: 'sun', rewardFreezes: 1 },
  { level: 8, minDays: 365, maxDays: 729, name: 'Cosmic', icon: 'orbit', rewardFreezes: 2 },
  { level: 9, minDays: 730, maxDays: null, name: 'Legendary', icon: 'crown', rewardFreezes: 2 },
];

/**
 * Visual identity per tier level (gradients, glow, accents).
 * Pure data — UI/CSS layers interpret it. Keys match milestone levels.
 */
export const STREAK_TIER_VISUALS = {
  1: { gradient: 'linear-gradient(135deg,#fdba74 0%,#f97316 60%,#ea580c 100%)', glow: 'rgba(249,115,22,0.35)', accent: '#f97316', deep: '#9a3412' },
  2: { gradient: 'linear-gradient(135deg,#fb923c 0%,#ef4444 60%,#b91c1c 100%)', glow: 'rgba(239,68,68,0.5)', accent: '#ef4444', deep: '#7f1d1d' },
  3: { gradient: 'linear-gradient(135deg,#fdba74 0%,#f59e0b 40%,#38bdf8 100%)', glow: 'rgba(56,189,248,0.45)', accent: '#eab308', deep: '#0c4a6e' },
  4: { gradient: 'linear-gradient(135deg,#67e8f9 0%,#0ea5e9 55%,#1e40af 100%)', glow: 'rgba(14,165,233,0.45)', accent: '#0ea5e9', deep: '#0c4a6e' },
  5: { gradient: 'linear-gradient(135deg,#e0f2fe 0%,#67e8f9 45%,#0e7490 100%)', glow: 'rgba(103,232,249,0.5)', accent: '#22d3ee', deep: '#164e63' },
  6: { gradient: 'linear-gradient(135deg,#1c1917 0%,#44403c 45%,#f97316 100%)', glow: 'rgba(249,115,22,0.55)', accent: '#fb923c', deep: '#000000' },
  7: { gradient: 'linear-gradient(135deg,#fef3c7 0%,#f59e0b 50%,#f97316 100%)', glow: 'rgba(245,158,11,0.55)', accent: '#f59e0b', deep: '#78350f' },
  8: { gradient: 'linear-gradient(135deg,#8b5cf6 0%,#4f46e5 50%,#0ea5e9 100%)', glow: 'rgba(139,92,246,0.55)', accent: '#8b5cf6', deep: '#1e1b4b' },
  9: { gradient: 'linear-gradient(135deg,#f0abfc 0%,#8b5cf6 40%,#22d3ee 75%,#fef08a 100%)', glow: 'rgba(240,171,252,0.6)', accent: '#e9d5ff', deep: '#3b0764' },
};

/** Milestone rewards, also data-driven. Every 10-day milestone earns a freeze. */
export const STREAK_MILESTONE_REWARDS = [
  { milestone: 10, freezes: 1 },
  { milestone: 20, freezes: 1 },
  { milestone: 30, freezes: 1 },
  { milestone: 40, freezes: 1 },
  { milestone: 50, freezes: 1 },
  { milestone: 60, freezes: 1 },
  { milestone: 70, freezes: 1 },
  { milestone: 80, freezes: 1 },
  { milestone: 90, freezes: 1 },
  { milestone: 100, freezes: 1 },
  { milestone: 120, freezes: 1 },
  { milestone: 150, freezes: 1 },
  { milestone: 180, freezes: 1 },
  { milestone: 210, freezes: 1 },
  { milestone: 250, freezes: 1 },
  { milestone: 300, freezes: 1 },
  { milestone: 365, freezes: 2 },
];

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

export const GREGORIAN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const GREGORIAN_WEEKDAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

/** Persian week starting Saturday (شنبه), matching RTL/Shamsi UX. */
export const PERSIAN_WEEKDAYS = [
  'شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه',
];

export function isStreakDayKey(value) {
  if (typeof value !== 'string' || !STREAK_DAY_PATTERN.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(ms)) return false;
  return new Date(ms).toISOString().slice(0, 10) === value;
}

/** Deterministic UTC day key for a timestamp/Date. */
export function utcDayKey(input = Date.now()) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error('streak: invalid timestamp');
  return d.toISOString().slice(0, 10);
}

export function addUtcDays(key, n) {
  if (!isStreakDayKey(key)) throw new Error('streak: invalid day key');
  if (!Number.isInteger(n)) throw new Error('streak: day offset must be an integer');
  return new Date(Date.parse(`${key}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
}

export function diffUtcDays(a, b) {
  if (!isStreakDayKey(a) || !isStreakDayKey(b)) throw new Error('streak: invalid day key');
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);
}

const jalaliFormatter = new Intl.DateTimeFormat('en-u-ca-persian', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'numeric',
  year: 'numeric',
});

/** Shamsi/Jalali parts for a Gregorian date (well-tested Intl conversion, no manual math). */
export function jalaliParts(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error('streak: invalid date for Jalali conversion');
  let jy = 0;
  let jm = 0;
  let jd = 0;
  for (const part of jalaliFormatter.formatToParts(d)) {
    if (part.type === 'year') jy = Number(part.value);
    else if (part.type === 'month') jm = Number(part.value);
    else if (part.type === 'day') jd = Number(part.value);
  }
  if (!jy || !jm || !jd) throw new Error('streak: Jalali conversion failed');
  return { jy, jm, jd };
}

export function toPersianDigits(value) {
  return String(value).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export function jalaliLabel(input) {
  const { jy, jm, jd } = jalaliParts(input);
  return `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

/** Saturday-first weekday index (0 = شنبه) for a UTC date. */
export function persianWeekdayIndex(input) {
  const d = input instanceof Date ? input : new Date(input);
  return (d.getUTCDay() + 1) % 7;
}

function isValidMode(mode) {
  return typeof mode === 'string' && STREAK_QUALIFYING_MODES.has(mode);
}

/**
 * Normalize raw completion attempts into trusted activity records.
 * Only persisted learning actions qualify: a valid vocabulary association,
 * a valid timestamp, and a known learning mode. Viewing/opening/refreshing
 * never reaches this layer because those actions persist no attempt.
 */
export function normalizeStreakAttempts(entries, now = Date.now()) {
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(nowMs)) throw new Error('streak: invalid now timestamp');
  const out = [];
  const seen = new Set();
  for (const e of entries || []) {
    if (!e || typeof e !== 'object') continue;
    const timestamp = Number(e.timestamp);
    if (!Number.isFinite(timestamp) || timestamp <= 0) continue;
    if (timestamp > nowMs + STREAK_FUTURE_SKEW_MS) continue;
    if (e.wordId === undefined || e.wordId === null) continue;
    if (!isValidMode(e.mode)) continue;
    const sessionId = typeof e.sessionId === 'string' && e.sessionId ? e.sessionId : 'unknown';
    const dedupeKey = `${sessionId}|${String(e.wordId)}|${timestamp}|${e.mode}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push({
      sessionId,
      timestamp,
      day: utcDayKey(timestamp),
      wordId: e.wordId,
      book: e.book ?? null,
      lektion: e.lektion ?? null,
      mode: e.mode,
      correct: !!e.correct,
      xp: Number(e.xp) > 0 ? Math.floor(Number(e.xp)) : 0,
    });
  }
  out.sort((a, b) => a.timestamp - b.timestamp);
  return out;
}

function cloneDayRecord(record) {
  return {
    date: record.date,
    status: record.status,
    sessions: { ...(record.sessions || {}) },
    sources: { ...(record.sources || {}) },
    attempts: record.attempts || 0,
    xp: record.xp || 0,
    firstAt: record.firstAt ?? null,
    lastAt: record.lastAt ?? null,
    updatedAt: record.updatedAt ?? null,
    // Persistent evolution history: the streak length + tier earned when this
    // day was completed. Tiles always render their saved tier — never the
    // current tier (golden rule: do not recolor history).
    streakLength: Number.isFinite(Number(record.streakLength)) ? Number(record.streakLength) : null,
    tierLevel: Number.isFinite(Number(record.tierLevel)) ? Number(record.tierLevel) : null,
    tierName: typeof record.tierName === 'string' ? record.tierName : null,
    tierIcon: typeof record.tierIcon === 'string' ? record.tierIcon : null,
  };
}

function toDayMap(days) {
  const map = new Map();
  for (const d of days || []) {
    if (!d || typeof d !== 'object') continue;
    if (!isStreakDayKey(d.date)) continue;
    if (d.status !== 'completed' && d.status !== 'protected') continue;
    map.set(d.date, cloneDayRecord(d));
  }
  return map;
}

function mergeSessions(record, activities, timestamp) {
  let addedSessions = 0;
  for (const a of activities) {
    if (record.sessions[a.sessionId]) continue;
    record.sessions[a.sessionId] = { attempts: 0, xp: 0, modes: {} };
    addedSessions += 1;
  }
  for (const a of activities) {
    const s = record.sessions[a.sessionId];
    s.attempts += 1;
    s.xp += a.xp;
    s.modes[a.mode] = (s.modes[a.mode] || 0) + 1;
    record.sources[a.mode] = (record.sources[a.mode] || 0) + 1;
    record.attempts += 1;
    record.xp += a.xp;
  }
  if (record.firstAt == null || timestamp < record.firstAt) record.firstAt = timestamp;
  if (record.lastAt == null || timestamp > record.lastAt) record.lastAt = timestamp;
  record.updatedAt = timestamp;
  return addedSessions;
}

function latestBefore(map, date) {
  let best = null;
  for (const key of map.keys()) {
    if (key < date && (best === null || key > best)) best = key;
  }
  return best;
}

/** Length of the consecutive run ending exactly at `date` (dates <= date). */
function runLengthEndingAt(map, date) {
  if (!map.has(date)) return 0;
  let len = 1;
  let cursor = date;
  for (;;) {
    const prev = addUtcDays(cursor, -1);
    if (!map.has(prev)) return len;
    len += 1;
    cursor = prev;
  }
}

/** Consecutive runs over all credited days (completed + protected). */
export function buildStreakRuns(days) {
  const keys = [...toDayMap(days).keys()].sort();
  const runs = [];
  let start = null;
  let prev = null;
  for (const key of keys) {
    if (start === null) {
      start = key;
      prev = key;
      continue;
    }
    if (diffUtcDays(key, prev) === 1) {
      prev = key;
      continue;
    }
    runs.push({ start, end: prev, length: diffUtcDays(prev, start) + 1 });
    start = key;
    prev = key;
  }
  if (start !== null) runs.push({ start, end: prev, length: diffUtcDays(prev, start) + 1 });
  return runs;
}

export function getMilestoneForStreak(days) {
  const n = Math.max(0, Math.floor(Number(days) || 0));
  for (const tier of STREAK_MILESTONES) {
    if (n >= tier.minDays && (tier.maxDays == null || n <= tier.maxDays)) return { ...tier };
  }
  if (n < STREAK_MILESTONES[0].minDays) {
    return { ...STREAK_MILESTONES[0], minDays: 0, maxDays: 0, name: 'No streak', icon: 'flame' };
  }
  const last = STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  return { ...last, maxDays: null, extended: true };
}

/** Tier level for a 1-based streak length (used when stamping day records). */
export function getTierLevelForStreak(days) {
  return getMilestoneForStreak(days).level;
}

export function getNextMilestone(days) {
  const n = Math.max(0, Math.floor(Number(days) || 0));
  const nextTier = STREAK_MILESTONES.find((t) => t.minDays > n) || null;
  const nextReward = STREAK_MILESTONE_REWARDS.find((r) => r.milestone > n) || null;
  return { nextTier, nextReward, daysToNextTier: nextTier ? nextTier.minDays - n : 0 };
}

export function summarizeStreak({ days = [], earnedFreezes = 0, consumedFreezes = 0, today = utcDayKey(Date.now()) } = {}) {
  if (!isStreakDayKey(today)) throw new Error('streak: invalid today');
  const map = toDayMap(days);
  const runs = buildStreakRuns([...map.values()]);
  const longest = runs.reduce((m, r) => Math.max(m, r.length), 0);
  let current = 0;
  let currentRun = null;
  for (const run of runs) {
    if (run.start <= today && today <= run.end) {
      current = run.length;
      currentRun = run;
    } else if (run.end === addUtcDays(today, -1) && current === 0) {
      // Today pending but yesterday's run is still alive.
      current = run.length;
      currentRun = run;
    }
  }
  const earned = Math.max(0, Math.floor(earnedFreezes) || 0);
  const consumed = Math.max(0, Math.floor(consumedFreezes) || 0);
  const milestone = getMilestoneForStreak(current);
  const { nextTier, nextReward, daysToNextTier } = getNextMilestone(current);
  const span = milestone.maxDays == null
    ? 1
    : Math.max(1, milestone.maxDays - milestone.minDays + 1);
  const progress = milestone.maxDays == null
    ? 1
    : Math.min(1, Math.max(0, (current - milestone.minDays + 1) / span));
  return {
    today,
    current,
    longest,
    totalDays: map.size,
    currentRun,
    runs,
    freezes: { earned, consumed, balance: Math.max(0, earned - consumed) },
    milestone,
    nextTier,
    nextReward,
    daysToNextTier,
    progress,
  };
}

/**
 * Core transition: fold trusted activities into credited days.
 *
 * Rules:
 * - First completed day starts streak 1.
 * - Consecutive UTC day continues the run.
 * - Same-day activity is idempotent (counts merge, streak unchanged).
 * - A single missed day is freeze-protected when a freeze is available;
 *   larger gaps reset the run to 1.
 * - Reaching a reward threshold claims it exactly once (caller persists
 *   `claimedMilestones` by `milestone-<N>` id).
 */
export function applyStreakActivities({
  days = [],
  claimedMilestones = [],
  earnedFreezes = 0,
  consumedFreezes = 0,
  activities = [],
  today = utcDayKey(Date.now()),
  now = Date.now(),
} = {}) {
  if (!isStreakDayKey(today)) throw new Error('streak: invalid today');
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(nowMs)) throw new Error('streak: invalid now timestamp');

  const map = toDayMap(days);
  const claimed = new Set(
    (claimedMilestones || []).filter((id) => typeof id === 'string' && /^milestone-\d+$/.test(id)),
  );
  let earned = Math.max(0, Math.floor(earnedFreezes) || 0);
  let consumed = Math.max(0, Math.floor(consumedFreezes) || 0);

  const normalized = normalizeStreakAttempts(activities, nowMs);
  const byDay = new Map();
  for (const a of normalized) {
    if (!byDay.has(a.day)) byDay.set(a.day, []);
    byDay.get(a.day).push(a);
  }

  const events = {
    completedDates: [],
    additionalDates: [],
    duplicateDates: [],
    protectedDates: [],
    upgradedDates: [],
    streakResetDates: [],
    awardedMilestones: [],
    freezesEarned: 0,
    freezesConsumed: 0,
    freezesRefunded: 0,
    ignoredFutureDates: [],
  };

  const awardCrossed = (prevLen, newLen) => {
    for (const reward of STREAK_MILESTONE_REWARDS) {
      if (reward.milestone > prevLen && reward.milestone <= newLen) {
        const id = `milestone-${reward.milestone}`;
        if (!claimed.has(id)) {
          claimed.add(id);
          earned += reward.freezes;
          events.awardedMilestones.push({ milestone: reward.milestone, freezes: reward.freezes, id });
          events.freezesEarned += reward.freezes;
        }
      }
    }
  };

  for (const day of [...byDay.keys()].sort()) {
    const acts = byDay.get(day);
    const latestTs = Math.max(...acts.map((a) => a.timestamp));
    if (day > today) {
      events.ignoredFutureDates.push(day);
      continue;
    }
    const existing = map.get(day);
    if (existing && existing.status === 'completed') {
      const before = Object.keys(existing.sessions).length;
      mergeSessions(existing, acts, latestTs);
      if (Object.keys(existing.sessions).length === before) events.duplicateDates.push(day);
      else events.additionalDates.push(day);
      continue;
    }
    if (existing && existing.status === 'protected') {
      // Real activity arrived for a freeze-protected day: upgrade and refund.
      existing.status = 'completed';
      consumed = Math.max(0, consumed - 1);
      events.freezesRefunded += 1;
      events.upgradedDates.push(day);
      mergeSessions(existing, acts, latestTs);
      // Stamp the tier earned for this day within its run.
      try {
        const upgradedLen = runLengthEndingAt(map, day);
        const upgradedTier = getMilestoneForStreak(upgradedLen);
        existing.streakLength = upgradedLen;
        existing.tierLevel = upgradedTier.level;
        existing.tierName = upgradedTier.name;
        existing.tierIcon = upgradedTier.icon;
      } catch {}
      continue;
    }
    const predecessor = latestBefore(map, day);
    let prevLen = 0;
    let newLen = 1;
    if (predecessor) {
      const gap = diffUtcDays(day, predecessor);
      prevLen = runLengthEndingAt(map, predecessor);
      if (gap === 1) {
        newLen = prevLen + 1;
      } else if (gap === 2) {
        const missing = addUtcDays(predecessor, 1);
        const balance = earned - consumed;
        if (balance > 0 && !map.has(missing) && missing <= today) {
          map.set(missing, {
            date: missing,
            status: 'protected',
            sessions: {},
            sources: { freeze: 1 },
            attempts: 0,
            xp: 0,
            firstAt: latestTs,
            lastAt: latestTs,
            updatedAt: latestTs,
          });
          consumed += 1;
          events.freezesConsumed += 1;
          events.protectedDates.push(missing);
          newLen = prevLen + 2;
        } else {
          events.streakResetDates.push(day);
          prevLen = 0;
          newLen = 1;
        }
      } else {
        events.streakResetDates.push(day);
        prevLen = 0;
        newLen = 1;
      }
    }
    const record = {
      date: day,
      status: 'completed',
      sessions: {},
      sources: {},
      attempts: 0,
      xp: 0,
      firstAt: null,
      lastAt: null,
      updatedAt: latestTs,
      // Persistent evolution history: this day forever renders the tier
      // earned at completion (newLen is the run length ending on this day).
      streakLength: newLen,
      tierLevel: getMilestoneForStreak(newLen).level,
      tierName: getMilestoneForStreak(newLen).name,
      tierIcon: getMilestoneForStreak(newLen).icon,
    };
    mergeSessions(record, acts, latestTs);
    map.set(day, record);
    events.completedDates.push(day);
    awardCrossed(prevLen, newLen);
  }

  const nextDays = [...map.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  const summary = summarizeStreak({ days: nextDays, earnedFreezes: earned, consumedFreezes: consumed, today });
  return {
    days: nextDays,
    claimedMilestones: [...claimed].sort(),
    earnedFreezes: earned,
    consumedFreezes: consumed,
    events,
    summary,
  };
}

/**
 * Bounded month calendar with synchronized Gregorian + Shamsi info.
 * Navigation is by Gregorian month; every cell carries both calendars.
 *
 * Evolution history: each completed cell carries the tier earned when that
 * day was completed (stored streakLength/tierLevel preferred; legacy days
 * without stamps are backfilled from run positions so old months still show
 * the evolution timeline). Cells never inherit the *current* tier.
 */
export function buildStreakMonth({ days = [], today = utcDayKey(Date.now()), year, month } = {}) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('streak: calendar requires integer year and month 1-12');
  }
  if (!isStreakDayKey(today)) throw new Error('streak: invalid today');
  const map = toDayMap(days);
  const rewardThresholds = new Set(STREAK_MILESTONE_REWARDS.map((r) => r.milestone));
  const summary = summarizeStreak({ days: [...map.values()], today });
  const runSet = new Set();
  if (summary.currentRun) {
    let cursor = summary.currentRun.start;
    for (;;) {
      runSet.add(cursor);
      if (cursor === summary.currentRun.end) break;
      cursor = addUtcDays(cursor, 1);
    }
  }
  // Backfill map: date -> streak length (position within its run) so legacy
  // days without stamped tier data still render their earned tier.
  const runLengthByDate = new Map();
  for (const run of summary.runs) {
    let cursor = run.start;
    for (let i = 1; i <= run.length; i += 1) {
      runLengthByDate.set(cursor, i);
      if (cursor === run.end) break;
      cursor = addUtcDays(cursor, 1);
    }
  }
  const chainTier = summary.currentRun
    ? getMilestoneForStreak(runLengthEndingAt(map, summary.currentRun.end))
    : null;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const record = map.get(key);
    const jalali = jalaliParts(new Date(Date.parse(`${key}T00:00:00Z`)));
    const status = record ? record.status : (key > today ? 'future' : key === today ? 'today' : 'missed');
    const isToday = key === today;
    const inCurrentChain = runSet.has(key) && !!record;
    // Historical tier: stored stamp wins; otherwise backfill from run position.
    let streakLength = null;
    let tier = null;
    if (record && record.status === 'completed') {
      streakLength = Number.isFinite(Number(record.streakLength))
        ? Number(record.streakLength)
        : (runLengthByDate.get(key) ?? null);
      if (Number.isFinite(Number(record.tierLevel))) {
        const known = STREAK_MILESTONES.find((t) => t.level === Number(record.tierLevel));
        tier = known ? { ...known } : getMilestoneForStreak(streakLength ?? 0);
      } else {
        tier = getMilestoneForStreak(streakLength ?? 0);
      }
    }
    // Heatmap intensity: tier weight + today/chain recency + XP.
    const tierWeight = tier ? tier.level / STREAK_MILESTONES.length : 0;
    const xpBoost = record && record.xp > 0 ? Math.min(0.25, (record.xp || 0) / 200) : 0;
    const intensity = record && record.status === 'completed'
      ? Math.min(1, 0.35 + tierWeight * 0.45 + (inCurrentChain ? 0.15 : 0) + (isToday ? 0.1 : 0) + xpBoost)
      : 0;
    cells.push({
      key,
      gregorianDay: d,
      jalali,
      jalaliLabel: `${toPersianDigits(jalali.jd)} ${JALALI_MONTHS[jalali.jm - 1]}`,
      status,
      isToday,
      isCurrentRun: runSet.has(key),
      inCurrentChain,
      chainTierLevel: chainTier ? chainTier.level : null,
      isMilestoneDay: !!record && record.status === 'completed'
        && rewardThresholds.has(runLengthEndingAt(map, key)),
      attempts: record?.attempts || 0,
      xp: record?.xp || 0,
      sessions: record?.sessions || {},
      sources: record?.sources || {},
      streakLength,
      tierLevel: tier ? tier.level : null,
      tierName: tier ? tier.name : (record?.tierName || null),
      tierIcon: tier ? tier.icon : (record?.tierIcon || null),
      intensity,
    });
  }
  const firstWeekday = persianWeekdayIndex(new Date(Date.UTC(year, month - 1, 1)));
  const firstJalali = cells[0].jalali;
  const lastJalali = cells[cells.length - 1].jalali;
  const jalaliTitle = firstJalali.jm === lastJalali.jm && firstJalali.jy === lastJalali.jy
    ? `${JALALI_MONTHS[firstJalali.jm - 1]} ${toPersianDigits(firstJalali.jy)}`
    : `${toPersianDigits(firstJalali.jd)} ${JALALI_MONTHS[firstJalali.jm - 1]} تا ${toPersianDigits(lastJalali.jd)} ${JALALI_MONTHS[lastJalali.jm - 1]} ${toPersianDigits(lastJalali.jy)}`;
  return {
    year,
    month,
    gregorianTitle: `${GREGORIAN_MONTHS[month - 1]} ${year}`,
    jalaliTitle,
    leadingBlanks: firstWeekday,
    cells,
  };
}
