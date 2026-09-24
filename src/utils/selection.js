/**
 * Shared vocabulary/question selection & repetition engine (Quiz Frequency fix).
 *
 * Single source of truth for candidate eligibility and prioritization,
 * reused by flashcards (studyQueue/packs), all quiz modes, Match Dash,
 * Lightning Sprint, SatzBau and WortSturm.
 *
 * Design decisions (see final report for rationale):
 * - Tracking is WORD-level: every question/game item in the app is generated
 *   from one vocabulary word (prompted word), so appearances, accuracy and
 *   the daily cap are keyed by wordId. Distractor options are not exposures.
 * - "Strong" words are capped at DAILY_LIMIT appearances per calendar day.
 *   Weak / new / learning words are never capped.
 * - Exposure history comes from the Dexie `quizAttempts` table (all modes),
 *   aggregated once per selection via buildExposureIndex(). No localStorage.
 * - Day boundaries use the app's existing UTC-day convention (YYYY-MM-DD).
 * - Ordering per activity is preserved (SRS-due first for flashcards,
 *   weak-first for quizzes, shuffled variety for games); the shared layer
 *   provides eligibility (partitionPool), classification (classifyWord) and
 *   graceful fallback (takeUpTo) so small pools never produce empty sets.
 */

import { isWordMastered } from './progress.js';

/** Max appearances per calendar day for strong/familiar words. */
export const DAILY_LIMIT = 2;
/** Below this historical accuracy (with >=2 attempts) a word counts as weak. */
export const WEAK_ACCURACY = 60;
/** At/above this accuracy (with >=3 attempts and last correct) a word counts as strong. */
export const STRONG_ACCURACY = 80;
/** Attempts needed before accuracy alone can mark a word strong. */
export const MIN_ATTEMPTS_CONFIDENT = 3;

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
  return { today: 0, total: 0, correct: 0, lastCorrect: null, lastTs: 0 };
}

/**
 * Single-pass aggregation of attempt history.
 * One row per answered/rated/matched item — never N+1, never full-vocab scan.
 * @param {Array} attempts rows with { wordId, correct, timestamp }
 * @param {number} dayStart timestamps >= dayStart count as "today"
 * @returns {Map} wordId -> { today, total, correct, lastCorrect, lastTs }
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
    if (ts >= dayStart) e.today += 1;
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

/** Only strong words are ever capped — weak/new/learning always stay eligible. */
export function isCapped(status, todayCount, limit = DAILY_LIMIT) {
  return status === 'strong' && todayCount >= limit;
}

/**
 * Split candidates into normally-eligible vs daily-capped.
 * @returns {{ eligible: Array<{w,status,exp}>, capped: Array<{w,status,exp}> }}
 */
export function partitionPool(words, ctx = {}) {
  const eligible = [];
  const capped = [];
  const limit = ctx.dailyLimit ?? DAILY_LIMIT;
  for (const w of words || []) {
    const p = ctx.progressMap ? ctx.progressMap[w.id] : undefined;
    const exp = (ctx.exposure && ctx.exposure.get(w.id)) || emptyExposure();
    const status = classifyWord(w.id, { progress: p, weakIds: ctx.weakIds, exposure: exp });
    const entry = { w, status, exp };
    if (isCapped(status, exp.today, limit)) capped.push(entry);
    else eligible.push(entry);
  }
  return { eligible, capped };
}

/** Deterministic fallback order for capped words: least exposed today first. */
export function orderFallback(capped) {
  const rank = (s) => (s === 'weak' ? 0 : s === 'learning' ? 1 : s === 'new' ? 2 : 3);
  return [...(capped || [])].sort((a, b) => {
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    if (a.exp.today !== b.exp.today) return a.exp.today - b.exp.today;
    return b.exp.total - a.exp.total;
  });
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
