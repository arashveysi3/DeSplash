import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shuffleQuestionOptions,
  prepareExamQuestions,
  scoreExam,
  analyzeExam,
  getExamBonusGrant,
  toExamAttemptEntries,
  EXAM_MAX_BONUS_XP,
} from './exam.js';

/** Deterministic rnd: always returns ~0 → j=0 swaps (reproducible). */
const zeroRnd = () => 0;

test('shuffle keeps all options and tracks the correct answer', () => {
  const q = { id: 't1', answer: 'B', options: ['B', 'x', 'y', 'z'] };
  const { options, answerIndex } = shuffleQuestionOptions(q, zeroRnd);
  assert.deepEqual([...options].sort(), ['B', 'x', 'y', 'z']);
  assert.equal(options[answerIndex], 'B');
  // source untouched
  assert.deepEqual(q.options, ['B', 'x', 'y', 'z']);
});

test('prepare orders sections diktation → grammatik → wortschatz → lesen', () => {
  const staticQs = [
    { id: 'r1', section: 'lesen', answer: 'a', options: ['a', 'b', 'c', 'd'] },
    { id: 'v1', section: 'wortschatz', answer: 'a', options: ['a', 'b', 'c', 'd'] },
    { id: 'g1', section: 'grammatik', answer: 'a', options: ['a', 'b', 'c', 'd'] },
  ];
  const diktat = [{ id: 'd1', section: 'diktation', answer: 'Wort', options: ['Wort', 'Wart', 'Wortt', 'wort'] }];
  const out = prepareExamQuestions(staticQs, diktat, zeroRnd);
  assert.deepEqual(out.map((q) => q.id), ['d1', 'g1', 'v1', 'r1']);
  for (const q of out) {
    assert.equal(q.shuffledOptions.length, 4);
    assert.equal(q.shuffledOptions[q.answerIndex], q.answer);
  }
});

test('score counts per section and handles unanswered as incorrect', () => {
  const qs = [
    { id: 'g1', section: 'grammatik', answer: 'A' },
    { id: 'g2', section: 'grammatik', answer: 'B' },
    { id: 'v1', section: 'wortschatz', answer: 'C' },
  ];
  const s = scoreExam(qs, { g1: 'A', g2: 'WRONG' });
  assert.equal(s.total, 3);
  assert.equal(s.correct, 1);
  assert.equal(s.incorrect, 2);
  assert.deepEqual(s.perSection.grammatik, { total: 2, correct: 1, accuracy: 50 });
  assert.deepEqual(s.perSection.wortschatz, { total: 1, correct: 0, accuracy: 0 });
  assert.deepEqual(s.perSection.lesen, { total: 0, correct: 0, accuracy: null });
});

test('analysis reports only topics/lektionen with actual mistakes', () => {
  const qs = [
    { id: 'g1', section: 'grammatik', topic: 'Akkusativ', lektion: 'Lektion 4', answer: 'A' },
    { id: 'g2', section: 'grammatik', topic: 'Akkusativ', lektion: 'Lektion 4', answer: 'B' },
    { id: 'v1', section: 'wortschatz', topic: 'Reisen', lektion: 'Lektion 10', answer: 'C' },
  ];
  const a = analyzeExam(qs, { g1: 'A', g2: 'NO', v1: 'C' });
  assert.equal(a.weakTopics.length, 1);
  assert.equal(a.weakTopics[0].label, 'Akkusativ');
  assert.equal(a.weakLektions.length, 1);
  assert.equal(a.weakLektions[0].label, 'Lektion 4');
});

test('bonus is lifetime-capped: retakes earn only improvement', () => {
  assert.equal(getExamBonusGrant(80, 0), Math.round(0.8 * EXAM_MAX_BONUS_XP));
  // same score again → 0
  const first = getExamBonusGrant(80, 0);
  assert.equal(getExamBonusGrant(80, first), 0);
  // lower score → 0
  assert.equal(getExamBonusGrant(50, first), 0);
  // higher score → only the difference
  assert.equal(getExamBonusGrant(100, first), EXAM_MAX_BONUS_XP - first);
  // never exceeds cap
  assert.ok(getExamBonusGrant(100, 0) <= EXAM_MAX_BONUS_XP);
});

test('attempt entries keep word-level truth for diktation only', () => {
  const entries = toExamAttemptEntries({
    examId: 'exam-1',
    timestamp: 123,
    questions: [
      { id: 'd1', section: 'diktation', answer: 'W', wordId: 42, book: 'a1.1', lektion: 'Lektion 5' },
      { id: 'g1', section: 'grammatik', answer: 'A', book: 'a1.1', lektion: 'Lektion 2' },
    ],
    picks: { d1: 'W', g1: 'WRONG' },
  });
  assert.equal(entries.length, 2);
  assert.equal(entries[0].wordId, 42);
  assert.equal(entries[0].correct, true);
  assert.equal(entries[1].wordId, null);
  assert.equal(entries[1].correct, false);
  assert.equal(entries[1].lektion, 'Lektion 2');
  assert.ok(entries.every((e) => e.mode === 'exam' && e.xp === 0));
});
