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
 */
export const STREAK_MILESTONES = [
  { level: 1, minDays: 1, maxDays: 9, name: 'Streak', icon: '🔥', rewardFreezes: 0 },
  { level: 2, minDays: 10, maxDays: 19, name: 'Fire Streak', icon: '🔥', rewardFreezes: 1 },
  { level: 3, minDays: 20, maxDays: 29, name: 'Tsunami Streak', icon: '🌊', rewardFreezes: 1 },
  { level: 4, minDays: 30, maxDays: 39, name: 'Ultra Tsunami Streak', icon: '🌊', rewardFreezes: 1 },
  { level: 5, minDays: 40, maxDays: 49, name: 'Earthquake Streak', icon: '🌍', rewardFreezes: 1 },
];

/** Milestone rewards, also data-driven. Every 10-day milestone earns a freeze. */
export const STREAK_MILESTONE_REWARDS = [
  { milestone: 10, freezes: 1 },
  { milestone: 20, freezes: 1 },
  { milestone: 30, freezes: 1 },
  { milestone: 40, freezes: 1 },
];

export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

export const GREGORIAN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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
    if (n >= tier.minDays && n <= tier.maxDays) return { ...tier };
  }
  if (n > STREAK_MILESTONES[STREAK_MILESTONES.length - 1].maxDays) {
    const last = STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
    return { ...last, maxDays: null, extended: true };
  }
  return { ...STREAK_MILESTONES[0], minDays: 0, maxDays: 0, name: 'No streak', icon: '🔥' };
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

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [];
  for (let d = 1; d <= daysInMonth; d += 1) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const record = map.get(key);
    const jalali = jalaliParts(new Date(Date.parse(`${key}T00:00:00Z`)));
    const status = record ? record.status : (key > today ? 'future' : key === today ? 'today' : 'missed');
    cells.push({
      key,
      gregorianDay: d,
      jalali,
      jalaliLabel: `${toPersianDigits(jalali.jd)} ${JALALI_MONTHS[jalali.jm - 1]}`,
      status,
      isToday: key === today,
      isCurrentRun: runSet.has(key),
      isMilestoneDay: !!record && record.status === 'completed'
        && rewardThresholds.has(runLengthEndingAt(map, key)),
      attempts: record?.attempts || 0,
      xp: record?.xp || 0,
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
