import Dexie from 'dexie';
import wordsData from './data/words.js';
import { ALL_MENSCHEN_WORDS } from './data/menschen.js';

export const db = new Dexie('GermanSplashDB');
db.version(1).stores({
  progress: 'id, level, due, ease, interval, reps, lapses',
  stats: 'id',
  words: 'id, level, german, english',
});
db.version(2).stores({
  progress: 'id, level, due, ease, interval, reps, lapses',
  stats: 'id',
  words: 'id, level, german, english, isCustom',
}).upgrade(tx => {
  // mark existing words as not custom
  return tx.table('words').toCollection().modify(w => { if (w.isCustom === undefined) w.isCustom = 0; });
});
db.version(3).stores({
  progress: 'id, level, due, ease, interval, reps, lapses, book, lektion',
  stats: 'id',
  words: 'id, level, german, english, isCustom, book, lektion',
}).upgrade(tx => {
  return tx.table('words').toCollection().modify(w => {
    if (w.book === undefined) w.book = null;
    if (w.lektion === undefined) w.lektion = null;
    if (w.meaning_fa === undefined) w.meaning_fa = null;
    if (w.plural === undefined) w.plural = '';
  });
});
db.version(4).stores({
  progress: 'id, level, due, ease, interval, reps, lapses, book, lektion',
  stats: 'id',
  words: 'id, level, german, english, isCustom, book, lektion',
}).upgrade(tx => {
  // Fix duplicate article in german: old seed stored "der Name" as german + article "der" → display "der der Name"
  return tx.table('words').toCollection().modify(w => {
    if (w.article && w.german && w.german.toLowerCase().startsWith(w.article.toLowerCase() + ' ')) {
      // keep fullGerman as original, strip german to base
      w.fullGerman = w.german;
      w.german = w.german.slice(w.article.length + 1);
    } else if (w.article && w.fullGerman === undefined) {
      w.fullGerman = w.article + ' ' + w.german;
    }
    if (w.meaning_fa === undefined) w.meaning_fa = w.english || '';
    if (w.plural === undefined) w.plural = '';
  });
});
db.version(5).stores({
  progress: 'id, level, due, ease, interval, reps, lapses, book, lektion',
  stats: 'id',
  words: 'id, level, german, english, isCustom, book, lektion',
}).upgrade(tx => {
  // Add canonicalLesson / appearsInLessons for A1.2 deduplication support
  return tx.table('words').toCollection().modify(w => {
    if (w.canonicalLesson === undefined) w.canonicalLesson = w.lektion || null;
    if (w.appearsInLessons === undefined) w.appearsInLessons = w.lektion ? [w.lektion] : [];
    if (w.page === undefined) w.page = '';
    if (w.type === undefined) w.type = '';
  });
});
db.version(6).stores({
  progress: 'id, level, due, ease, interval, reps, lapses, book, lektion',
  stats: 'id',
  words: 'id, level, german, english, isCustom, book, lektion',
  // Quiz/game attempt history for learning analytics (Issue #2).
  // One row per answered question: { sessionId, timestamp, wordId, book,
  // lektion, mode, correct (0/1), xp }. Progress (SRS) stays the source of
  // truth for mastery; this table only adds per-answer accuracy history.
  quizAttempts: '++id, sessionId, timestamp, book, lektion, wordId, mode',
});

export const COMPETITORS = [
  { name: 'Lena M.', xp: 4820, avatar: 'LM' },
  { name: 'Jonas K.', xp: 4210, avatar: 'JK' },
  { name: 'Sophie R.', xp: 3890, avatar: 'SR' },
  { name: 'Maxim B.', xp: 3450, avatar: 'MB' },
  { name: 'Anna T.', xp: 3100, avatar: 'AT' },
  { name: 'Felix H.', xp: 2750, avatar: 'FH' },
  { name: 'Mia S.', xp: 2100, avatar: 'MS' },
  { name: 'Paul W.', xp: 1800, avatar: 'PW' },
];

function stripTrailingParen(s) {
  // Remove trailing " (...)" annotation like " (Sg.)", " (Pl.)", " (der Buchstabe F)", " (Ich mache gern ...)"
  return s.replace(/\s*\(.*\)\s*$/, '').trim();
}
function lexKeyForMigration(w) {
  // Mirrors generation dedup key: noun -> base lower without article, verb -> infinitive, other -> german lower
  const art = (w.article || '').toLowerCase();
  let base = (w.german || '').trim();
  // Noun with article -> noun key (strip trailing paren, lower)
  if (art && (art === 'der' || art === 'die' || art === 'das')) {
    let norm = stripTrailingParen(base).toLowerCase().replace(/\s+/g, ' ').trim();
    return `noun:${norm}`;
  }
  // Verb detection: check pos/type
  const isVerb = (w.pos === 'verb' || w.type === 'verb');
  if (isVerb) {
    let norm = base.split('(')[0].trim().toLowerCase().replace(/\s+/g, ' ').trim();
    return `verb:${norm}`;
  }
  // Other: strip trailing paren, lower, collapse spaces
  let norm = stripTrailingParen(base).toLowerCase().replace(/\s+/g, ' ').trim();
  return `other:${norm}`;
}

function lexKeyForNew(w) {
  const art = (w.article || '').toLowerCase();
  let base = (w.german || '').trim();
  // Noun
  if (art && (art === 'der' || art === 'die' || art === 'das')) {
    let norm = stripTrailingParen(base).toLowerCase().replace(/\s+/g, ' ').trim();
    // Also strip leading parenthetical article like "(das)" if present in base (for new words where article is "" but german is "(das) Deutschland")
    // But for new words, article is already extracted, base is without article, so not needed.
    return `noun:${norm}`;
  }
  // Verb
  if (w.pos === 'verb' || w.type === 'verb') {
    let norm = base.split('(')[0].trim().toLowerCase().replace(/\s+/g, ' ').trim();
    return `verb:${norm}`;
  }
  // Other (including adjectives, adverbs, other_vocabulary)
  let norm = stripTrailingParen(base).toLowerCase().replace(/\s+/g, ' ').trim();
  return `other:${norm}`;
}

export async function initDB() {
  // Migration to Menschen books: if no Menschen words present, seed them (keep custom words)
  const all = await db.words.toArray();
  // Patch any word that still has duplicate article in german (pre-fix) even if already has Menschen flag
  const needsPatch = all.some(w => w.article && w.german && w.german.toLowerCase().startsWith(w.article.toLowerCase() + ' '));
  if (needsPatch) {
    for (const w of all) {
      if (w.article && w.german && w.german.toLowerCase().startsWith(w.article.toLowerCase() + ' ')) {
        const base = w.german.slice(w.article.length + 1);
        await db.words.update(w.id, { german: base, fullGerman: w.german });
      }
    }
  }
  const refreshed = needsPatch ? await db.words.toArray() : all;
  const hasMenschen = refreshed.some(w => w.book === 'a1.1' || w.book === 'a1.2' || w.id >= 10001);

  // --- A1.2 authoritative replacement detection ---
  // New A1.2 dataset is canonical deduplicated (1198 vs old 448) and includes appearsInLessons
  const existingA12 = refreshed.filter(w => w.book === 'a1.2' && w.isCustom !== 1);
  const needsA12Replacement = (() => {
    if (!hasMenschen) return false; // will be seeded anyway
    if (existingA12.length === 0) return true;
    // If counts mismatch or any lacks appearsInLessons, or version marker mismatch
    const newCount = ALL_MENSCHEN_WORDS.filter(w => w.book === 'a1.2').length;
    if (existingA12.length !== newCount) return true;
    if (existingA12.some(w => !w.appearsInLessons || !w.canonicalLesson)) return true;
    // Also detect obsolete old A1.2 words that are not in new set (by lex key)
    const newLexSet = new Set(ALL_MENSCHEN_WORDS.filter(w=>w.book==='a1.2').map(lexKeyForNew));
    // Also add verb-variant keys for fallback
    const newLexSetExpanded = new Set([...newLexSet]);
    for (const k of newLexSet) {
      if (k.startsWith('verb:')) newLexSetExpanded.add(k.replace('verb:','other:'));
      if (k.startsWith('other:')) newLexSetExpanded.add(k.replace('other:','verb:'));
    }
    const obsolete = existingA12.filter(w => !newLexSetExpanded.has(lexKeyForMigration(w)));
    if (obsolete.length > 0) return true;
    return false;
  })();

  // --- Handle A1.2 replacement (existing logic, keep isolated) ---
  let workingWords = refreshed;
  if (needsA12Replacement) {
    // Preserve progress for words that have lexical equivalent in new set
    const allProgress = await db.progress.toArray();
    const newA12Words = ALL_MENSCHEN_WORDS.filter(w => w.book === 'a1.2');
    // Build lex -> newId map (support both verb/other prefixes)
    const newLexToId = new Map();
    for (const nw of newA12Words) {
      const k = lexKeyForNew(nw);
      newLexToId.set(k, nw.id);
      // also add cross-variant for migration fallback
      if (k.startsWith('verb:')) newLexToId.set(k.replace('verb:','other:'), nw.id);
      if (k.startsWith('other:')) newLexToId.set(k.replace('other:','verb:'), nw.id);
    }
    const oldLexToId = new Map();
    for (const ow of existingA12) {
      oldLexToId.set(lexKeyForMigration(ow), ow.id);
    }
    // Map oldProgress -> newProgress
    const progressToMigrate = [];
    const obsoleteProgressIds = [];
    for (const p of allProgress) {
      const oldWord = existingA12.find(w => w.id === p.id);
      if (!oldWord) continue; // not an A1.2 word, keep
      const lk = lexKeyForMigration(oldWord);
      const newId = newLexToId.get(lk);
      if (newId && newId !== p.id) {
        progressToMigrate.push({ oldId: p.id, newId, data: p });
      } else if (!newId) {
        obsoleteProgressIds.push(p.id);
      }
    }
    // Delete all existing A1.2 non-custom words
    const idsToDelete = existingA12.map(w => w.id);
    if (idsToDelete.length) await db.words.bulkDelete(idsToDelete);
    // Remove obsolete progress
    if (obsoleteProgressIds.length) await db.progress.bulkDelete(obsoleteProgressIds);
    // Migrate progress IDs where lex match but ID changed
    for (const m of progressToMigrate) {
      const existingProgress = await db.progress.get(m.oldId);
      if (existingProgress) {
        await db.progress.delete(m.oldId);
        // preserve progress data but update id and lektion/book to new canonical
        const targetWord = newA12Words.find(w=> w.id===m.newId);
        const newProg = { ...existingProgress, id: m.newId, book: targetWord?.book || existingProgress.book, lektion: targetWord?.lektion || existingProgress.lektion };
        await db.progress.put(newProg);
      }
    }
    // Ensure all new A1.2 words are present (bulkPut)
    await db.words.bulkPut(newA12Words.map(w => ({ ...w })));
    // Refresh for subsequent logic
    const afterA12 = await db.words.toArray();
    // Ensure any other missing Menschen words (A1.1) are present — but A1.1 may need replacement, handle separately below
    const existingIds2 = new Set(afterA12.map(w=>w.id));
    const missing2 = ALL_MENSCHEN_WORDS.filter(w => w.book === 'a1.2' && !existingIds2.has(w.id));
    if (missing2.length) await db.words.bulkPut(missing2);
    // Patch fields for all A1.2 words to ensure appearsInLessons etc match latest
    for (const fresh of newA12Words) {
      const cur = afterA12.find(x=> x.id===fresh.id);
      if (cur) {
        const needsUpdate = cur.meaning_en !== fresh.meaning_en || cur.meaning_fa !== fresh.meaning_fa || cur.plural !== fresh.plural
          || cur.example !== fresh.example || JSON.stringify(cur.appearsInLessons||[]) !== JSON.stringify(fresh.appearsInLessons||[])
          || cur.canonicalLesson !== fresh.canonicalLesson || cur.page !== fresh.page;
        if (needsUpdate) {
          await db.words.update(fresh.id, {
            meaning_en: fresh.meaning_en,
            meaning_fa: fresh.meaning_fa,
            plural: fresh.plural,
            english: fresh.meaning_en,
            example: fresh.example,
            appearsInLessons: fresh.appearsInLessons,
            canonicalLesson: fresh.canonicalLesson,
            page: fresh.page,
            type: fresh.type,
          });
        }
      }
    }
    workingWords = await db.words.toArray();
  }

  // --- A1.1 authoritative replacement (ONLY A1.1, leave A1.2 untouched) ---
  const newA11Words = ALL_MENSCHEN_WORDS.filter(w => w.book === 'a1.1');
  const existingA11 = workingWords.filter(w => w.book === 'a1.1' && w.isCustom !== 1);
  const needsA11Replacement = (() => {
    if (!hasMenschen) return false; // will be seeded via !hasMenschen branch
    if (existingA11.length === 0 && newA11Words.length > 0) return true;
    const newCount = newA11Words.length;
    if (existingA11.length !== newCount) return true;
    if (existingA11.some(w => !w.appearsInLessons || !w.canonicalLesson)) return true;
    const newLexSet = new Set(newA11Words.map(lexKeyForNew));
    const newLexSetExpanded = new Set([...newLexSet]);
    for (const k of newLexSet) {
      if (k.startsWith('verb:')) newLexSetExpanded.add(k.replace('verb:','other:'));
      if (k.startsWith('other:')) newLexSetExpanded.add(k.replace('other:','verb:'));
    }
    const obsolete = existingA11.filter(w => !newLexSetExpanded.has(lexKeyForMigration(w)));
    if (obsolete.length > 0) return true;
    // Also check if any lex key count mismatch due to dedup change
    const oldLexSet = new Set(existingA11.map(lexKeyForMigration));
    if (oldLexSet.size !== newLexSet.size) return true;
    return false;
  })();

  if (needsA11Replacement) {
    const allProgress = await db.progress.toArray();
    // Build lex -> newId map for A1.1
    const newLexToId = new Map();
    for (const nw of newA11Words) {
      const k = lexKeyForNew(nw);
      newLexToId.set(k, nw.id);
      if (k.startsWith('verb:')) newLexToId.set(k.replace('verb:','other:'), nw.id);
      if (k.startsWith('other:')) newLexToId.set(k.replace('other:','verb:'), nw.id);
    }
    const progressToMigrate = [];
    const obsoleteProgressIds = [];
    for (const p of allProgress) {
      const oldWord = existingA11.find(w => w.id === p.id);
      if (!oldWord) continue;
      const lk = lexKeyForMigration(oldWord);
      const newId = newLexToId.get(lk);
      if (newId && newId !== p.id) {
        progressToMigrate.push({ oldId: p.id, newId, data: p });
      } else if (!newId) {
        obsoleteProgressIds.push(p.id);
      }
    }
    const idsToDelete = existingA11.map(w => w.id);
    if (idsToDelete.length) await db.words.bulkDelete(idsToDelete);
    if (obsoleteProgressIds.length) await db.progress.bulkDelete(obsoleteProgressIds);
    for (const m of progressToMigrate) {
      const existingProgress = await db.progress.get(m.oldId);
      if (existingProgress) {
        await db.progress.delete(m.oldId);
        const targetWord = newA11Words.find(w=> w.id===m.newId);
        const newProg = { ...existingProgress, id: m.newId, book: targetWord?.book || existingProgress.book, lektion: targetWord?.lektion || existingProgress.lektion };
        await db.progress.put(newProg);
      }
    }
    await db.words.bulkPut(newA11Words.map(w => ({ ...w })));
    // Patch ensures fields match
    const afterA11 = await db.words.toArray();
    for (const fresh of newA11Words) {
      const cur = afterA11.find(x=> x.id===fresh.id);
      if (cur) {
        const needsUpdate = cur.meaning_en !== fresh.meaning_en || cur.meaning_fa !== fresh.meaning_fa || cur.plural !== fresh.plural
          || cur.example !== fresh.example || JSON.stringify(cur.appearsInLessons||[]) !== JSON.stringify(fresh.appearsInLessons||[])
          || cur.canonicalLesson !== fresh.canonicalLesson || cur.page !== fresh.page;
        if (needsUpdate) {
          await db.words.update(fresh.id, {
            meaning_en: fresh.meaning_en,
            meaning_fa: fresh.meaning_fa,
            plural: fresh.plural,
            english: fresh.meaning_en,
            example: fresh.example,
            appearsInLessons: fresh.appearsInLessons,
            canonicalLesson: fresh.canonicalLesson,
            page: fresh.page,
            type: fresh.type,
          });
        }
      }
    }
    workingWords = await db.words.toArray();
  }

  if (!hasMenschen) {
    // keep custom words, remove old non-custom Menschen/A1 generic words if they are from old seed
    const customs = workingWords.filter(w => w.isCustom === 1);
    // clear non-custom old words if we detect old seed (count >0 and no menschen)
    if (workingWords.length > 0 && workingWords.filter(w => !w.isCustom).length > 0) {
      await db.words.clear();
      if (customs.length) await db.words.bulkPut(customs);
    }
    await db.words.bulkPut(ALL_MENSCHEN_WORDS.map(w => ({ ...w })));
  } else if (!needsA12Replacement && !needsA11Replacement) {
    // ensure any missing Menschen words are present (e.g. after JSON update) — only if no replacement already handled
    const existingIds = new Set(workingWords.map(w => w.id));
    const missing = ALL_MENSCHEN_WORDS.filter(w => !existingIds.has(w.id));
    if (missing.length) await db.words.bulkPut(missing);
    // also patch existing to ensure fields match latest JSON (meanings/plural)
    for (const fresh of ALL_MENSCHEN_WORDS) {
      const cur = workingWords.find(x=> x.id===fresh.id);
      if (cur && (cur.meaning_fa !== fresh.meaning_fa || cur.plural !== fresh.plural || cur.meaning_en !== fresh.meaning_en
        || JSON.stringify(cur.appearsInLessons||[]) !== JSON.stringify(fresh.appearsInLessons||[]) || cur.canonicalLesson !== fresh.canonicalLesson)) {
        await db.words.update(fresh.id, {
          meaning_en: fresh.meaning_en, meaning_fa: fresh.meaning_fa, plural: fresh.plural, english: fresh.meaning_en,
          appearsInLessons: fresh.appearsInLessons, canonicalLesson: fresh.canonicalLesson, page: fresh.page, type: fresh.type,
          example: fresh.example,
        });
      }
    }
    // Safety cleanup: remove obsolete words that are not in new set for any book (but keep custom)
    const newIds = new Set(ALL_MENSCHEN_WORDS.map(w=> w.id));
    const obsoleteWords = workingWords.filter(w => w.isCustom!==1 && (w.book==='a1.1' || w.book==='a1.2') && !newIds.has(w.id));
    if (obsoleteWords.length) await db.words.bulkDelete(obsoleteWords.map(w=> w.id));
  } else {
    // If one of the replacements happened, ensure the other book's missing words are still handled (already done in each block)
    // Just ensure no leftover missing for the book that was not replaced
    const existingIds = new Set((await db.words.toArray()).map(w=> w.id));
    const missing = ALL_MENSCHEN_WORDS.filter(w => !existingIds.has(w.id));
    if (missing.length) await db.words.bulkPut(missing);
  }
  // also fallback: if DB was empty
  const count = await db.words.count();
  if (count === 0) {
    await db.words.bulkPut(wordsData.map(w => ({ ...w })));
    await db.words.bulkPut(ALL_MENSCHEN_WORDS.map(w => ({ ...w })));
  }
  const stats = await db.stats.get('main');
  if (!stats) {
    await db.stats.put({ id: 'main', xp: 0, streak: 0, lastStudyDate: null, totalReviews: 0, levelCounts: {} });
  }
}

// allow forcing renewal (for dev)
export async function reseedMenschen() {
  await db.words.clear();
  await db.words.bulkPut(ALL_MENSCHEN_WORDS.map(w => ({ ...w })));
  const customs = await db.words.toArray().then(a=> a.filter(w=> w.isCustom===1));
  return customs.length;
}

export async function getStats() {
  return (await db.stats.get('main')) || { id: 'main', xp: 0, streak: 0, lastStudyDate: null, totalReviews: 0 };
}

export async function updateStreak() {
  const stats = await getStats();
  const today = new Date().toISOString().slice(0,10);
  if (stats.lastStudyDate === today) return stats;
  const yesterday = new Date(Date.now()-86400000).toISOString().slice(0,10);
  let newStreak = 1;
  if (stats.lastStudyDate === yesterday) newStreak = (stats.streak||0)+1;
  else if (!stats.lastStudyDate) newStreak = 1;
  else if (stats.lastStudyDate !== today) {
    // if gap >1 day reset unless today already counted
    const diff = (new Date(today) - new Date(stats.lastStudyDate))/86400000;
    newStreak = diff===1 ? (stats.streak||0)+1 : 1;
  }
  await db.stats.update('main', { streak: newStreak, lastStudyDate: today });
  return { ...stats, streak: newStreak, lastStudyDate: today };
}

export async function addXP(amount) {
  const stats = await getStats();
  await db.stats.update('main', { xp: (stats.xp||0)+amount, totalReviews: (stats.totalReviews||0)+1 });
}

export async function getProgress(id) {
  return await db.progress.get(id);
}
export async function getAllProgress() {
  return await db.progress.toArray();
}

// --- Quiz attempt history (Issue #2: quiz reports + book analytics) ---
// Entry: { sessionId, timestamp, wordId, book, lektion, mode, correct (0/1), xp }
export async function recordQuizAttempts(entries) {
  if (!entries || entries.length === 0) return [];
  const rows = entries.map((e) => ({
    sessionId: e.sessionId || 'unknown',
    timestamp: e.timestamp || Date.now(),
    wordId: e.wordId,
    book: e.book || null,
    lektion: e.lektion || null,
    mode: e.mode || 'quiz',
    correct: e.correct ? 1 : 0,
    xp: Number(e.xp) || 0,
  }));
  try {
    await db.quizAttempts.bulkAdd(rows);
  } catch (err) {
    // Table may not exist if an old DB version is open in another tab; never break quizzes.
    console.warn('[analytics] recordQuizAttempts failed', err);
  }
  return rows;
}

/** Newest-first attempt history, capped to keep payloads small. Returns plain attempts with boolean correct. */
export async function getQuizAttempts(limit = 3000) {
  try {
    const rows = await db.quizAttempts.orderBy('timestamp').reverse().limit(limit).toArray();
    return rows.map((r) => ({ ...r, correct: !!r.correct }));
  } catch (err) {
    console.warn('[analytics] getQuizAttempts failed', err);
    return [];
  }
}

export async function clearQuizHistory() {
  try {
    await db.quizAttempts.clear();
  } catch (err) {
    console.warn('[analytics] clearQuizHistory failed', err);
  }
}

export async function getAllWords() {
  return await db.words.toArray();
}

export async function addCustomWord({ german, english, article, level, example, exampleEn, pos, meaning_fa, plural, book, lektion }) {
  const all = await db.words.toArray();
  const maxId = all.reduce((m, w) => Math.max(m, w.id), 0);
  const id = maxId + 1;
  const fullGerman = article ? `${article} ${german}` : german;
  const word = {
    id,
    german,
    fullGerman,
    english,
    meaning_en: english,
    meaning_fa: meaning_fa || '',
    article: article || null,
    plural: plural || '',
    pos: pos || (article ? 'noun' : 'other'),
    level: level || 'Custom',
    book: book || null,
    lektion: lektion || null,
    example: example || `Ich lerne "${german}".`,
    exampleEn: exampleEn || `I learn "${english}".`,
    isCustom: 1,
  };
  await db.words.put(word);
  return word;
}

export async function deleteCustomWord(id) {
  const w = await db.words.get(id);
  if (w && w.isCustom) await db.words.delete(id);
  // also clean progress
  await db.progress.delete(id);
}

// online leaderboard helpers (Vercel KV / fallback) - with debug logs
export async function fetchOnlineLeaderboard() {
  try {
    console.log('[leaderboard] fetching /api/leaderboard');
    const r = await fetch('/api/leaderboard');
    console.log('[leaderboard] GET status', r.status);
    if (!r.ok) throw new Error('no api ' + r.status);
    const j = await r.json();
    console.log('[leaderboard] GET ok', j?.length);
    return j;
  } catch (e) {
    console.warn('[leaderboard] GET failed', e);
    return null;
  }
}

export async function submitOnlineScore(name, xp) {
  try {
    console.log('[leaderboard] POST', name, xp);
    const r = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, xp }),
    });
    console.log('[leaderboard] POST status', r.status);
    if (!r.ok) throw new Error('post failed ' + r.status);
    const j = await r.json();
    console.log('[leaderboard] POST ok', j?.length);
    return j;
  } catch (e) {
    console.warn('[leaderboard] POST failed', e);
    return null;
  }
}

export async function deleteOnlineScore(name, adminToken) {
  try {
    const qs = `?name=${encodeURIComponent(name)}${adminToken ? `&adminToken=${encodeURIComponent(adminToken)}` : ''}`;
    const r = await fetch(`/api/leaderboard${qs}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...(adminToken ? { 'x-admin-token': adminToken } : {}) },
      body: JSON.stringify({ name, adminToken }),
    });
    if (!r.ok) throw new Error('delete failed ' + r.status);
    return await r.json();
  } catch (e) { console.warn('[leaderboard] DELETE failed', e); return null; }
}

export async function resetOnlineBoard(adminToken) {
  try {
    const r = await fetch(`/api/leaderboard?reset=true${adminToken ? `&adminToken=${encodeURIComponent(adminToken)}` : ''}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...(adminToken ? { 'x-admin-token': adminToken } : {}) },
      body: JSON.stringify({ reset: true, adminToken }),
    });
    if (!r.ok) throw new Error('reset failed ' + r.status);
    return await r.json();
  } catch (e) { console.warn('[leaderboard] RESET failed', e); return null; }
}
