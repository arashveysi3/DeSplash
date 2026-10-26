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
  GRAMMAR_BANK_A21,
  VOCAB_BANK_A21,
  READING_BANK_A21,
  GRAMMAR_TOPICS_A11,
  GRAMMAR_TOPICS_A12,
  GRAMMAR_TOPICS_A21,
  GRAMMAR_TOPICS_BY_BOOK,
  EXAM_BOOKS,
  BOOK_EXAM_COUNTS,
  bookExamTotal,
  bankMetaForBook,
  examBookOf,
  lektionNumber,
  grammarBankForBook,
  vocabBankForBook,
  readingBankForBook,
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

test('A2.1 banks: sizes, book tag and meta', () => {
  assert.equal(GRAMMAR_BANK_A21.length, 58);
  assert.equal(VOCAB_BANK_A21.length, 48);
  assert.equal(READING_BANK_A21.length, 12);
  const a21Lesen = READING_BANK_A21.reduce((a, t) => a + t.questions.length, 0);
  assert.equal(a21Lesen, 30);
  assert.equal(READING_BANK_A21.filter((t) => t.questions.length === 3).length, 6);
  assert.equal(READING_BANK_A21.filter((t) => t.questions.length === 2).length, 6);
  // Every A2.1 item carries the explicit book tag (A2.1 reuses Lektion 1-12,
  // so the lektion range alone cannot separate it from A1.1).
  for (const q of [...GRAMMAR_BANK_A21, ...VOCAB_BANK_A21]) assert.equal(q.book, 'a2.1');
  for (const t of READING_BANK_A21) {
    assert.equal(t.book, 'a2.1');
    for (const q of t.questions) assert.equal(examBookOf(q), 'a2.1');
  }
  assert.deepEqual(bankMetaForBook('a2.1'), { grammatik: 58, wortschatz: 48, lesen: 30, lesenTexts: 12 });
  // A1 getters stay scoped to A1, A2.1 getters stay scoped to A2.1
  assert.equal(grammarBankForBook('a2.1'), GRAMMAR_BANK_A21);
  assert.equal(vocabBankForBook('a2.1'), VOCAB_BANK_A21);
  assert.equal(readingBankForBook('a2.1'), READING_BANK_A21);
  assert.equal(readingThreeForBook('a2.1').length, 6);
  assert.equal(readingTwoForBook('a2.1').length, 6);
  assert.ok(grammarBankForBook('a1.1').every((q) => examBookOf(q) === 'a1.1'));
  assert.ok(grammarBankForBook('a1.2').every((q) => examBookOf(q) === 'a1.2'));
  assert.ok(vocabBankForBook('a1.1').every((q) => examBookOf(q) === 'a1.1'));
  assert.ok(vocabBankForBook('a1.2').every((q) => examBookOf(q) === 'a1.2'));
  // A2.1 gives every topic at least two questions, so retakes differ
  const perTopic = new Map();
  for (const q of GRAMMAR_BANK_A21) perTopic.set(q.topic, (perTopic.get(q.topic) || 0) + 1);
  assert.equal(perTopic.size, GRAMMAR_TOPICS_A21.length);
  for (const [topic, n] of perTopic) assert.ok(n >= 2, `${topic}: only ${n} question(s)`);
  // the per-book syllabus registry points at the exported topic lists
  assert.equal(GRAMMAR_TOPICS_BY_BOOK['a1.1'], GRAMMAR_TOPICS_A11);
  assert.equal(GRAMMAR_TOPICS_BY_BOOK['a1.2'], GRAMMAR_TOPICS_A12);
  assert.equal(GRAMMAR_TOPICS_BY_BOOK['a2.1'], GRAMMAR_TOPICS_A21);
});

test('all bank questions are valid (4 options, correct first, unique ids)', () => {
  const seen = new Set();
  for (const q of [...GRAMMAR_BANK, ...VOCAB_BANK, ...GRAMMAR_BANK_A21, ...VOCAB_BANK_A21]) {
    assertValidQuestion(q, q.id);
    assert.ok(!seen.has(q.id), `duplicate id ${q.id}`);
    seen.add(q.id);
  }
  for (const t of [...READING_BANK_ALL, ...READING_BANK_A21]) {
    assert.ok(t.id && t.kind && t.title && t.text && t.lektion, `text ${t.id}: missing field`);
    assert.ok(t.questions.length === 2 || t.questions.length === 3, `text ${t.id}: must have 2 or 3 questions`);
    for (const q of t.questions) {
      assertValidQuestion({ ...q, section: 'lesen', topic: t.kind, lektion: t.lektion }, q.id);
      assert.ok(!seen.has(q.id), `duplicate id ${q.id}`);
      seen.add(q.id);
    }
  }
  // findReadingText resolves every text of every book
  for (const t of [...READING_BANK_ALL, ...READING_BANK_A21]) {
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
  // full bank flat list has all questions exactly once (all books)
  const flat = getFullBankQuestions();
  const expected =
    GRAMMAR_BANK.length + VOCAB_BANK.length +
    READING_BANK_ALL.reduce((a, t) => a + t.questions.length, 0) +
    GRAMMAR_BANK_A21.length + VOCAB_BANK_A21.length +
    READING_BANK_A21.reduce((a, t) => a + t.questions.length, 0);
  assert.equal(flat.length, expected);
  assert.equal(new Set(flat.map((q) => q.id)).size, expected);
});

test('sampleArray never mutates source and caps at length', () => {
  const src = [1, 2, 3];
  const out = sampleArray(src, 5, () => 0);
  assert.deepEqual([...out].sort(), [1, 2, 3]);
  assert.deepEqual(src, [1, 2, 3]);
});

test('every grammar topic of each book has at least one question (no grammar left out)', () => {
  for (const book of EXAM_BOOKS) {
    const syllabus = GRAMMAR_TOPICS_BY_BOOK[book];
    const bank = grammarBankForBook(book);
    assert.ok(bank.length > 0, `${book}: empty grammar bank`);
    const topics = new Set(bank.map((q) => q.topic));
    for (const topic of syllabus) {
      assert.ok(topics.has(topic), `${book}: syllabus topic without question: ${topic}`);
    }
    // no question uses a topic outside its book syllabus
    for (const topic of topics) {
      assert.ok(syllabus.includes(topic), `${book}: bank topic missing from syllabus: ${topic}`);
    }
    // every Lektion of the book has at least one grammar question
    const [from, to] = book === 'a1.2' ? [13, 24] : [1, 12];
    const lektions = new Set(bank.map((q) => q.lektion));
    for (let n = from; n <= to; n += 1) {
      assert.ok(lektions.has(`Lektion ${n}`), `${book}: Lektion ${n} without grammar question`);
    }
    // every bank question stays inside its book
    for (const q of bank) {
      const num = lektionNumber(q.lektion);
      assert.ok(num >= from && num <= to, `${q.id}: Lektion outside ${book}`);
      assert.equal(examBookOf(q), book, `${q.id}: wrong book`);
    }
  }
});

test('book mock grammar counts equal the syllabus topic counts', () => {
  assert.deepEqual(EXAM_BOOKS, ['a1.1', 'a1.2', 'a2.1']);
  for (const book of EXAM_BOOKS) {
    const counts = BOOK_EXAM_COUNTS[book];
    assert.equal(counts.diktation, 15, `${book}: diktation`);
    assert.equal(counts.grammatik, GRAMMAR_TOPICS_BY_BOOK[book].length, `${book}: grammatik`);
    assert.equal(counts.wortschatz, 15, `${book}: wortschatz`);
    assert.equal(counts.lesen, 10, `${book}: lesen`);
    assert.equal(
      bookExamTotal(book),
      15 + GRAMMAR_TOPICS_BY_BOOK[book].length + 15 + 10,
      `${book}: total`,
    );
    // banks suffice for a full book mock
    assert.ok(vocabBankForBook(book).length >= 15, `${book}: vocab bank too small`);
    assert.ok(readingThreeForBook(book).length >= 2, `${book}: not enough 3Q texts`);
    assert.ok(readingTwoForBook(book).length >= 2, `${book}: not enough 2Q texts`);
  }
  // A2.1 mock has the same shape as the A1.2 mock
  assert.equal(bookExamTotal('a2.1'), bookExamTotal('a1.2'));
});

test('selectBookQuestions covers every grammar topic exactly once per book mock', () => {
  const zeroRnd = () => 0;
  for (const book of EXAM_BOOKS) {
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
    const syllabus = GRAMMAR_TOPICS_BY_BOOK[book];
    assert.deepEqual([...topics].sort(), [...syllabus].sort(), `${book}: every topic exactly once`);
    // every sampled question belongs to the book it was sampled for
    for (const q of out) {
      assert.equal(examBookOf(q), book, `${book}: out-of-book question ${q.id}`);
    }
    const lesen = out.filter((q) => q.section === 'lesen');
    assert.equal(lesen.length, 10);
    assert.equal(out.filter((q) => q.section === 'wortschatz').length, 15);
    assert.equal(out.length, counts.grammatik + counts.wortschatz + counts.lesen);
  }
});

test('sampleGrammarCoveringTopics maximizes spread when count is below topic count', () => {
  for (const book of ['a1.2', 'a2.1']) {
    const bank = grammarBankForBook(book);
    const out = sampleGrammarCoveringTopics(bank, 15, () => 0);
    assert.equal(out.length, 15);
    // all different topics even though fewer than the 26 available
    assert.equal(new Set(out.map((q) => q.topic)).size, 15, `${book}: spread`);
  }
});
