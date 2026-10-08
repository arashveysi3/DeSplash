import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAK_DAILY_EXPOSURE_LIMIT,
  WEAK_DAILY_CORRECT_TARGET,
  WORD_LEVEL,
  todayKey,
  dayStartOf,
  accuracyOf,
  buildExposureIndex,
  emptyExposure,
  classifyWord,
  wordLevel,
  dailyExposureLimit,
  dailyCorrectTarget,
  isExposureCapped,
  isCorrectCapped,
  partitionPool,
  orderFallback,
  orderReviewPool,
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
    assert.equal(idx.get(1).todayCorrect, 1);
    assert.equal(idx.get(1).lastCorrect, false);
    assert.equal(idx.get(2).today, 1);
    assert.equal(idx.get(2).todayCorrect, 1);
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

describe('wordLevel', () => {
  it('assigns the global new/learning/familiar/strong levels', () => {
    assert.equal(wordLevel(1, { progress: undefined, exposure: emptyExposure() }), WORD_LEVEL.NEW);
    assert.equal(wordLevel(2, { progress: { repetition: 1 }, exposure: emptyExposure() }), WORD_LEVEL.LEARNING);
    const familiarExp = { ...emptyExposure(), total: 4, correct: 3, lastCorrect: true };
    assert.equal(wordLevel(3, { progress: { repetition: 1 }, exposure: familiarExp }), WORD_LEVEL.FAMILIAR);
    const mastered = { repetition: 4, ease: 2.4, lapses: 0, interval: 20 };
    assert.equal(wordLevel(4, { progress: mastered, exposure: emptyExposure() }), WORD_LEVEL.STRONG);
  });
  it('keeps confident accurate history at strong level', () => {
    const exp = { ...emptyExposure(), total: 5, correct: 5, lastCorrect: true };
    assert.equal(wordLevel(6, { progress: undefined, exposure: exp }), WORD_LEVEL.STRONG);
  });
});

describe('daily level budgets', () => {
  it('gives ordinary levels two appearances and strong words one', () => {
    assert.equal(dailyExposureLimit(WORD_LEVEL.NEW, false), 2);
    assert.equal(dailyExposureLimit(WORD_LEVEL.LEARNING, false), 2);
    assert.equal(dailyExposureLimit(WORD_LEVEL.FAMILIAR, false), 2);
    assert.equal(dailyExposureLimit(WORD_LEVEL.STRONG, false), 1);
    assert.equal(dailyExposureLimit(WORD_LEVEL.LEARNING, true), WEAK_DAILY_EXPOSURE_LIMIT);
    assert.equal(WEAK_DAILY_EXPOSURE_LIMIT, 4);
  });
  it('requires two same-day successes except for strong words', () => {
    assert.equal(dailyCorrectTarget(WORD_LEVEL.NEW, false), 2);
    assert.equal(dailyCorrectTarget(WORD_LEVEL.LEARNING, false), 2);
    assert.equal(dailyCorrectTarget(WORD_LEVEL.FAMILIAR, false), 2);
    assert.equal(dailyCorrectTarget(WORD_LEVEL.STRONG, false), 1);
    assert.equal(dailyCorrectTarget(WORD_LEVEL.LEARNING, true), WEAK_DAILY_CORRECT_TARGET);
    assert.equal(WEAK_DAILY_CORRECT_TARGET, 2);
  });
  it('caps ordinary learning words after two appearances or two successes', () => {
    assert.equal(isExposureCapped(emptyExposure(), WORD_LEVEL.LEARNING, false), false);
    assert.equal(isExposureCapped({ ...emptyExposure(), today: 2 }, WORD_LEVEL.LEARNING, false), true);
    assert.equal(isCorrectCapped({ ...emptyExposure(), todayCorrect: 1 }, WORD_LEVEL.LEARNING, false), false);
    assert.equal(isCorrectCapped({ ...emptyExposure(), todayCorrect: 2 }, WORD_LEVEL.LEARNING, false), true);
  });
  it('caps strong words after one success and weak words after four appearances', () => {
    assert.equal(isCorrectCapped({ ...emptyExposure(), todayCorrect: 1 }, WORD_LEVEL.STRONG, false), true);
    assert.equal(isExposureCapped({ ...emptyExposure(), today: 3 }, WORD_LEVEL.LEARNING, true), false);
    assert.equal(isExposureCapped({ ...emptyExposure(), today: 4 }, WORD_LEVEL.LEARNING, true), true);
  });
  it('lets a once-wrong weak word stay eligible until its reinforcement budget is spent', () => {
    const { eligible, capped } = partitionPool([word(99)], {
      progressMap: {},
      weakIds: new Set([99]),
      exposure: buildExposureIndex([att(99, false, 8), att(99, false, 9)], START),
    });
    assert.equal(eligible.length, 1);
    assert.equal(capped.length, 0);
    const afterOneCorrect = partitionPool([word(99)], {
      progressMap: {},
      weakIds: new Set([99]),
      exposure: buildExposureIndex([att(99, true, 8)], START),
    });
    assert.equal(afterOneCorrect.eligible.length, 1);
    assert.equal(afterOneCorrect.capped.length, 0);
    const afterTwoCorrect = partitionPool([word(99)], {
      progressMap: {},
      weakIds: new Set([99]),
      exposure: buildExposureIndex([att(99, true, 8), att(99, true, 9)], START),
    });
    assert.equal(afterTwoCorrect.eligible.length, 0);
    assert.equal(afterTwoCorrect.capped.length, 1);
  });
});

describe('partitionPool + takeUpTo', () => {
  const mastered = { repetition: 5, ease: 2.5, lapses: 0, interval: 30 };
  function ctxFor() {
    const attempts = [att(10, true, 8)]; // strong words need only one success today
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
    const attempts = [att(20, true, 8), att(21, true, 8), att(21, true, 9)];
    const ctx = { progressMap: { 20: mastered, 21: mastered }, weakIds: new Set(), exposure: buildExposureIndex(attempts, START) };
    const { capped } = partitionPool([word(20), word(21)], ctx);
    assert.deepEqual(orderFallback(capped).map((e) => e.w.id), [20, 21]);
  });
  it('randomized review fallback keeps weak words ahead of completed words', () => {
    const entries = [
      { w: word(31), status: 'strong', exp: emptyExposure() },
      { w: word(32), status: 'weak', exp: emptyExposure() },
      { w: word(33), status: 'learning', exp: emptyExposure() },
    ];
    const out = orderReviewPool(entries, (items) => [...items].reverse());
    assert.deepEqual(out.map((e) => e.w.id), [32, 33, 31]);
  });
});

describe('cross-activity sharing', () => {
  it('counts accumulate across modes and quizzes (choice + sprint + pack)', () => {
    const idx = buildExposureIndex([
      att(30, true, 8, 'choice'), att(30, false, 9, 'sprint'), att(30, true, 10, 'pack'),
    ], START);
    assert.equal(idx.get(30).today, 3);
    assert.equal(idx.get(30).todayCorrect, 2);
    assert.equal(idx.get(30).total, 3);
  });
  it('counts reset on the next day', () => {
    const idx = buildExposureIndex([att(31, true, 8)], dayStartOf('2026-09-25'));
    assert.equal(idx.get(31).today, 0);
    assert.equal(idx.get(31).todayCorrect, 0);
    assert.equal(idx.get(31).total, 1);
  });
  it('a once-correct learning word remains eligible; twice-correct is done', () => {
    const once = partitionPool([word(40), word(41)], {
      progressMap: {},
      weakIds: new Set(),
      exposure: buildExposureIndex([att(40, true, 8, 'choice')], START),
    });
    assert.deepEqual(once.eligible.map((e) => e.w.id).sort(), [40, 41]);
    assert.deepEqual(once.capped.map((e) => e.w.id), []);
    const twice = partitionPool([word(40), word(41)], {
      progressMap: {},
      weakIds: new Set(),
      exposure: buildExposureIndex([att(40, true, 8, 'choice'), att(40, true, 9, 'pack')], START),
    });
    assert.deepEqual(twice.capped.map((e) => e.w.id), [40]);
    assert.deepEqual(twice.eligible.map((e) => e.w.id), [41]);
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
