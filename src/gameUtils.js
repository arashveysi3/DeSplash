export function normalizeLessonSelection(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    if (value === 'all' || value === 'ALL') return [];
    return [value];
  }
  return [];
}

export function filterWordsByScope(words, book, lessonSelection = []) {
  if (!book) return words;
  const scoped = words.filter((word) => word.book === book);
  const lessons = normalizeLessonSelection(lessonSelection);
  if (!lessons.length) return scoped;
  const set = new Set(lessons);
  return scoped.filter((word) => set.has(word.lektion));
}

export function getMeaningDisplay(word = {}) {
  const parts = [word.meaning_en || word.english, word.meaning_fa].filter(Boolean);
  return parts.join(' • ');
}

export function buildChallengeChoices(word, pool = []) {
  const correctEn = word.meaning_en || word.english;
  const correctFa = word.meaning_fa;
  const items = [correctEn, correctFa].filter(Boolean);

  const distractors = pool
    .filter((candidate) => candidate.id !== word.id)
    .map((candidate) => [candidate.meaning_en || candidate.english, candidate.meaning_fa])
    .flat()
    .filter(Boolean)
    .filter((item) => !items.includes(item));

  const combined = [...new Set([...items, ...distractors])];
  return combined.slice(0, 4);
}
