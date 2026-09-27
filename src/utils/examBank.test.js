import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAMMAR_QUESTIONS,
  VOCAB_QUESTIONS,
  READING_TEXTS,
  GRAMMAR_BANK,
  VOCAB_BANK,
  READING_BANK_ALL,
  READING_THREE_Q,
  READING_TWO_Q,
  BANK_META,
  GRAMMAR_TOPICS_A11,
  GRAMMAR_TOPICS_A12,
  BOOK_EXAM_COUNTS,
  bookExamTotal,
  grammarBankForBook,
  vocabBankForBook,
  readingThreeForBook,
  readingTwoForBook,
  findReadingText,
  getFullBankQuestions,
} from '../data/exam.js';
import {
  selectStaticQuestions,
  selectBookQuestions,
  sampleGrammarCoveringTopics,
  sampleArray,
  EXAM_MODE_COUNTS,
  examModeTotal,
  EXAM_MODES,
} from './exam.js';

function assertValidQuestion(q, where) {
  assert.ok(q.id && typeof q.id === 'string', `${where}: missing id`);
  assert.ok(q.prompt && typeof q.prompt === 'string', `${where}: missing prompt`);
  assert.ok(q.section, `${where}: missing section`);
  assert.ok(q.topic, `${where}: missing topic`);
  assert.ok(q.lektion, `${where}: missing lektion`);
  assert.ok(q.explanation && typeof q.explanation === 'string', `${where}: missing explanation`);
  assert.ok(Array.isArray(q.options), `${where}: options not an array`);
  assert.equal(q.options.length, 4, `${where}: must have exactly 4 options`);
  for (const o of q.options) {
    assert.ok(typeof o === 'string' && o.trim().length > 0, `${where}: empty option`);
  }
  assert.equal(new Set(q.options).size, 4, `${where}: duplicate options`);
  assert.equal(q.options[0], q.answer, `${where}: options[0] must be the correct answer (source order)`);
}

test('bank sizes meet the 100-per-part requirement', () => {
  assert.equal(GRAMMAR_BANK.length, 150);
  assert.equal(VOCAB_BANK.length, 105);
  assert.equal(READING_BANK_ALL.length, 40);
  assert.equal(READING_THREE_Q.length, 20);
  assert.equal(READING_TWO_Q.length, 20);
  const lesenQs = READING_BANK_ALL.reduce((a, t) => a + t.questions.length, 0);
  assert.equal(lesenQs, 100);
  assert.equal(BANK_META.grammatik, 150);
  assert.equal(BANK_META.wortschatz, 105);
  assert.equal(BANK_META.lesen, 100);
  // Set-1 content is preserved at the head of each bank
  assert.deepEqual(GRAMMAR_BANK.slice(0, 15).map((q) => q.id), GRAMMAR_QUESTIONS.map((q) => q.id));
  assert.deepEqual(VOCAB_BANK.slice(0, 15).map((q) => q.id), VOCAB_QUESTIONS.map((q) => q.id));
  assert.deepEqual(READING_BANK_ALL.slice(0, 4).map((t) => t.id), READING_TEXTS.map((t) => t.id));
});

test('all bank questions are valid (4 options, correct first, unique ids)', () => {
  const seen = new Set();
  for (const q of [...GRAMMAR_BANK, ...VOCAB_BANK]) {
    assertValidQuestion(q, q.id);
    assert.ok(!seen.has(q.id), `duplicate id ${q.id}`);
    seen.add(q.id);
  }
  for (const t of READING_BANK_ALL) {
    assert.ok(t.id && t.kind && t.title && t.text && t.lektion, `text ${t.id}: missing field`);
    assert.ok(t.questions.length === 2 || t.questions.length === 3, `text ${t.id}: must have 2 or 3 questions`);
    for (const q of t.questions) {
      assertValidQuestion({ ...q, section: 'lesen', topic: t.kind, lektion: t.lektion }, q.id);
      assert.ok(!seen.has(q.id), `duplicate id ${q.id}`);
      seen.add(q.id);
    }
  }
  // findReadingText resolves every text
  for (const t of READING_BANK_ALL) {
    assert.equal(findReadingText(t.id)?.id, t.id);
  }
  assert.equal(findReadingText('nope'), null);
});

test('mode counts stay consistent (full = 55)', () => {
  assert.deepEqual(Object.keys(EXAM_MODE_COUNTS).sort(), [...EXAM_MODES].sort());
  assert.equal(examModeTotal('full'), 55);
  assert.equal(examModeTotal('diktation'), 15);
  assert.equal(examModeTotal('grammatik'), 15);
  assert.equal(examModeTotal('wortschatz'), 15);
  assert.equal(examModeTotal('lesen'), 10);
});

test('selectStaticQuestions samples correct counts with lesen grouped by text', () => {
  const banks = {
    grammarBank: GRAMMAR_BANK,
    vocabBank: VOCAB_BANK,
    readingThree: READING_THREE_Q,
    readingTwo: READING_TWO_Q,
  };
  const zeroRnd = () => 0;
  const full = selectStaticQuestions(banks, zeroRnd);
  assert.equal(full.filter((q) => q.section === 'grammatik').length, 15);
  assert.equal(full.filter((q) => q.section === 'wortschatz').length, 15);
  const lesen = full.filter((q) => q.section === 'lesen');
  assert.equal(lesen.length, 10);
  // questions of the same text stay adjacent
  const seenTexts = [];
  for (const q of lesen) {
    if (seenTexts[seenTexts.length - 1] !== q.textId) seenTexts.push(q.textId);
  }
  assert.equal(seenTexts.length, 4);
  const counts = seenTexts.map((id) => lesen.filter((q) => q.textId === id).length).sort();
  assert.deepEqual(counts, [2, 2, 3, 3]);
  // section-only modes
  const g = selectStaticQuestions(banks, zeroRnd, { grammar: 15, vocab: 0, threeQ: 0, twoQ: 0 });
  assert.equal(g.length, 15);
  assert.ok(g.every((q) => q.section === 'grammatik'));
  const l = selectStaticQuestions(banks, zeroRnd, { grammar: 0, vocab: 0, threeQ: 2, twoQ: 2 });
  assert.equal(l.length, 10);
  assert.ok(l.every((q) => q.section === 'lesen'));
});

test('sampling varies between runs (fresh shuffle)', () => {
  const banks = {
    grammarBank: GRAMMAR_BANK,
    vocabBank: VOCAB_BANK,
    readingThree: READING_THREE_Q,
    readingTwo: READING_TWO_Q,
  };
  let s1 = 0.11;
  let s2 = 0.77;
  const rnd1 = () => { s1 = (s1 * 9301 + 49297) % 233280; return s1 / 233280; };
  const rnd2 = () => { s2 = (s2 * 9301 + 49297) % 233280; return s2 / 233280; };
  const a = selectStaticQuestions(banks, rnd1).map((q) => q.id);
  const b = selectStaticQuestions(banks, rnd2).map((q) => q.id);
  assert.notDeepEqual(a, b);
  // full bank flat list has all questions exactly once
  const flat = getFullBankQuestions();
  assert.equal(flat.length, 150 + 105 + 100);
});

test('sampleArray never mutates source and caps at length', () => {
  const src = [1, 2, 3];
  const out = sampleArray(src, 5, () => 0);
  assert.deepEqual([...out].sort(), [1, 2, 3]);
  assert.deepEqual(src, [1, 2, 3]);
});

test('every grammar topic of each book has at least one question (no grammar left out)', () => {
  for (const [book, syllabus] of [['a1.1', GRAMMAR_TOPICS_A11], ['a1.2', GRAMMAR_TOPICS_A12]]) {
    const bank = grammarBankForBook(book);
    assert.ok(bank.length > 0, `${book}: empty grammar bank`);
    const topics = new Set(bank.map((q) => q.topic));
    for (const topic of syllabus) {
      assert.ok(topics.has(topic), `${book}: syllabus topic without question: ${topic}`);
    }
    // every Lektion of the book has at least one grammar question
    const lektions = new Set(bank.map((q) => q.lektion));
    const [from, to] = book === 'a1.1' ? [1, 12] : [13, 24];
    for (let n = from; n <= to; n += 1) {
      assert.ok(lektions.has(`Lektion ${n}`), `${book}: Lektion ${n} without grammar question`);
    }
    // every bank question stays inside its book
    for (const q of bank) {
      const num = Number(/(\d+)/.exec(q.lektion || '')?.[1] || 0);
      assert.ok(book === 'a1.1' ? num >= 1 && num <= 12 : num >= 13 && num <= 24, `${q.id}: wrong book`);
    }
  }
});

test('book mock grammar counts equal the syllabus topic counts', () => {
  assert.equal(BOOK_EXAM_COUNTS['a1.1'].grammatik, GRAMMAR_TOPICS_A11.length);
  assert.equal(BOOK_EXAM_COUNTS['a1.2'].grammatik, GRAMMAR_TOPICS_A12.length);
  assert.equal(BOOK_EXAM_COUNTS['a1.1'].wortschatz, 15);
  assert.equal(BOOK_EXAM_COUNTS['a1.2'].wortschatz, 15);
  assert.equal(bookExamTotal('a1.1'), 15 + GRAMMAR_TOPICS_A11.length + 15 + 10);
  assert.equal(bookExamTotal('a1.2'), 15 + GRAMMAR_TOPICS_A12.length + 15 + 10);
  // vocab + reading banks suffice for a full book mock
  assert.ok(vocabBankForBook('a1.1').length >= 15);
  assert.ok(vocabBankForBook('a1.2').length >= 15);
  assert.ok(readingThreeForBook('a1.1').length >= 2 && readingTwoForBook('a1.1').length >= 2);
  assert.ok(readingThreeForBook('a1.2').length >= 2 && readingTwoForBook('a1.2').length >= 2);
});

test('selectBookQuestions covers every grammar topic exactly once per book mock', () => {
  const zeroRnd = () => 0;
  for (const book of ['a1.1', 'a1.2']) {
    const counts = BOOK_EXAM_COUNTS[book];
    const out = selectBookQuestions(
      {
        grammarBank: grammarBankForBook(book),
        vocabBank: vocabBankForBook(book),
        readingThree: readingThreeForBook(book),
        readingTwo: readingTwoForBook(book),
      },
      zeroRnd,
      { grammar: counts.grammatik, vocab: counts.wortschatz, threeQ: 2, twoQ: 2 },
    );
    const grammar = out.filter((q) => q.section === 'grammatik');
    assert.equal(grammar.length, counts.grammatik, `${book}: grammar count`);
    // one question per topic, no topic missing, none duplicated
    const topics = grammar.map((q) => q.topic);
    assert.equal(new Set(topics).size, topics.length, `${book}: duplicate grammar topic sampled`);
    const syllabus = book === 'a1.1' ? GRAMMAR_TOPICS_A11 : GRAMMAR_TOPICS_A12;
    assert.deepEqual([...topics].sort(), [...syllabus].sort(), `${book}: every topic exactly once`);
    // all questions carry the right book lektion
    for (const q of out) {
      const num = Number(/(\d+)/.exec(q.lektion || '')?.[1] || 0);
      assert.ok(book === 'a1.1' ? num <= 12 : num >= 13, `${book}: out-of-book question ${q.id}`);
    }
    const lesen = out.filter((q) => q.section === 'lesen');
    assert.equal(lesen.length, 10);
    assert.equal(out.filter((q) => q.section === 'wortschatz').length, 15);
  }
});

test('sampleGrammarCoveringTopics maximizes spread when count is below topic count', () => {
  const bank = grammarBankForBook('a1.2');
  const out = sampleGrammarCoveringTopics(bank, 15, () => 0);
  assert.equal(out.length, 15);
  // all different topics even though fewer than the 26 available
  assert.equal(new Set(out.map((q) => q.topic)).size, 15);
});
