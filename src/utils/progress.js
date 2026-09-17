export function isWordMastered(progress) {
  if (!progress) return false;
  const reps = progress.repetition || 0;
  const ease = progress.ease ?? 2.5;
  const lapses = progress.lapses || 0;
  const interval = progress.interval || 0;
  return (reps >= 3 && lapses === 0 && ease >= 2.0) || interval >= 14;
}

export function getLektionMastery(lektionWords, progressMap) {
  if (!lektionWords.length) return { total: 0, mastered: 0, seen: 0, pct: 0, masteredPct: 0 };
  let seen = 0, mastered = 0;
  for (const w of lektionWords) {
    const p = progressMap[w.id];
    if (p && (p.repetition > 0 || p.interval > 0 || p.lapses > 0)) seen++;
    if (isWordMastered(p)) mastered++;
  }
  return { total: lektionWords.length, mastered, seen, pct: Math.round((seen / lektionWords.length) * 100), masteredPct: Math.round((mastered / lektionWords.length) * 100) };
}

export function getBookMastery(bookKey, allWords, progressMap) {
  const words = allWords.filter(w => w.book === bookKey);
  if (!words.length) return { total: 0, mastered: 0, seen: 0, pct: 0, masteredPct: 0 };
  let seen = 0, mastered = 0;
  for (const w of words) {
    const p = progressMap[w.id];
    if (p && (p.repetition > 0 || p.interval > 0 || p.lapses > 0)) seen++;
    if (isWordMastered(p)) mastered++;
  }
  return { total: words.length, mastered, seen, pct: Math.round((seen / words.length) * 100), masteredPct: Math.round((mastered / words.length) * 100) };
}

// legacy alias for scope progress (uses seen)
export function getScopeProgress(words, progressMap) { return getLektionMastery(words, progressMap); }
