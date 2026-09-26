// Diktat-Check spelling utils — app-source only, no internet.
// Single-word German spelling quiz: "which is correct?" vs "which is wrong?"
// Article is intentionally ignored (bare `german` form only).

/** Bare German form without article prefix. Article is NOT important for this mode. */
export function baseGerman(word) {
  if (!word || typeof word.german !== 'string') return '';
  let g = word.german.trim();
  const art = (word.article || '').trim();
  if (art) {
    const low = g.toLowerCase();
    const artLow = art.toLowerCase();
    if (low.startsWith(artLow + ' ')) g = g.slice(art.length + 1).trim();
  }
  return g;
}

/**
 * Single-word check: no spaces (=> max 1 word), no slashes/alternatives,
 * no parenthetical notes, no sentence punctuation.
 */
export function isSingleGermanWord(word, minLen = 4) {
  const g = baseGerman(word);
  if (!g) return false;
  if (/\s/.test(g)) return false; // more than 1 word
  if (g.includes('/')) return false;
  if (/[()]/.test(g)) return false;
  if (/[.?!,;:"]/.test(g)) return false;
  if (g.length < minLen) return false;
  return true;
}

/** Single-word pool with graceful fallback (4 -> 3 -> any single token). */
export function filterSingleWordPool(pool) {
  const list = pool || [];
  let out = list.filter((w) => isSingleGermanWord(w, 4));
  if (out.length >= 4) return out;
  out = list.filter((w) => isSingleGermanWord(w, 3));
  if (out.length >= 4) return out;
  out = list.filter((w) => {
    const g = baseGerman(w);
    if (!g || /\s/.test(g) || g.includes('/')) return false;
    if (/[()]/.test(g)) return false;
    return g.length > 0;
  });
  return out;
}

function uniqPush(set, arr, val, forbiddenLower, correctLower) {
  const low = val.toLowerCase();
  if (!val || low === correctLower) return;
  if (forbiddenLower.has(low)) return; // must not collide with a real app word
  if (set.has(low)) return;
  if (/\s/.test(val) || val.includes('/')) return;
  set.add(low);
  arr.push(val);
}

function swapAt(s, i) {
  if (i < 0 || i + 1 >= s.length) return s;
  return s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);
}

function applyRuleSet(g, rnd) {
  const out = [];
  const push = (v) => { if (v && v !== g) out.push(v); };
  // 1. umlaut stripping
  if (/[äöüÄÖÜ]/.test(g)) {
    push(g.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/Ä/g, 'A').replace(/Ö/g, 'O').replace(/Ü/g, 'U'));
  }
  // 2. single umlaut strip (one at a time)
  for (const m of g.matchAll(/[äöü]/g)) {
    const map = { ä: 'a', ö: 'o', ü: 'u' };
    push(g.slice(0, m.index) + map[m[0]] + g.slice(m.index + 1));
  }
  // 3. ß <-> ss
  if (g.includes('ß')) push(g.replace(/ß/g, 'ss'));
  if (g.includes('ss')) push(g.replace(/ss/g, 'ß'));
  if (g.includes('ss')) push(g.replace(/ss/, 's'));
  // 4. sch/ch variants
  if (/sch/i.test(g)) {
    push(g.replace(/sch/i, (m) => (m[0] === m[0].toUpperCase() ? 'Sh' : 'sh')));
    push(g.replace(/sch/i, (m) => (m[0] === m[0].toUpperCase() ? 'Ch' : 'ch')));
  }
  if (/ch/.test(g) && !/sch/.test(g)) push(g.replace(/ch/, 'sch'));
  // 5. ei <-> ie
  if (g.includes('ei')) push(g.replace(/ei/, 'ie'));
  if (g.includes('ie')) push(g.replace(/ie/, 'ei'));
  if (g.includes('eh')) push(g.replace(/eh/, 'e'));
  // 6. double-consonant removal (Mutter -> Muter)
  const dbl = g.match(/([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ])\1/);
  if (dbl && dbl.index !== undefined) {
    push(g.slice(0, dbl.index) + g.slice(dbl.index + 1));
  }
  // 7. double-consonant addition (Tag -> Tagg) at random consonant
  const consIdx = [];
  for (let i = 1; i < g.length - 1; i++) {
    if (/[bcdfghjklmnpqrstvwxyzß]/i.test(g[i]) && g[i].toLowerCase() !== g[i + 1]?.toLowerCase()) consIdx.push(i);
  }
  if (consIdx.length) {
    const i = consIdx[Math.floor(rnd() * consIdx.length)];
    push(g.slice(0, i + 1) + g[i] + g.slice(i + 1));
  }
  // 8. adjacent swap at random position
  if (g.length >= 4) {
    const i = 1 + Math.floor(rnd() * (g.length - 2));
    push(swapAt(g, i));
  }
  // 9. delete random middle letter
  if (g.length >= 5) {
    const i = 1 + Math.floor(rnd() * (g.length - 2));
    push(g.slice(0, i) + g.slice(i + 1));
  }
  // 10. vowel substitution
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  const vIdx = [];
  for (let i = 0; i < g.length; i++) if (vowels.includes(g[i].toLowerCase())) vIdx.push(i);
  if (vIdx.length) {
    const i = vIdx[Math.floor(rnd() * vIdx.length)];
    const cur = g[i].toLowerCase();
    const pool = vowels.filter((v) => v !== cur);
    const rep = pool[Math.floor(rnd() * pool.length)];
    const ch = g[i] === g[i].toUpperCase() ? rep.toUpperCase() : rep;
    push(g.slice(0, i) + ch + g.slice(i + 1));
  }
  // 11. capitalization flip (German nouns capitalized; verbs/adjectives lowercase)
  if (g.length > 1) {
    const first = g[0];
    push(first === first.toUpperCase() ? first.toLowerCase() + g.slice(1) : first.toUpperCase() + g.slice(1));
  }
  // 12. end devoicing confusion d<->t, g<->k, b<->p
  if (/[dt]$/.test(g)) push(g.slice(0, -1) + (g.endsWith('d') ? 't' : 'd'));
  if (/[gk]$/.test(g)) push(g.slice(0, -1) + (g.endsWith('g') ? 'k' : 'g'));
  // 13. f/v/w confusion
  if (/[fv]/.test(g)) {
    const i = g.search(/[fv]/);
    if (i >= 0) push(g.slice(0, i) + (g[i] === 'f' ? 'v' : 'f') + g.slice(i + 1));
  }
  // 14. missing/extra h (Dehnungs-h)
  if (/[aeiou]h/i.test(g)) push(g.replace(/[aeiou]h/i, (m) => m[0]));
  // 15. k<->c, z<->s
  if (g.includes('k')) push(g.replace(/k/, 'c'));
  if (g.includes('z')) push(g.replace(/z/, 's'));
  if (g.includes('ph')) push(g.replace(/ph/, 'f'));
  return [...new Set(out)].filter((v) => v && v !== g);
}

/**
 * Generate `need` plausible misspellings for a correct German word.
 * Only uses local string rules + the provided forbidden set (real app words).
 */
export function generateMisspellings(correct, need = 3, forbiddenLower = new Set(), rnd = Math.random) {
  const g = (correct || '').trim();
  if (!g) return [];
  const correctLower = g.toLowerCase();
  const seen = new Set();
  const acc = [];
  // deterministic rule candidates first (stable, plausible)
  for (const cand of applyRuleSet(g, rnd)) {
    uniqPush(seen, acc, cand, forbiddenLower, correctLower);
    if (acc.length >= need) return acc;
  }
  // randomized fallbacks: extra swaps/deletes/duplications
  let guard = 0;
  while (acc.length < need && guard++ < 60) {
    const mode = Math.floor(rnd() * 4);
    let cand = g;
    if (mode === 0 && g.length >= 4) {
      cand = swapAt(g, 1 + Math.floor(rnd() * (g.length - 2)));
    } else if (mode === 1 && g.length >= 5) {
      const i = 1 + Math.floor(rnd() * (g.length - 2));
      cand = g.slice(0, i) + g.slice(i + 1);
    } else if (mode === 2 && g.length >= 3) {
      const i = Math.floor(rnd() * g.length);
      cand = g.slice(0, i + 1) + g[i].toLowerCase() + g.slice(i + 1);
    } else if (g.length >= 2) {
      cand = g[0] === g[0].toUpperCase() ? g[0].toLowerCase() + g.slice(1) : g[0].toUpperCase() + g.slice(1);
    }
    uniqPush(seen, acc, cand, forbiddenLower, correctLower);
  }
  return acc.slice(0, need);
}

export function shuffleLocal(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build one 4-choice spelling question for a target word.
 * kind 'find-correct': 4 variants of SAME word, exactly 1 correct -> pick it.
 * kind 'find-error': 3 correct app words + 1 misspelled variant -> pick the wrong one.
 * Returns { kind, options: string[4], correct, target }.
 */
export function buildDiktatQuestion(target, pool, opts = {}) {
  const rnd = opts.rnd || Math.random;
  const forcedKind = opts.kind || null;
  const correctForm = baseGerman(target);
  const singlePool = filterSingleWordPool(pool || []);
  const forbiddenLower = new Set(singlePool.map((w) => baseGerman(w).toLowerCase()).filter(Boolean));
  const kind = forcedKind || (rnd() < 0.5 ? 'find-correct' : 'find-error');

  if (kind === 'find-error') {
    const others = shuffleLocal(
      singlePool.filter((w) => w.id !== target.id && baseGerman(w).toLowerCase() !== correctForm.toLowerCase()),
      rnd,
    );
    // prefer similar length so the error doesn't stand out by shape alone
    others.sort((a, b) => Math.abs(baseGerman(a).length - correctForm.length) - Math.abs(baseGerman(b).length - correctForm.length));
    const fillers = others.slice(0, 3).map((w) => baseGerman(w));
    if (fillers.length < 3) {
      // not enough distinct fillers -> fall back to find-correct for this item
      return buildDiktatQuestion(target, pool, { ...opts, kind: 'find-correct' });
    }
    const miss = generateMisspellings(correctForm, 1, forbiddenLower, rnd);
    if (!miss.length) return buildDiktatQuestion(target, pool, { ...opts, kind: 'find-correct' });
    const wrongForm = miss[0];
    const options = shuffleLocal([...fillers, wrongForm], rnd);
    return { kind: 'find-error', options, correct: wrongForm, target, fillers, correctForm };
  }

  // find-correct (default)
  const miss = generateMisspellings(correctForm, 3, forbiddenLower, rnd);
  if (miss.length < 3) {
    // word too short/stubborn -> try the other kind instead
    if (!forcedKind) return buildDiktatQuestion(target, pool, { ...opts, kind: 'find-error' });
    // last resort: pad with generic variants even if less plausible
    let guard = 0;
    while (miss.length < 3 && guard++ < 20) {
      const cand = `${correctForm}${'x'.slice(0, 0)}${guard}`.slice(0, correctForm.length + 1);
      if (!miss.includes(cand) && cand.toLowerCase() !== correctForm.toLowerCase()) miss.push(cand);
    }
  }
  const options = shuffleLocal([correctForm, ...miss.slice(0, 3)], rnd);
  return { kind: 'find-correct', options, correct: correctForm, target, fillers: [], correctForm };
}
