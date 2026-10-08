/**
 * Shared vocabulary/question selection & repetition engine.
 *
 * Single source of truth for candidate eligibility and prioritization,
 * reused by flashcards (studyQueue/packs), all quiz modes, Match Dash,
 * Lightning Sprint, SatzBau and WortSturm.
 *
 * Design decisions:
 * - Tracking is WORD-level: every question/game item in the app is generated
 *   from one vocabulary word (prompted word), so appearances, accuracy and
 *   daily budgets are keyed by wordId. Distractor options are not exposures.
 * - Words have a global learning level: new (0), learning (1), familiar (2),
 *   or strong/mastered (3). Weak/false-answer reinforcement is a separate
 *   priority overlay, not a different level.
 * - Ordinary words may appear up to twice per calendar day. Strong/mastered
 *   words normally appear once: they are for maintenance, not same-day loops.
 *   Weak words may appear up to four times, with a separate same-day target
 *   of two correct answers before they are considered done.
 * - Exposure history comes from the Dexie `quizAttempts` table (all modes),
 *   aggregated once per selection via buildExposureIndex(). No localStorage.
 * - Day boundaries use the app's existing UTC-day convention (YYYY-MM-DD).
 * - Selection picks the set (weak-first priority), then callers MUST shuffle
 *   presentation order so repeated quizzes never start with the same words.
 *   The shared layer provides eligibility (partitionPool), classification
 *   (classifyWord/wordLevel) and graceful fallback (takeUpTo/orderReviewPool)
 *   so small pools never produce empty sets.
 */

import { isWordMastered } from './progress.js';

/** Global learning levels, from first encounter through mastery. */
export const WORD_LEVELS = ['new', 'learning', 'familiar', 'strong'];
export const WORD_LEVEL = { NEW: 0, LEARNING: 1, FAMILIAR: 2, STRONG: 3 };
/** Ordinary daily appearances by level. Level 3 is maintenance-only. */
export const DAILY_EXPOSURE_BY_LEVEL = { 0: 2, 1: 2, 2: 2, 3: 1 };
/** Ordinary same-day correct-answer targets by level. */
export const DAILY_CORRECT_BY_LEVEL = { 0: 2, 1: 2, 2: 2, 3: 1 };
/** Weak/false-answer words get a larger reinforcement budget. */
export const WEAK_DAILY_EXPOSURE_LIMIT = 4;
export const WEAK_DAILY_CORRECT_TARGET = 2;
/** Below this historical accuracy (with >=2 attempts) a word counts as weak. */
export const WEAK_ACCURACY = 60;
/** At/above this accuracy (with >=3 attempts and last correct) a word counts as strong. */
export const STRONG_ACCURACY = 80;
/** Attempts needed before accuracy alone can mark a word strong. */
export const MIN_ATTEMPTS_CONFIDENT = 3;
/** At/above this accuracy a repeatedly seen word counts as familiar. */
export const FAMILIAR_ACCURACY = 75;
/** Repetitions or historical attempts needed before a word can be familiar. */
export const MIN_REPETITIONS_FAMILIAR = 2;
export const MIN_ATTEMPTS_FAMILIAR = 4;

/**
 * Current-day key. Matches the application's existing date convention
 * (UTC day, previously used by streaks and the old daily counter).
 */
export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Start-of-day timestamp (ms) for a YYYY-MM-DD key. */
export function dayStartOf(key) {
  return Date.parse(`${key}T00:00:00Z`);
}

export function accuracyOf(correct, total) {
  if (!total || total <= 0) return null;
  return Math.round((correct / total) * 100);
}

export function emptyExposure() {
  return { today: 0, todayCorrect: 0, total: 0, correct: 0, lastCorrect: null, lastTs: 0 };
}

/**
 * Single-pass aggregation of attempt history.
 * One row per answered/rated/matched item — never N+1, never full-vocab scan.
 * @param {Array} attempts rows with { wordId, correct, timestamp }
 * @param {number} dayStart timestamps >= dayStart count as "today"
 * @returns {Map} wordId -> { today, todayCorrect, total, correct, lastCorrect, lastTs }
 */
export function buildExposureIndex(attempts, dayStart) {
  const map = new Map();
  for (const t of attempts || []) {
    if (t.wordId === undefined || t.wordId === null) continue;
    let e = map.get(t.wordId);
    if (!e) {
      e = emptyExposure();
      map.set(t.wordId, e);
    }
    e.total += 1;
    if (t.correct) e.correct += 1;
    const ts = Number(t.timestamp) || 0;
    if (ts >= dayStart) {
      e.today += 1;
      if (t.correct) e.todayCorrect += 1;
    }
    if (ts >= e.lastTs) {
      e.lastTs = ts;
      e.lastCorrect = !!t.correct;
    }
  }
  return map;
}

/**
 * Classify a word using existing learning data (never invented scores):
 * - 'weak': in the app's weak set (lapses / low ease) OR poor history (<60%, >=2 tries)
 * - 'strong': mastered (existing SRS definition) OR confident good history (>=80%, >=3 tries, last correct)
 * - 'new': never seen (no progress AND no recorded attempts)
 * - 'learning': everything else
 *
 * Weak wins over strong when signals conflict (reinforcement beats familiarity).
 * Weakness is a reinforcement priority; the numeric learning level is still
 * available separately through wordLevel().
 */
export function classifyWord(wordId, { progress, weakIds, exposure } = {}) {
  const exp = exposure || emptyExposure();
  const acc = accuracyOf(exp.correct, exp.total);
  if (weakIds && typeof weakIds.has === 'function' && weakIds.has(wordId)) return 'weak';
  if (exp.total >= 2 && acc !== null && acc < WEAK_ACCURACY) return 'weak';
  if (isWordMastered(progress)) return 'strong';
  if (exp.total >= MIN_ATTEMPTS_CONFIDENT && acc !== null && acc >= STRONG_ACCURACY && exp.lastCorrect) return 'strong';
  const isNew = !progress || (progress.repetition || 0) === 0;
  if (isNew && exp.total === 0) return 'new';
  return 'learning';
}

/**
 * Global numeric learning level for a word, independent of the weak overlay:
 * 0 = new, 1 = learning, 2 = familiar, 3 = strong/mastered.
 */
export function wordLevel(wordId, { progress, exposure } = {}) {
  const exp = exposure || emptyExposure();
  const acc = accuracyOf(exp.correct, exp.total);
  if (isWordMastered(progress)) return WORD_LEVEL.STRONG;
  if (exp.total >= MIN_ATTEMPTS_CONFIDENT && acc !== null && acc >= STRONG_ACCURACY && exp.lastCorrect) {
    return WORD_LEVEL.STRONG;
  }
  const repetitions = progress?.repetition || 0;
  const established = repetitions >= MIN_REPETITIONS_FAMILIAR || exp.total >= MIN_ATTEMPTS_FAMILIAR;
  if (established && acc !== null && acc >= FAMILIAR_ACCURACY && exp.lastCorrect) {
    return WORD_LEVEL.FAMILIAR;
  }
  const seen = !!progress && (
    repetitions > 0 || (progress.interval || 0) > 0 || (progress.lapses || 0) > 0
  );
  if (seen || exp.total > 0) return WORD_LEVEL.LEARNING;
  return WORD_LEVEL.NEW;
}

/** Daily appearance budget for a level; weak words receive reinforcement room. */
export function dailyExposureLimit(level, weak = false) {
  if (weak) return WEAK_DAILY_EXPOSURE_LIMIT;
  return DAILY_EXPOSURE_BY_LEVEL[level] ?? DAILY_EXPOSURE_BY_LEVEL[WORD_LEVEL.LEARNING];
}

/** Same-day correct-answer target for a level; weak words need two successes. */
export function dailyCorrectTarget(level, weak = false) {
  if (weak) return WEAK_DAILY_CORRECT_TARGET;
  return DAILY_CORRECT_BY_LEVEL[level] ?? DAILY_CORRECT_BY_LEVEL[WORD_LEVEL.LEARNING];
}

export function isExposureCapped(exp, level, weak = false, limit) {
  const budgeted = limit ?? dailyExposureLimit(level, weak);
  return (exp?.today ?? 0) >= budgeted;
}

export function isCorrectCapped(exp, level, weak = false, target) {
  const needed = target ?? dailyCorrectTarget(level, weak);
  return (exp?.todayCorrect ?? 0) >= needed;
}

/**
 * Split candidates into normally-eligible vs daily-capped.
 * Ordinary levels 0-2 remain eligible until they reach either two appearances
 * or two correct answers. Strong/mastered words are done after one success.
 * Weak words use the larger reinforcement budget.
 * @returns {{ eligible: Array<{w,status,level,weak,exp}>, capped: Array<{w,status,level,weak,exp}> }}
 */
export function partitionPool(words, ctx = {}) {
  const eligible = [];
  const capped = [];
  for (const w of words || []) {
    const p = ctx.progressMap ? ctx.progressMap[w.id] : undefined;
    const exp = (ctx.exposure && ctx.exposure.get(w.id)) || emptyExposure();
    const status = classifyWord(w.id, { progress: p, weakIds: ctx.weakIds, exposure: exp });
    const level = wordLevel(w.id, { progress: p, exposure: exp });
    const weak = status === 'weak';
    const exposureLimit = ctx.dailyExposureLimit ?? dailyExposureLimit(level, weak);
    const correctTarget = ctx.dailyCorrectTarget ?? dailyCorrectTarget(level, weak);
    const entry = { w, status, level, weak, exp };
    if (isCorrectCapped(exp, level, weak, correctTarget)) capped.push(entry);
    else if (isExposureCapped(exp, level, weak, exposureLimit)) capped.push(entry);
    else eligible.push(entry);
  }
  return { eligible, capped };
}

/** Deterministic fallback order for capped words: least exposed today first. */
export function orderFallback(capped) {
  const rank = (s) => (s === 'weak' ? 0 : s === 'learning' ? 1 : s === 'new' ? 2 : 3);
  return [...(capped || [])].sort((a, b) => {
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    const aTC = a.exp.todayCorrect ?? 0;
    const bTC = b.exp.todayCorrect ?? 0;
    if (aTC !== bTC) return aTC - bTC;
    if (a.exp.today !== b.exp.today) return a.exp.today - b.exp.today;
    return b.exp.total - a.exp.total;
  });
}

/**
 * Randomized fallback for extra-review packs. Weak reinforcement stays ahead
 * of completed words, but each tier is shuffled so repeated fallback packs do
 * not repeat the same deterministic sequence.
 */
export function orderReviewPool(capped, shuffleFn) {
  const shuffle = shuffleFn || ((entries) => entries);
  const urgent = shuffle((capped || []).filter((e) => e.status === 'weak'));
  const rest = shuffle((capped || []).filter((e) => e.status !== 'weak'));
  return [...urgent, ...rest];
}

/**
 * Take up to `count` words: eligible first, then capped fallback (weak-first).
 * Never returns fewer than the pool allows — small pools degrade gracefully
 * instead of producing empty quizzes.
 */
export function takeUpTo(eligibleWords, cappedOrdered, count) {
  const out = (eligibleWords || []).slice(0, count);
  if (out.length < count) {
    const have = new Set(out.map((w) => w.id));
    for (const e of cappedOrdered || []) {
      if (out.length >= count) break;
      if (!have.has(e.w.id)) {
        out.push(e.w);
        have.add(e.w.id);
      }
    }
  }
  return out;
}

/**
 * Balanced game set: weak (reinforcement) + new (discovery) + rest, shuffled
 * for presentation variety. `shuffleFn` is injectable for deterministic tests.
 */
export function selectGameSet(entries, count, shuffleFn) {
  const shuffle = shuffleFn || ((arr) => arr);
  const weak = shuffle(entries.filter((e) => e.status === 'weak').map((e) => e.w));
  const fresh = shuffle(entries.filter((e) => e.status === 'new').map((e) => e.w));
  const rest = shuffle(entries.filter((e) => e.status !== 'weak' && e.status !== 'new').map((e) => e.w));
  return [...weak, ...fresh, ...rest].slice(0, count);
}
