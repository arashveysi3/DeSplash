// SM-2 implementation
// quality: 0=Again, 3=Hard, 4=Good, 5=Easy  (mapped from buttons)
export function sm2(card, quality) {
  // card: { interval, repetition, ease, due }
  // defaults for new card
  let interval = card?.interval || 0;
  let repetition = card?.repetition || 0;
  let ease = card?.ease || 2.5;
  if (quality < 3) {
    repetition = 0;
    interval = 1;
  } else {
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = Math.round(interval * ease);
    repetition += 1;
  }
  // update ease factor
  ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease < 1.3) ease = 1.3;
  // Hard penalizes slightly, Easy boosts
  const due = Date.now() + interval * 86400000;
  return { interval, repetition, ease: Math.round(ease*100)/100, due, lapses: quality===0 ? (card?.lapses||0)+1 : (card?.lapses||0) };
}

export function qualityFromLabel(label){
  switch(label){
    case 'Again': return 0;
    case 'Hard': return 3;
    case 'Good': return 4;
    case 'Easy': return 5;
    default: return 3;
  }
}

export const XP_MAP = { Again: 1, Hard: 2, Good: 3, Easy: 5 };

// Balanced economy: swiping is cheap, mastery & quizzes pay more
export const QUIZ_XP = {
  artikel: 8,
  dictation: 12,
  fa: 12,
  choice: 10,
  // games
  matchPair: 4,        // per pair in Match Dash (6 pairs = 24 max + bonus)
  matchBonus: 12,      // perfect match bonus
  sprintPerCorrect: 6, // per correct in Sprint, streak multiplier up to 2x
};

export const GAME_XP = {
  matchPair: 4,
  matchPerfectBonus: 16,
  sprintBase: 6,
  scramblePerWord: 10,
};
