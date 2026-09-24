import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_LIMIT,
  todayKey,
  dayStartOf,
  accuracyOf,
  buildExposureIndex,
  emptyExposure,
  classifyWord,
  isCapped,
  partitionPool,
  orderFallback,
  takeUpTo,
  selectGameSet,
} from './selection.js';

const DAY = '2026-09-24';
const START = dayStartOf(DAY);
const T = (h) => START + h * 3600000;
const att = (wordId, correct, h = 10, mode = 'choice') => ({ wordId, correct, timestamp: T(h), mode, xp: 0 });
const word = (id) => ({ id, book: 'a1.2', lektion: 'Lektion 13' });

describe('day conventions', () => {
  it('todayKey matches app UTC-day convention', () => {
    assert.equal(todayKey(new Date('2026-09-24T23:30:00Z')), '2026-09-24');
    assert.equal(START, Date.parse('2026-09-24T00:00:00Z'));
  });
  it('accuracyOf returns null without data', () => {
    assert.equal(accuracyOf(0, 0), null);
    assert.equal(accuracyOf(2, 3), 67);
  });
});

describe('buildExposureIndex', () => {
  it('aggregates per-word totals and today counts in one pass', () => {
    const idx = buildExposureIndex([
      att(1, true, 9), att(1, false, 10), att(2, true, 8),
      { wordId: 1, correct: true, timestamp: START - 86400000 }, // yesterday
    ], START);
    assert.equal(idx.get(1).total, 3);
    assert.equal(idx.get(1).correct, 2);
    assert.equal(idx.get(1).today, 2);
    assert.equal(idx.get(1).lastCorrect, false);
    assert.equal(idx.get(2).today, 1);
  });
  it('skips rows without vocabulary association', () => {
    const idx = buildExposureIndex([{ correct: true, timestamp: T(9) }, att(5, true)], START);
    assert.equal(idx.size, 1);
    assert.ok(idx.has(5));
  });
});

describe('classifyWord', () => {
  it('new user: unseen words are new', () => {
    assert.equal(classifyWord(1, { progress: undefined, weakIds: new Set(), exposure: emptyExposure() }), 'new');
  });
  it('existing weakness set wins (source of truth)', () => {
    const exp = { ...emptyExposure(), total: 10, correct: 10, lastCorrect: true };
    assert.equal(classifyWord(1, { progress: undefined, weakIds: new Set([1]), exposure: exp }), 'weak');
  });
  it('poor history marks weak without weak-set entry', () => {
    const exp = { ...emptyExposure(), total: 4, correct: 1, lastCorrect: false };
    assert.equal(classifyWord(7, { progress: undefined, weakIds: new Set(), exposure: exp }), 'weak');
  });
  it('mastered progress marks strong', () => {
    const p = { repetition: 4, ease: 2.4, lapses: 0, interval: 20 };
    assert.equal(classifyWord(3, { progress: p, weakIds: new Set(), exposure: emptyExposure() }), 'strong');
  });
  it('confident good history marks strong', () => {
    const exp = { ...emptyExposure(), total: 5, correct: 5, lastCorrect: true };
    assert.equal(classifyWord(4, { progress: undefined, weakIds: new Set(), exposure: exp }), 'strong');
  });
  it('thin good history stays learning (no confident judging)', () => {
    const exp = { ...emptyExposure(), total: 2, correct: 2, lastCorrect: true };
    assert.equal(classifyWord(5, { progress: { repetition: 1 }, weakIds: new Set(), exposure: exp }), 'learning');
  });
});

describe('daily cap rules', () => {
  it('strong word seen once today can appear once more', () => {
    assert.equal(isCapped('strong', 1), false);
  });
  it('strong word seen twice today is capped', () => {
    assert.equal(isCapped('strong', DAILY_LIMIT), true);
    assert.equal(DAILY_LIMIT, 2);
  });
  it('weak word is never capped, even with many appearances', () => {
    assert.equal(isCapped('weak', 9), false);
    assert.equal(isCapped('new', 9), false);
    assert.equal(isCapped('learning', 9), false);
  });
});

describe('partitionPool + takeUpTo', () => {
  const mastered = { repetition: 5, ease: 2.5, lapses: 0, interval: 30 };
  function ctxFor() {
    const attempts = [att(10, true, 8), att(10, true, 9)]; // strong-capped word 10
    return {
      progressMap: { 10: mastered },
      weakIds: new Set(),
      exposure: buildExposureIndex(attempts, START),
    };
  }
  it('caps only the strong word at its daily limit', () => {
    const { eligible, capped } = partitionPool([word(10), word(11), word(12)], ctxFor());
    assert.deepEqual(capped.map((e) => e.w.id), [10]);
    assert.deepEqual(eligible.map((e) => e.w.id).sort(), [11, 12]);
  });
  it('small pools fall back gracefully instead of empty', () => {
    const { eligible, capped } = partitionPool([word(10)], ctxFor());
    assert.equal(eligible.length, 0);
    const out = takeUpTo(eligible.map((e) => e.w), orderFallback(capped), 5);
    assert.deepEqual(out.map((w) => w.id), [10]);
  });
  it('fallback prefers least-exposed capped words', () => {
    const attempts = [att(20, true, 8), att(20, true, 9), att(21, true, 8), att(21, true, 9), att(21, true, 10)];
    const ctx = { progressMap: { 20: mastered, 21: mastered }, weakIds: new Set(), exposure: buildExposureIndex(attempts, START) };
    const { capped } = partitionPool([word(20), word(21)], ctx);
    assert.deepEqual(orderFallback(capped).map((e) => e.w.id), [20, 21]);
  });
});

describe('cross-activity sharing', () => {
  it('counts accumulate across modes and quizzes (choice + sprint + pack)', () => {
    const idx = buildExposureIndex([
      att(30, true, 8, 'choice'), att(30, false, 9, 'sprint'), att(30, true, 10, 'pack'),
    ], START);
    assert.equal(idx.get(30).today, 3);
    assert.equal(idx.get(30).total, 3);
  });
  it('counts reset on the next day', () => {
    const idx = buildExposureIndex([att(31, true, 8)], dayStartOf('2026-09-25'));
    assert.equal(idx.get(31).today, 0);
    assert.equal(idx.get(31).total, 1);
  });
});

describe('selectGameSet', () => {
  it('orders weak + new before rest, deterministically testable', () => {
    const entries = [
      { w: word(1), status: 'strong', exp: emptyExposure() },
      { w: word(2), status: 'weak', exp: emptyExposure() },
      { w: word(3), status: 'new', exp: emptyExposure() },
      { w: word(4), status: 'learning', exp: emptyExposure() },
    ];
    const out = selectGameSet(entries, 3, (a) => a);
    assert.deepEqual(out.map((w) => w.id), [2, 3, 1]);
  });
});
