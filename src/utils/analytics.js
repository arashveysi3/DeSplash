/**
 * Shared learning-analytics layer for GermanSplash (Issue #2).
 *
 * Pure, dependency-free functions used by BOTH:
 *  - individual quiz completion reports
 *  - full-book learning analytics
 *
 * Input shape (attempt):
 *   { wordId: number|string, book: string|null, lektion: string|null,
 *     correct: boolean, xp: number, mode?: string, timestamp?: number }
 *
 * Conventions:
 *  - accuracy is `null` (not 0) when there is no data, so the UI never
 *    shows a misleading "0%".
 *  - questions without lektion metadata are grouped under UNASSIGNED_KEY
 *    and reported separately instead of being silently dropped.
 *  - recommendations are deterministic and explainable; Lektionen with
 *    fewer than MIN_SAMPLE questions are flagged low-confidence and are
 *    never confidently judged.
 */

export const MIN_SAMPLE = 3;
export const UNASSIGNED_KEY = '__unassigned__';
export const UNASSIGNED_LABEL = 'Ohne Lektion';

/**
 * Modes that feed quiz accuracy/XP aggregates. Exposure-only modes
 * ('pack' flashcards, 'match' pairs, 'satz' puzzles) are tracked in the same
 * history table for the shared repetition selector, but excluded here so the
 * book report keeps its quiz-accuracy meaning.
 */
export const ACCURACY_MODES = new Set(['dictation', 'artikel', 'mixed', 'choice', 'fa', 'quiz', 'sprint', 'rain']);

/**
 * @param {number} correct
 * @param {number} total
 * @returns {number|null} rounded 0-100 accuracy, or null when total is 0
 */
export function calcAccuracy(correct, total) {
  if (!total || total <= 0) return null;
  return Math.round((correct / total) * 100);
}

/** Sum XP from attempts. Missing xp counts as 0. */
export function sumXp(attempts) {
  return (attempts || []).reduce((a, t) => a + (Number(t.xp) || 0), 0);
}

function normLektionKey(lektion) {
  if (typeof lektion === 'string' && lektion.trim()) return lektion.trim();
  return UNASSIGNED_KEY;
}

function lektionLabel(key) {
  return key === UNASSIGNED_KEY ? UNASSIGNED_LABEL : key;
}

/**
 * Group attempts per Lektion (single pass, no N+1).
 * @returns {Map<string, {key,label,book,questions,correct,incorrect,xp}>}
 */
export function groupByLektion(attempts) {
  const map = new Map();
  for (const t of attempts || []) {
    const key = normLektionKey(t.lektion);
    let g = map.get(key);
    if (!g) {
      g = { key, label: lektionLabel(key), book: t.book || null, questions: 0, correct: 0, incorrect: 0, xp: 0 };
      map.set(key, g);
    }
    g.questions += 1;
    if (t.correct) g.correct += 1;
    else g.incorrect += 1;
    g.xp += Number(t.xp) || 0;
    // keep the most common book for mixed edge cases (first wins, refined below)
    if (!g.book && t.book) g.book = t.book;
  }
  return map;
}

function finalizeLektionEntry(g) {
  return {
    ...g,
    accuracy: calcAccuracy(g.correct, g.questions),
    lowConfidence: g.questions < MIN_SAMPLE,
  };
}

/**
 * Rank confident Lektion entries by accuracy (desc). Thin-sample entries
 * are excluded from strongest/weakest determination.
 */
function rankConfident(entries) {
  const confident = entries.filter((e) => e.key !== UNASSIGNED_KEY && !e.lowConfidence);
  const sorted = [...confident].sort((a, b) => {
    if ((b.accuracy ?? -1) !== (a.accuracy ?? -1)) return (b.accuracy ?? -1) - (a.accuracy ?? -1);
    if (b.questions !== a.questions) return b.questions - a.questions;
    return b.correct - a.correct;
  });
  return sorted;
}

/**
 * Build a deterministic, explainable recommendation from per-Lektion data.
 * Never confidently judges Lektionen with fewer than MIN_SAMPLE questions.
 */
export function buildRecommendation(perLektion, opts = {}) {
  const totalQuestions = (perLektion || []).reduce((a, e) => a + e.questions, 0);
  const assigned = (perLektion || []).filter((e) => e.key !== UNASSIGNED_KEY);
  const ranked = rankConfident(assigned);

  if (totalQuestions === 0) {
    return {
      text: 'No quiz data yet — complete a short quiz to get your first learning report.',
      focusLektion: null,
      confidence: 'none',
    };
  }

  if (assigned.length === 0) {
    const acc = calcAccuracy(
      (perLektion || []).reduce((a, e) => a + e.correct, 0),
      totalQuestions,
    );
    return {
      text:
        acc !== null && acc >= 80
          ? `Solid result (${acc}% correct). These questions had no Lektion metadata, so practice any Lektion you feel unsure about next.`
          : 'These questions had no Lektion metadata, so focus next on the Lektion you felt least sure about.',
      focusLektion: null,
      confidence: 'low',
    };
  }

  if (totalQuestions < MIN_SAMPLE) {
    const top = [...assigned].sort((a, b) => b.questions - a.questions)[0];
    return {
      text: `Early days — only ${totalQuestions} question${totalQuestions === 1 ? '' : 's'} so far. Answer a few more in ${top.label} (and each Lektion) for a clear recommendation.`,
      focusLektion: top.key,
      confidence: 'low',
    };
  }

  // Single-Lektion quiz: judge the trend, not a comparison.
  if (assigned.length === 1) {
    const only = assigned[0];
    if (only.lowConfidence) {
      return {
        text: `Only ${only.questions} question${only.questions === 1 ? '' : 's'} in ${only.label} — answer a few more before judging it. Keep practicing ${only.label} for now.`,
        focusLektion: only.key,
        confidence: 'low',
      };
    }
    if ((only.accuracy ?? 0) >= 85) {
      return {
        text: `Strong in ${only.label} (${only.accuracy}% over ${only.questions} questions). You can move on or try a mixed quiz across Lektionen.`,
        focusLektion: null,
        confidence: 'high',
      };
    }
    if ((only.accuracy ?? 0) >= 60) {
      return {
        text: `Getting there in ${only.label} (${only.accuracy}%, ${only.incorrect} missed). Review the missed words, then retry ${only.label}.`,
        focusLektion: only.key,
        confidence: 'high',
      };
    }
    return {
      text: `${only.label} needs practice (${only.accuracy}% — ${only.incorrect} missed of ${only.questions}). Study ${only.label} flashcards, then retake this quiz.`,
      focusLektion: only.key,
      confidence: 'high',
    };
  }

  // Multi-Lektion quiz.
  if (ranked.length === 0) {
    const top = [...assigned].sort((a, b) => b.questions - a.questions)[0];
    return {
      text: `Not enough per-Lektion data yet (answer at least ${MIN_SAMPLE} questions per Lektion). Keep practicing — ${top.label} has the most attempts so far.`,
      focusLektion: top.key,
      confidence: 'low',
    };
  }

  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const allStrong = ranked.every((e) => (e.accuracy ?? 0) >= 85);

  if (ranked.length === 1) {
    // One confident Lektion among several thin ones.
    if ((weakest.accuracy ?? 0) >= 85) {
      return {
        text: `Strong in ${strongest.label} (${strongest.accuracy}%). The other Lektionen need more attempts before they can be judged — practice them next.`,
        focusLektion: null,
        confidence: 'high',
      };
    }
    return {
      text: `${weakest.label} needs the most practice (${weakest.accuracy}% — ${weakest.incorrect} missed of ${weakest.questions}). The other Lektionen need more attempts for a fair comparison.`,
      focusLektion: weakest.key,
      confidence: 'high',
    };
  }

  if (allStrong) {
    return {
      text: `Balanced and strong across ${ranked.length} Lektionen (all ≥85%, best: ${strongest.label} ${strongest.accuracy}%). Push ahead to the next Lektion or try a harder mode.`,
      focusLektion: null,
      confidence: 'high',
    };
  }

  const gap = (strongest.accuracy ?? 0) - (weakest.accuracy ?? 0);
  if (strongest.key === weakest.key) {
    return {
      text: `Focus next on ${weakest.label} (${weakest.accuracy}% — ${weakest.incorrect} missed of ${weakest.questions}).`,
      focusLektion: weakest.key,
      confidence: 'high',
    };
  }
  void opts;
  return {
    text: `Strong in ${strongest.label} (${strongest.accuracy}%). Focus next on ${weakest.label} (${weakest.accuracy}% — ${weakest.incorrect} missed of ${weakest.questions}${gap > 0 ? `, ${gap} points behind` : ''}).`,
    focusLektion: weakest.key,
    confidence: 'high',
  };
}

/**
 * Lektionen needing practice, ordered by signal strength:
 * most incorrect first, then lowest accuracy. Thin-sample entries are
 * included but flagged so the UI can hedge.
 */
export function selectNeedsPractice(perLektion, limit = 3) {
  return [...(perLektion || [])]
    .filter((e) => e.key !== UNASSIGNED_KEY && e.questions > 0 && ((e.accuracy ?? 100) < 85 || e.incorrect >= 2))
    .sort((a, b) => {
      if (b.incorrect !== a.incorrect) return b.incorrect - a.incorrect;
      return (a.accuracy ?? 100) - (b.accuracy ?? 100);
    })
    .slice(0, limit);
}

/**
 * Shared quiz-level report. Same math powers quiz + book views.
 * @param {Array} attempts
 */
export function calcQuizReport(attempts) {
  const list = attempts || [];
  const total = list.length;
  const correct = list.filter((t) => t.correct).length;
  const incorrect = total - correct;
  const accuracy = calcAccuracy(correct, total);
  const xp = sumXp(list);

  const grouped = groupByLektion(list);
  const perLektion = [...grouped.values()]
    .map(finalizeLektionEntry)
    .sort((a, b) => {
      if (b.questions !== a.questions) return b.questions - a.questions;
      return (b.accuracy ?? -1) - (a.accuracy ?? -1);
    });

  const ranked = rankConfident(perLektion.filter((e) => e.key !== UNASSIGNED_KEY));
  const strongest = ranked.length ? ranked[0] : null;
  const weakest = ranked.length ? ranked[ranked.length - 1] : null;
  const needsPractice = selectNeedsPractice(perLektion);
  const recommendation = buildRecommendation(perLektion);
  const unassigned = grouped.get(UNASSIGNED_KEY) ? finalizeLektionEntry(grouped.get(UNASSIGNED_KEY)) : null;
  const hasLektionData = perLektion.some((e) => e.key !== UNASSIGNED_KEY);

  return { total, correct, incorrect, accuracy, xp, perLektion, strongest, weakest, needsPractice, recommendation, unassigned, hasLektionData };
}

/**
 * Words mastered helper lives in utils/progress.js; this keeps analytics
 * dependency-free by accepting an `isMastered` predicate.
 */

/**
 * Book-level analytics: SRS progress (seen/mastered) + quiz history
 * (accuracy, XP, progress over time). One pass over attempts, one pass
 * over book words — no N+1.
 *
 * @param {object} args
 * @param {string} args.bookId
 * @param {Array} args.allWords all vocabulary (filtered internally by book)
 * @param {object} args.progressMap Dexie/server progress keyed by word id
 * @param {Array} args.attempts quiz history attempts (any book; filtered internally)
 * @param {(progress: object|undefined) => boolean} args.isMastered
 * @param {number} [args.historyLimit] cap on attempts considered (newest first)
 */
export function calcBookAnalytics({ bookId, allWords, progressMap, attempts, isMastered, historyLimit = 3000 }) {
  const words = (allWords || []).filter((w) => w.book === bookId);
  const totalWords = words.length;
  const progress = progressMap || {};

  let seen = 0;
  let mastered = 0;
  const byLektionProgress = new Map();
  for (const w of words) {
    const p = progress[w.id];
    const isSeen = !!(p && (p.repetition > 0 || p.interval > 0 || p.lapses > 0));
    const isM = isMastered ? !!isMastered(p) : false;
    if (isSeen) seen += 1;
    if (isM) mastered += 1;
    const key = normLektionKey(w.lektion);
    let g = byLektionProgress.get(key);
    if (!g) g = { key, label: lektionLabel(key), totalWords: 0, seen: 0, mastered: 0 };
    g.totalWords += 1;
    if (isSeen) g.seen += 1;
    if (isM) g.mastered += 1;
    byLektionProgress.set(key, g);
  }

  // Newest-first cap keeps payloads small for long histories.
  const sorted = [...(attempts || [])]
    .filter((t) => (!t.book || t.book === bookId) && (!t.mode || ACCURACY_MODES.has(t.mode)))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const capped = sorted.slice(0, Math.max(0, historyLimit));
  // book strictly matching (entries without book count only if word belongs? keep: no-book entries excluded when bookId set)
  const bookAttempts = capped.filter((t) => !t.book || t.book === bookId);

  const totalQuestions = bookAttempts.length;
  const totalCorrect = bookAttempts.filter((t) => t.correct).length;
  const totalIncorrect = totalQuestions - totalCorrect;
  const accuracy = calcAccuracy(totalCorrect, totalQuestions);
  const xp = sumXp(bookAttempts);
  const wordsPracticed = new Set(bookAttempts.map((t) => t.wordId)).size;

  const grouped = groupByLektion(bookAttempts);
  const perLektion = [...byLektionProgress.values()]
    .map((g) => {
      const h = grouped.get(g.key);
      return {
        ...g,
        questions: h ? h.questions : 0,
        correct: h ? h.correct : 0,
        incorrect: h ? h.incorrect : 0,
        xp: h ? h.xp : 0,
        accuracy: h ? calcAccuracy(h.correct, h.questions) : null,
        seenPct: g.totalWords ? Math.round((g.seen / g.totalWords) * 100) : 0,
        masteredPct: g.totalWords ? Math.round((g.mastered / g.totalWords) * 100) : 0,
        lowConfidence: h ? h.questions < MIN_SAMPLE : true,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));

  const ranked = rankConfident(perLektion);
  const strongest = ranked.length ? ranked[0] : null;
  const weakest = ranked.length ? ranked[ranked.length - 1] : null;
  const needsPractice = selectNeedsPractice(perLektion, 4);
  const recommendation = buildRecommendation(
    perLektion.map((e) => ({ key: e.key, label: e.label, book: bookId, questions: e.questions, correct: e.correct, incorrect: e.incorrect, xp: e.xp, accuracy: e.accuracy, lowConfidence: e.lowConfidence })),
  );

  // Progress over time: per-day buckets, oldest first, last 14 days with data.
  const byDay = new Map();
  for (const t of bookAttempts) {
    if (!t.timestamp) continue;
    const day = new Date(t.timestamp).toISOString().slice(0, 10);
    let d = byDay.get(day);
    if (!d) d = { date: day, questions: 0, correct: 0 };
    d.questions += 1;
    if (t.correct) d.correct += 1;
    byDay.set(day, d);
  }
  const progressOverTime = [...byDay.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-14)
    .map((d) => ({ ...d, accuracy: calcAccuracy(d.correct, d.questions) }));

  return {
    bookId,
    totalWords,
    seen,
    mastered,
    seenPct: totalWords ? Math.round((seen / totalWords) * 100) : 0,
    masteredPct: totalWords ? Math.round((mastered / totalWords) * 100) : 0,
    totalQuestions,
    totalCorrect,
    totalIncorrect,
    accuracy,
    xp,
    wordsPracticed,
    perLektion,
    strongest,
    weakest,
    needsPractice,
    recommendation,
    progressOverTime,
    hasHistory: totalQuestions > 0,
    hasProgress: seen > 0,
  };
}
