import Dexie from 'dexie';
import wordsData from './data/words.js';

export const db = new Dexie('GermanSplashDB');
db.version(1).stores({
  progress: 'id, level, due, ease, interval, reps, lapses',
  stats: 'id',
  words: 'id, level, german, english',
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
  const count = await db.words.count();
  if (count === 0) {
    await db.words.bulkPut(wordsData.map(w => ({ ...w })));
  }
  const stats = await db.stats.get('main');
  if (!stats) {
    await db.stats.put({ id: 'main', xp: 0, streak: 0, lastStudyDate: null, totalReviews: 0, levelCounts: {} });
  }
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
