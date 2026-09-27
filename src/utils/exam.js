/**
 * A1 Final Mock Exam engine — pure functions (no React, no Dexie).
 *
 * Responsibilities:
 *  - shuffle answer positions at runtime (source stores correct first)
 *  - assemble the fixed section order: Diktation → Grammatik → Wortschatz → Lesen
 *  - score answers (each question processed exactly once by the caller)
 *  - derive weakness analysis ONLY from actual answer data
 *  - compute the one-time completion bonus (lifetime-capped, no farming)
 *
 * Diktation questions are built by the caller with the existing Diktat-Check
 * engine (src/utils/diktat.js) and passed in; this module only shuffles and
 * orders them like every other question.
 */

export const EXAM_SECTIONS = ['diktation', 'grammatik', 'wortschatz', 'lesen'];

export const EXAM_SECTION_LABELS = {
  diktation: 'Diktation',
  grammatik: 'Grammatik',
  wortschatz: 'Wortschatz',
  lesen: 'Lesen',
};

/** Lifetime cap for exam bonus XP (anti-farming: retakes earn only improvement). */
export const EXAM_MAX_BONUS_XP = 40;

/** Exam modes: full mock or a single section. No fixed sets — every run
 *  samples a fresh mix from the banks (better for learning). */
export const EXAM_MODES = ['full', 'diktation', 'grammatik', 'wortschatz', 'lesen'];

/** Question counts per mode (static + generated diktation). */
export const EXAM_MODE_COUNTS = {
  full: { diktation: 15, grammatik: 15, wortschatz: 15, lesen: 10 },
  diktation: { diktation: 15, grammatik: 0, wortschatz: 0, lesen: 0 },
  grammatik: { diktation: 0, grammatik: 15, wortschatz: 0, lesen: 0 },
  wortschatz: { diktation: 0, grammatik: 0, wortschatz: 15, lesen: 0 },
  lesen: { diktation: 0, grammatik: 0, wortschatz: 0, lesen: 10 },
};

export function examModeTotal(mode) {
  const c = EXAM_MODE_COUNTS[mode] || EXAM_MODE_COUNTS.full;
  return c.diktation + c.grammatik + c.wortschatz + c.lesen;
}

/** Short book tag for titles, e.g. 'a1.2' → 'A1.2'. */
export function examBookTag(book) {
  if (book === 'a1.1') return 'A1.1';
  if (book === 'a1.2') return 'A1.2';
  return '';
}

export function examModeLabel(mode, book) {
  const tag = examBookTag(book);
  const suffix = tag ? ` ${tag}` : '';
  if (mode === 'full') return tag ? `${tag} Final Mock` : 'A1 Mock Exam';
  return `${EXAM_SECTION_LABELS[mode] || mode}-Training${suffix}`;
}

/**
 * Fisher-Yates sample of n unique items (copy; source untouched).
 * `rnd` is injectable for deterministic tests.
 */
export function sampleArray(arr, n, rnd = Math.random) {
  const a = [...(arr || [])];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.max(0, Math.min(n, a.length)));
}

/**
 * Sample a fresh static question mix from the banks for one run.
 * Grammar/vocab are sampled at question level; Lesen is sampled at TEXT
 * level (threeQ x3-question texts + twoQ x2-question texts) so questions
 * from the same text always stay together. Order: grammatik → wortschatz
 * → lesen (texts shuffled). Diktation is prepended later by
 * prepareExamQuestions like before.
 */
export function selectStaticQuestions(
  { grammarBank, vocabBank, readingThree, readingTwo },
  rnd = Math.random,
  { grammar = 15, vocab = 15, threeQ = 2, twoQ = 2 } = {},
) {
  const picked = [
    ...sampleArray(grammarBank, grammar, rnd),
    ...sampleArray(vocabBank, vocab, rnd),
  ];
  const texts = [
    ...sampleArray(readingThree, threeQ, rnd),
    ...sampleArray(readingTwo, twoQ, rnd),
  ];
  // shuffle text order, keep each text's questions together
  for (let i = texts.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [texts[i], texts[j]] = [texts[j], texts[i]];
  }
  for (const t of texts) {
    for (const q of t.questions || []) {
      picked.push({
        ...q,
        section: 'lesen',
        topic: t.kind,
        lektion: t.lektion,
        textId: t.id,
      });
    }
  }
  return picked;
}

// --- per-mode best scores (localStorage; legacy single key migrates) ---
// Since the Prüfung tab is divided by book, bests are stored per
// (mode, book) pair, e.g. `gs_exam_best_full_a1.2`. Calls without a book
// keep the legacy behavior so old callers/tests still work.

export function examBestKey(mode, book) {
  const m = mode || 'full';
  if (book === 'a1.1' || book === 'a1.2') return `gs_exam_best_${m}_${book}`;
  return `gs_exam_best_${m}`;
}

/** Read the best score for a (mode, book) pair; legacy `gs_exam_best` counts as full. */
export function readExamBest(mode, book) {
  try {
    const raw = localStorage.getItem(examBestKey(mode, book));
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.correct === 'number') return p;
    }
    if (!book && (mode || 'full') === 'full') {
      const legacy = localStorage.getItem('gs_exam_best');
      if (legacy) {
        const p = JSON.parse(legacy);
        if (p && typeof p.correct === 'number') return p;
      }
    }
  } catch {}
  return null;
}

export function writeExamBest(mode, bookOrBest, maybeBest) {
  // Back-compat: writeExamBest(mode, best) still works (no book).
  let book = null;
  let best = null;
  if (typeof bookOrBest === 'string' && (bookOrBest === 'a1.1' || bookOrBest === 'a1.2')) {
    book = bookOrBest;
    best = maybeBest;
  } else {
    best = bookOrBest;
  }
  try {
    if (best) {
      localStorage.setItem(examBestKey(mode, book), JSON.stringify(best));
      if (!book && (mode || 'full') === 'full') localStorage.setItem('gs_exam_best', JSON.stringify(best));
    }
  } catch {}
}

/**
 * Coverage-guaranteed grammar sampling: pick exactly ONE random question per
 * grammar topic (topics visited in shuffled order), then — when `count`
 * exceeds the topic count — fill the rest with a random sample of the
 * remaining questions. When `count` equals the topic count (the book Final
 * Mocks: A1.1 → 20, A1.2 → 26), EVERY grammar topic of the book appears
 * exactly once. No grammar topic is ever left without a question.
 * `rnd` is injectable for deterministic tests.
 */
export function sampleGrammarCoveringTopics(grammarBank, count, rnd = Math.random) {
  const bank = [...(grammarBank || [])];
  // group by topic, preserving first-seen order
  const byTopic = new Map();
  for (const q of bank) {
    const t = q.topic || 'Sonstiges';
    if (!byTopic.has(t)) byTopic.set(t, []);
    byTopic.get(t).push(q);
  }
  const topics = [...byTopic.keys()];
  // shuffle topic order
  for (let i = topics.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [topics[i], topics[j]] = [topics[j], topics[i]];
  }
  const picked = [];
  const pickedIds = new Set();
  for (const t of topics) {
    if (picked.length >= count) break;
    const group = byTopic.get(t);
    const q = group[Math.floor(rnd() * group.length)];
    picked.push(q);
    pickedIds.add(q.id);
  }
  if (picked.length < count) {
    const rest = bank.filter((q) => !pickedIds.has(q.id));
    for (let i = rest.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    for (const q of rest) {
      if (picked.length >= count) break;
      picked.push(q);
    }
  }
  return picked;
}

/**
 * Book-scoped variant of selectStaticQuestions: all banks are already
 * filtered to one book (Lektion 1-12 or 13-24) by the caller.
 * Grammar uses coverage-guaranteed sampling so no topic is missed;
 * vocab is a fresh random mix; Lesen stays grouped by text.
 */
export function selectBookQuestions(
  { grammarBank, vocabBank, readingThree, readingTwo },
  rnd = Math.random,
  { grammar = 20, vocab = 15, threeQ = 2, twoQ = 2 } = {},
) {
  const picked = [
    ...sampleGrammarCoveringTopics(grammarBank, grammar, rnd),
    ...sampleArray(vocabBank, vocab, rnd),
  ];
  const texts = [
    ...sampleArray(readingThree, threeQ, rnd),
    ...sampleArray(readingTwo, twoQ, rnd),
  ];
  // shuffle text order, keep each text's questions together
  for (let i = texts.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [texts[i], texts[j]] = [texts[j], texts[i]];
  }
  for (const t of texts) {
    for (const q of t.questions || []) {
      picked.push({
        ...q,
        section: 'lesen',
        topic: t.kind,
        lektion: t.lektion,
        textId: t.id,
      });
    }
  }
  return picked;
}

/**
 * Fisher-Yates shuffle of a question's options (copy; source untouched).
 * Returns { options, answerIndex } with the correct answer tracked.
 * `rnd` is injectable for deterministic tests.
 */
export function shuffleQuestionOptions(question, rnd = Math.random) {
  const options = [...(question.options || [])];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { options, answerIndex: options.indexOf(question.answer) };
}

/**
 * Prepare the full runtime exam: fixed section order, shuffled positions.
 * @param {Array} staticQuestions flat stored questions (grammatik/wortschatz/lesen)
 * @param {Array} diktatQuestions runtime Diktat-Check questions (same shape + wordId/target)
 */
export function prepareExamQuestions(staticQuestions, diktatQuestions, rnd = Math.random) {
  const bySection = (s) => (staticQuestions || []).filter((q) => q.section === s);
  const ordered = [
    ...(diktatQuestions || []),
    ...bySection('grammatik'),
    ...bySection('wortschatz'),
    ...bySection('lesen'),
  ];
  return ordered.map((q) => {
    const { options, answerIndex } = shuffleQuestionOptions(q, rnd);
    return { ...q, shuffledOptions: options, answerIndex };
  });
}

/**
 * Score a completed exam.
 * @param {Array} questions runtime questions (with .answer)
 * @param {Object} picks map questionId -> picked option string
 */
export function scoreExam(questions, picks = {}) {
  const perSection = {};
  for (const s of EXAM_SECTIONS) perSection[s] = { total: 0, correct: 0 };
  const results = [];
  let correct = 0;
  for (const q of questions || []) {
    const picked = Object.prototype.hasOwnProperty.call(picks, q.id) ? picks[q.id] : null;
    const isCorrect = picked !== null && picked === q.answer;
    if (isCorrect) correct += 1;
    perSection[q.section].total += 1;
    if (isCorrect) perSection[q.section].correct += 1;
    results.push({ questionId: q.id, section: q.section, picked, correct: isCorrect });
  }
  const total = (questions || []).length;
  for (const s of EXAM_SECTIONS) {
    const sec = perSection[s];
    sec.accuracy = sec.total ? Math.round((sec.correct / sec.total) * 100) : null;
  }
  return {
    total,
    correct,
    incorrect: total - correct,
    pct: total ? Math.round((correct / total) * 100) : 0,
    perSection,
    results,
  };
}

/**
 * Weakness analysis from actual exam answers only.
 * Groups incorrect answers by topic (grammar topic / vocab topic / Lesen text
 * kind) and by Lektion tag. Only groups with >=1 incorrect answer are
 * reported, ordered by most incorrect first. Never invents insights.
 */
export function analyzeExam(questions, picks = {}) {
  const byTopic = new Map();
  const byLektion = new Map();
  for (const q of questions || []) {
    const picked = Object.prototype.hasOwnProperty.call(picks, q.id) ? picks[q.id] : null;
    const isCorrect = picked !== null && picked === q.answer;
    const topic = q.topic || EXAM_SECTION_LABELS[q.section] || q.section;
    const lek = q.lektion || null;
    if (!byTopic.has(topic)) byTopic.set(topic, { label: topic, total: 0, incorrect: 0 });
    byTopic.get(topic).total += 1;
    if (!isCorrect) byTopic.get(topic).incorrect += 1;
    if (lek) {
      if (!byLektion.has(lek)) byLektion.set(lek, { label: lek, total: 0, incorrect: 0, book: q.book || null });
      byLektion.get(lek).total += 1;
      if (!isCorrect) byLektion.get(lek).incorrect += 1;
    }
  }
  const weakTopics = [...byTopic.values()]
    .filter((g) => g.incorrect > 0)
    .sort((a, b) => b.incorrect - a.incorrect || b.total - a.total)
    .slice(0, 4);
  const weakLektions = [...byLektion.values()]
    .filter((g) => g.incorrect > 0)
    .sort((a, b) => b.incorrect - a.incorrect || b.total - a.total)
    .slice(0, 4);
  return { weakTopics, weakLektions };
}

/**
 * One-time completion bonus (anti-farming).
 * Potential = score percentage mapped to EXAM_MAX_BONUS_XP; only the
 * improvement over already-awarded bonus is granted, so the lifetime total
 * can never exceed the cap no matter how often the exam is retaken.
 */
export function getExamBonusGrant(pct, awardedSoFar = 0) {
  const potential = Math.round(((Math.max(0, Math.min(100, pct)) / 100) * EXAM_MAX_BONUS_XP));
  return Math.max(0, Math.min(potential, EXAM_MAX_BONUS_XP) - Math.max(0, awardedSoFar));
}

/**
 * Build quizAttempts-compatible entries for exam persistence.
 * Diktat questions carry their real wordId (feeds word history + weak
 * tracking); static questions carry wordId null (skipped by the word-level
 * exposure index, still counted in per-Lektion book analytics).
 * xp is 0 — the bonus is awarded separately through getExamBonusGrant.
 */
export function toExamAttemptEntries({ examId, timestamp, questions, picks }) {
  const list = questions || [];
  return list.map((q) => {
    const picked = Object.prototype.hasOwnProperty.call(picks, q.id) ? picks[q.id] : null;
    return {
      sessionId: examId,
      timestamp,
      wordId: q.wordId ?? null,
      book: q.book || null,
      lektion: q.lektion || null,
      mode: 'exam',
      correct: picked !== null && picked === q.answer,
      xp: 0,
    };
  });
}
