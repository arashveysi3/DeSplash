import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getVocabStatus } from './vocabStatus.js';

const w = (id) => ({ id });

test('empty scope yields all zeros', () => {
  assert.deepEqual(getVocabStatus([], {}), {
    total: 0, unseen: 0, practiced: 0, weak: 0, mastered: 0, seen: 0,
  });
});

test('unseen + practiced + weak === total (no double counting)', () => {
  const words = [w(1), w(2), w(3), w(4), w(5)];
  const progressMap = {
    // seen, healthy SRS progress
    2: { repetition: 1, interval: 1, ease: 2.5, lapses: 0 },
    // mastered per isWordMastered (interval >= 14)
    3: { repetition: 4, interval: 20, ease: 2.5, lapses: 0 },
  };
  const weakIds = new Set([4]);
  const exposure = new Map([
    [5, { today: 0, total: 3, correct: 0, lastCorrect: false, lastTs: 2 }],
  ]);
  const s = getVocabStatus(words, { progressMap, weakIds, exposure });
  assert.equal(s.total, 5);
  assert.equal(s.unseen, 1); // word 1 only
  assert.equal(s.weak, 2); // word 4 (weak set) + word 5 (0% accuracy, >=2 tries)
  assert.equal(s.practiced, 2); // words 2 + 3
  assert.equal(s.unseen + s.practiced + s.weak, s.total);
  assert.equal(s.mastered, 1); // word 3 (subset, not a separate bucket)
  assert.equal(s.seen, 4);
});

test('weak wins over mastered signals (reinforcement beats familiarity)', () => {
  const words = [w(9)];
  const progressMap = { 9: { repetition: 5, interval: 30, ease: 2.6, lapses: 0 } };
  const weakIds = new Set([9]); // e.g. relapsed via lapses elsewhere
  const s = getVocabStatus(words, { progressMap, weakIds, exposure: new Map() });
  assert.equal(s.weak, 1);
  assert.equal(s.practiced, 0);
  assert.equal(s.mastered, 1); // still reported as mastered subset info
});
