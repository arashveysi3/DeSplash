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
  if (!hasMenschen) {
    // keep custom words, remove old non-custom Menschen/A1 generic words if they are from old seed
    const customs = refreshed.filter(w => w.isCustom === 1);
    // clear non-custom old words if we detect old seed (count >0 and no menschen)
    if (refreshed.length > 0 && refreshed.filter(w => !w.isCustom).length > 0) {
      await db.words.clear();
      if (customs.length) await db.words.bulkPut(customs);
    }
    await db.words.bulkPut(ALL_MENSCHEN_WORDS.map(w => ({ ...w })));
  } else {
    // ensure any missing Menschen words are present (e.g. after JSON update)
    const existingIds = new Set(refreshed.map(w => w.id));
    const missing = ALL_MENSCHEN_WORDS.filter(w => !existingIds.has(w.id));
    if (missing.length) await db.words.bulkPut(missing);
    // also patch existing to ensure fields match latest JSON (meanings/plural)
    for (const fresh of ALL_MENSCHEN_WORDS) {
      const cur = refreshed.find(x=> x.id===fresh.id);
      if (cur && (cur.meaning_fa !== fresh.meaning_fa || cur.plural !== fresh.plural || cur.meaning_en !== fresh.meaning_en)) {
        await db.words.update(fresh.id, { meaning_en: fresh.meaning_en, meaning_fa: fresh.meaning_fa, plural: fresh.plural, english: fresh.meaning_en });
      }
    }
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
