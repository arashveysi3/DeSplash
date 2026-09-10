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

export const XP_MAP = { Again: 2, Hard: 5, Good: 10, Easy: 15 };
