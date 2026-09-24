import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcAccuracy,
  sumXp,
  groupByLektion,
  calcQuizReport,
  calcBookAnalytics,
  buildRecommendation,
  selectNeedsPractice,
  MIN_SAMPLE,
} from './analytics.js';

const mk = (wordId, lektion, correct, xp = 0, book = 'a1.2') => ({ wordId, lektion, correct, xp, book });

describe('calcAccuracy', () => {
  it('computes rounded accuracy', () => {
    assert.equal(calcAccuracy(7, 10), 70);
    assert.equal(calcAccuracy(2, 3), 67);
    assert.equal(calcAccuracy(0, 5), 0);
  });
  it('returns null when there is no data (never misleading 0%)', () => {
    assert.equal(calcAccuracy(0, 0), null);
  });
});

describe('counts / score', () => {
  it('counts correct/incorrect and sums xp', () => {
    const r = calcQuizReport([mk(1, 'Lektion 13', true, 10), mk(2, 'Lektion 13', false, 0), mk(3, 'Lektion 14', true, 8)]);
    assert.equal(r.total, 3);
    assert.equal(r.correct, 2);
    assert.equal(r.incorrect, 1);
    assert.equal(r.accuracy, 67);
    assert.equal(r.xp, 18);
  });
  it('empty quiz yields null accuracy and zero totals', () => {
    const r = calcQuizReport([]);
    assert.equal(r.total, 0);
    assert.equal(r.accuracy, null);
    assert.equal(r.xp, 0);
    assert.equal(r.perLektion.length, 0);
    assert.equal(r.strongest, null);
    assert.equal(r.weakest, null);
  });
});

describe('per-Lektion performance', () => {
  it('splits mixed-Lektion quizzes correctly', () => {
    const r = calcQuizReport([
      mk(1, 'Lektion 13', true), mk(2, 'Lektion 13', true), mk(3, 'Lektion 13', false),
      mk(4, 'Lektion 14', false), mk(5, 'Lektion 14', false),
    ]);
    assert.equal(r.perLektion.length, 2);
    const l13 = r.perLektion.find((e) => e.key === 'Lektion 13');
    const l14 = r.perLektion.find((e) => e.key === 'Lektion 14');
    assert.equal(l13.questions, 3);
    assert.equal(l13.correct, 2);
    assert.equal(l13.accuracy, 67);
    assert.equal(l14.questions, 2);
    assert.equal(l14.accuracy, 0);
  });
  it('single-Lektion quiz yields one entry', () => {
    const r = calcQuizReport([mk(1, 'Lektion 1', true), mk(2, 'Lektion 1', false)]);
    assert.equal(r.perLektion.length, 1);
    assert.equal(r.perLektion[0].accuracy, 50);
  });
  it('questions without Lektion are grouped, not dropped', () => {
    const r = calcQuizReport([mk(1, null, true), mk(2, '', false), mk(3, 'Lektion 1', true)]);
    assert.equal(r.total, 3);
    assert.ok(r.unassigned);
    assert.equal(r.unassigned.questions, 2);
    assert.equal(r.hasLektionData, true);
  });
  it('quiz with no Lektion metadata at all', () => {
    const r = calcQuizReport([mk(1, null, true), mk(2, undefined, false)]);
    assert.equal(r.hasLektionData, false);
    assert.equal(r.strongest, null);
    assert.ok(r.recommendation.text.length > 0);
  });
});

describe('strongest / weakest', () => {
  it('picks best/worst among confident Lektionen', () => {
    const attempts = [
      mk(1, 'Lektion 1', true), mk(2, 'Lektion 1', true), mk(3, 'Lektion 1', true), mk(4, 'Lektion 1', false),
      mk(5, 'Lektion 2', false), mk(6, 'Lektion 2', false), mk(7, 'Lektion 2', true),
      mk(8, 'Lektion 3', true),
    ];
    const r = calcQuizReport(attempts);
    assert.equal(r.strongest.key, 'Lektion 1');
    assert.equal(r.weakest.key, 'Lektion 2');
  });
  it('ignores thin samples for strongest/weakest', () => {
    const attempts = [
      mk(1, 'Lektion 1', true), mk(2, 'Lektion 1', true), mk(3, 'Lektion 1', true),
      mk(4, 'Lektion 2', false), // only 1 question -> thin
    ];
    const r = calcQuizReport(attempts);
    assert.equal(r.strongest.key, 'Lektion 1');
    assert.equal(r.weakest.key, 'Lektion 1');
  });
  it('null when nothing reaches MIN_SAMPLE', () => {
    const r = calcQuizReport([mk(1, 'Lektion 1', true), mk(2, 'Lektion 2', false)]);
    assert.equal(r.strongest, null);
    assert.equal(r.weakest, null);
  });
});

describe('recommendation logic', () => {
  it('is based on actual data, mentions real Lektionen', () => {
    const attempts = [
      mk(1, 'Lektion 1', true), mk(2, 'Lektion 1', true), mk(3, 'Lektion 1', true),
      mk(4, 'Lektion 3', false), mk(5, 'Lektion 3', false), mk(6, 'Lektion 3', true),
    ];
    const r = calcQuizReport(attempts);
    assert.equal(r.recommendation.focusLektion, 'Lektion 3');
    assert.ok(r.recommendation.text.includes('Lektion 1'));
    assert.ok(r.recommendation.text.includes('Lektion 3'));
    assert.equal(r.recommendation.confidence, 'high');
  });
  it('hedges with insufficient data', () => {
    const r = calcQuizReport([mk(1, 'Lektion 1', true)]);
    assert.equal(r.recommendation.confidence, 'low');
    assert.equal(r.recommendation.focusLektion, 'Lektion 1');
  });
  it('handles empty data', () => {
    const rec = buildRecommendation([]);
    assert.equal(rec.confidence, 'none');
    assert.equal(rec.focusLektion, null);
  });
  it('single-Lektion strong result suggests moving on', () => {
    const attempts = [1, 2, 3, 4].map((i) => mk(i, 'Lektion 2', true));
    const r = calcQuizReport(attempts);
    assert.equal(r.recommendation.focusLektion, null);
    assert.ok(r.recommendation.text.includes('Lektion 2'));
  });
  it('uses incorrect counts, not just lowest score', () => {
    const list = [
      { key: 'Lektion 1', label: 'Lektion 1', questions: 10, correct: 7, incorrect: 3, accuracy: 70, lowConfidence: false },
      { key: 'Lektion 2', label: 'Lektion 2', questions: 3, correct: 2, incorrect: 1, accuracy: 67, lowConfidence: false },
    ];
    const need = selectNeedsPractice(list);
    assert.equal(need[0].key, 'Lektion 1'); // more misses first
  });
});

describe('groupByLektion', () => {
  it('aggregates xp per Lektion', () => {
    const g = groupByLektion([mk(1, 'Lektion 1', true, 10), mk(2, 'Lektion 1', false, 0)]);
    assert.equal(g.get('Lektion 1').xp, 10);
    assert.equal(g.get('Lektion 1').incorrect, 1);
  });
});

describe('calcBookAnalytics', () => {
  const words = [
    { id: 1, book: 'a1.2', lektion: 'Lektion 13' },
    { id: 2, book: 'a1.2', lektion: 'Lektion 13' },
    { id: 3, book: 'a1.2', lektion: 'Lektion 14' },
    { id: 4, book: 'a1.1', lektion: 'Lektion 1' },
  ];
  const isMastered = (p) => !!p && (p.interval || 0) >= 14;
  const progressMap = { 1: { repetition: 1, interval: 1, lapses: 0 }, 2: { repetition: 5, interval: 20, lapses: 0 } };

  it('combines SRS progress with quiz history', () => {
    const attempts = [
      { wordId: 1, book: 'a1.2', lektion: 'Lektion 13', correct: true, xp: 10, timestamp: Date.parse('2026-09-20') },
      { wordId: 3, book: 'a1.2', lektion: 'Lektion 14', correct: false, xp: 0, timestamp: Date.parse('2026-09-21') },
      { wordId: 4, book: 'a1.1', lektion: 'Lektion 1', correct: true, xp: 10, timestamp: Date.parse('2026-09-21') },
    ];
    const b = calcBookAnalytics({ bookId: 'a1.2', allWords: words, progressMap, attempts, isMastered });
    assert.equal(b.totalWords, 3);
    assert.equal(b.seen, 2);
    assert.equal(b.mastered, 1);
    assert.equal(b.totalQuestions, 2); // other-book attempt excluded
    assert.equal(b.accuracy, 50);
    assert.equal(b.wordsPracticed, 2);
    assert.equal(b.perLektion.length, 2);
    assert.equal(b.hasHistory, true);
    assert.equal(b.recommendation.confidence, 'low'); // thin samples
  });
  it('handles no history and incomplete progress', () => {
    const b = calcBookAnalytics({ bookId: 'a1.2', allWords: words, progressMap: {}, attempts: [], isMastered });
    assert.equal(b.hasHistory, false);
    assert.equal(b.accuracy, null);
    assert.equal(b.hasProgress, false);
    assert.equal(b.seenPct, 0);
    assert.ok(b.recommendation.text.length > 0);
  });
  it('builds progress over time buckets', () => {
    const attempts = [1, 2, 3].map((i) => ({
      wordId: i, book: 'a1.2', lektion: 'Lektion 13', correct: i !== 3, xp: 5,
      timestamp: Date.parse(`2026-09-1${i}`),
    }));
    const b = calcBookAnalytics({ bookId: 'a1.2', allWords: words, progressMap: {}, attempts, isMastered });
    assert.equal(b.progressOverTime.length, 3);
    assert.equal(b.progressOverTime[0].date, '2026-09-11');
    assert.equal(b.progressOverTime[2].accuracy, 0);
  });
  it('respects MIN_SAMPLE for book strongest/weakest', () => {
    assert.ok(MIN_SAMPLE >= 3);
  });
});

describe('sumXp', () => {
  it('tolerates missing xp', () => {
    assert.equal(sumXp([{ correct: true }, { correct: false, xp: 5 }]), 5);
    assert.equal(sumXp([]), 0);
  });
});
