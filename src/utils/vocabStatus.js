/**
 * Lesson-level vocabulary status for quiz start screens (e.g. Diktat-Check).
 *
 * Reuses the application's existing learning definitions — nothing is
 * redefined here:
 *  - weak / new / learning / strong come from `classifyWord`
 *    (src/utils/selection.js): weak = in weak set (lapses>0 or ease<1.8)
 *    OR accuracy < 60% with >=2 attempts; new = no progress AND no attempts.
 *  - mastered comes from `isWordMastered` (src/utils/progress.js).
 *
 * Categories shown in the UI:
 *  - unseen:    never seen (no SRS progress AND no recorded attempts)
 *  - weak:      needs reinforcement (existing weak definition)
 *  - practiced: everything else that has been seen (learning + strong,
 *               including mastered words)
 *  - mastered:  subset of practiced, shown as a subtitle (existing definition)
 *  - total:     scope size
 *
 * Invariant: unseen + practiced + weak === total (no double counting —
 * each word is classified exactly once via classifyWord).
 */

import { classifyWord, emptyExposure } from './selection.js';
import { isWordMastered } from './progress.js';

export function getVocabStatus(words, ctx = {}) {
  const list = words || [];
  const total = list.length;
  const progressMap = ctx.progressMap || {};
  const weakIds = ctx.weakIds || new Set();
  const exposure = ctx.exposure || new Map();

  let unseen = 0;
  let weak = 0;
  let mastered = 0;
  let seen = 0;

  for (const w of list) {
    const p = progressMap[w.id];
    const exp = (typeof exposure.get === 'function' && exposure.get(w.id)) || emptyExposure();
    const status = classifyWord(w.id, { progress: p, weakIds, exposure: exp });
    if (status === 'weak') {
      weak += 1;
      seen += 1;
    } else if (status === 'new') {
      unseen += 1;
    } else {
      seen += 1;
    }
    if (isWordMastered(p)) mastered += 1;
  }

  const practiced = total - unseen - weak;
  return { total, unseen, practiced, weak, mastered, seen };
}
