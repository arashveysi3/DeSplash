import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STREAK_MILESTONES,
  addUtcDays,
  applyStreakActivities,
  buildStreakMonth,
  buildStreakRuns,
  diffUtcDays,
  getMilestoneForStreak,
  getNextMilestone,
  isStreakDayKey,
  jalaliParts,
  normalizeStreakAttempts,
  summarizeStreak,
  utcDayKey,
} from './streak.js';

const T = (iso) => Date.parse(iso);
const act = (day, sessionId = 's1', mode = 'dictation', wordId = 1, xp = 12) => ({
  sessionId,
  timestamp: T(`${day}T10:00:00Z`),
  wordId,
  mode,
  correct: true,
  xp,
});
const consecutive = (start, n, sessionPrefix = 's') => Array.from({ length: n }, (_, i) => act(addUtcDays(start, i), `${sessionPrefix}${i}`));

describe('day keys / UTC boundaries', () => {
  it('accepts valid YYYY-MM-DD and rejects invalid', () => {
    assert.equal(isStreakDayKey('2026-09-24'), true);
    assert.equal(isStreakDayKey('2026-02-29'), false); // 2026 not a leap year
    assert.equal(isStreakDayKey('2024-02-29'), true);
    assert.equal(isStreakDayKey('2026-9-24'), false);
    assert.equal(isStreakDayKey('today'), false);
    assert.equal(isStreakDayKey(null), false);
  });
  it('assigns one deterministic UTC day across midnight', () => {
    assert.equal(utcDayKey(T('2026-01-01T00:00:00Z')), '2026-01-01');
    assert.equal(utcDayKey(T('2025-12-31T23:59:59Z')), '2025-12-31');
    assert.equal(utcDayKey(T('2026-06-15T23:59:59Z')), '2026-06-15');
  });
  it('handles month, year, and leap boundaries', () => {
    assert.equal(addUtcDays('2026-01-31', 1), '2026-02-01');
    assert.equal(addUtcDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addUtcDays('2024-02-28', 1), '2024-02-29');
    assert.equal(addUtcDays('2024-02-29', 1), '2024-03-01');
    assert.equal(diffUtcDays('2026-03-01', '2026-02-28'), 1);
  });
});

describe('Jalali conversion (Intl, no manual math)', () => {
  it('converts known Nowruz boundaries', () => {
    assert.deepEqual(jalaliParts('2026-03-21T00:00:00Z'), { jy: 1405, jm: 1, jd: 1 });
    assert.deepEqual(jalaliParts('2025-03-21T00:00:00Z'), { jy: 1404, jm: 1, jd: 1 });
    assert.deepEqual(jalaliParts('2026-03-20T00:00:00Z'), { jy: 1404, jm: 12, jd: 29 }); // Esfand 1404 has 29 days
  });
  it('converts a mid-year date', () => {
    assert.deepEqual(jalaliParts('2026-09-24T00:00:00Z'), { jy: 1405, jm: 7, jd: 2 });
  });
});

describe('basic progression', () => {
  it('first completed day starts streak 1 / longest 1', () => {
    const r = applyStreakActivities({ activities: [act('2026-09-20')], today: '2026-09-20' });
    assert.equal(r.summary.current, 1);
    assert.equal(r.summary.longest, 1);
    assert.equal(r.summary.totalDays, 1);
    assert.deepEqual(r.events.completedDates, ['2026-09-20']);
  });
  it('consecutive day increments', () => {
    const first = applyStreakActivities({ activities: [act('2026-09-20')], today: '2026-09-20' });
    const second = applyStreakActivities({
      days: first.days,
      claimedMilestones: first.claimedMilestones,
      earnedFreezes: first.earnedFreezes,
      consumedFreezes: first.consumedFreezes,
      activities: [act('2026-09-21', 's2')],
      today: '2026-09-21',
    });
    assert.equal(second.summary.current, 2);
    assert.equal(second.summary.longest, 2);
  });
  it('same-day activity is idempotent (no double increment)', () => {
    const first = applyStreakActivities({ activities: [act('2026-09-20')], today: '2026-09-20' });
    const again = applyStreakActivities({
      ...first,
      activities: [act('2026-09-20', 's1'), act('2026-09-20', 's2', 'choice', 7, 10)],
      today: '2026-09-20',
    });
    assert.equal(again.summary.current, 1);
    assert.equal(again.summary.longest, 1);
    assert.deepEqual(again.events.completedDates, []);
    assert.ok(again.events.additionalDates.includes('2026-09-20') || again.events.duplicateDates.includes('2026-09-20'));
    assert.equal(again.days.length, 1);
  });
  it('retrying the exact payload changes nothing', () => {
    const base = { activities: consecutive('2026-09-20', 3), today: '2026-09-22' };
    const once = applyStreakActivities(base);
    const twice = applyStreakActivities({ ...once, activities: base.activities, today: '2026-09-22' });
    assert.deepEqual(twice.summary, once.summary);
    assert.deepEqual(twice.events.awardedMilestones, []);
    assert.equal(twice.events.freezesEarned, 0);
  });
});

describe('breaks and resets', () => {
  it('one missed day without freeze resets to 1', () => {
    const first = applyStreakActivities({ activities: [act('2026-09-20')], today: '2026-09-20' });
    const r = applyStreakActivities({ ...first, activities: [act('2026-09-22', 's2')], today: '2026-09-22' });
    assert.equal(r.summary.current, 1);
    assert.equal(r.summary.longest, 1);
    assert.deepEqual(r.events.streakResetDates, ['2026-09-22']);
    assert.equal(r.events.protectedDates.length, 0);
  });
  it('multiple missed days reset to 1 even with freezes banked', () => {
    const base = applyStreakActivities({ activities: consecutive('2026-09-01', 10), today: '2026-09-10' });
    assert.equal(base.summary.freezes.balance, 1);
    const r = applyStreakActivities({ ...base, activities: [act('2026-09-14', 'late')], today: '2026-09-14' });
    assert.equal(r.summary.current, 1);
    assert.equal(r.summary.longest, 10);
    assert.equal(r.summary.freezes.balance, 1); // untouched
  });
  it('current is 0 when the last activity is older than yesterday', () => {
    const s = summarizeStreak({ days: [{ date: '2026-09-20', status: 'completed' }], today: '2026-09-24' });
    assert.equal(s.current, 0);
    assert.equal(s.longest, 1);
  });
  it('yesterday-only run still shows as current while today is pending', () => {
    const s = summarizeStreak({ days: [{ date: '2026-09-23', status: 'completed' }], today: '2026-09-24' });
    assert.equal(s.current, 1);
  });
});

describe('freeze system', () => {
  it('a banked freeze protects exactly one missed day and continues the streak', () => {
    const base = applyStreakActivities({ activities: consecutive('2026-09-01', 10), today: '2026-09-10' });
    assert.equal(base.summary.freezes.balance, 1);
    const r = applyStreakActivities({ ...base, activities: [act('2026-09-12', 's-new')], today: '2026-09-12' });
    assert.deepEqual(r.events.protectedDates, ['2026-09-11']);
    assert.equal(r.summary.current, 12);
    assert.equal(r.summary.freezes.balance, 0);
    assert.equal(r.summary.freezes.consumed, 1);
  });
  it('freeze consumption happens exactly once across retries', () => {
    const base = applyStreakActivities({ activities: consecutive('2026-09-01', 10), today: '2026-09-10' });
    const once = applyStreakActivities({ ...base, activities: [act('2026-09-12', 's-new')], today: '2026-09-12' });
    const twice = applyStreakActivities({ ...once, activities: [act('2026-09-12', 's-new')], today: '2026-09-12' });
    assert.equal(twice.summary.freezes.consumed, 1);
    assert.equal(twice.summary.current, 12);
    assert.deepEqual(twice.events.protectedDates, []);
  });
  it('real activity on a protected day upgrades it and refunds the freeze', () => {
    const base = applyStreakActivities({ activities: consecutive('2026-09-01', 10), today: '2026-09-10' });
    const bridged = applyStreakActivities({ ...base, activities: [act('2026-09-12', 's-new')], today: '2026-09-12' });
    assert.equal(bridged.summary.freezes.balance, 0);
    const late = applyStreakActivities({
      ...bridged,
      activities: [{ ...act('2026-09-11', 's-late'), timestamp: T('2026-09-11T18:00:00Z') }],
      today: '2026-09-12',
    });
    assert.deepEqual(late.events.upgradedDates, ['2026-09-11']);
    assert.equal(late.summary.freezes.balance, 1);
    assert.equal(late.summary.current, 12);
  });
});

describe('milestones', () => {
  it('tiers resolve per spec and stay data-driven', () => {
    assert.equal(getMilestoneForStreak(1).name, 'Ember');
    assert.equal(getMilestoneForStreak(9).name, 'Ember');
    assert.equal(getMilestoneForStreak(10).name, 'Inferno');
    assert.equal(getMilestoneForStreak(29).name, 'Inferno');
    assert.equal(getMilestoneForStreak(19).icon, 'flame');
    assert.equal(getMilestoneForStreak(30).name, 'Thunderstorm');
    assert.equal(getMilestoneForStreak(30).icon, 'zap');
    assert.equal(getMilestoneForStreak(59).name, 'Thunderstorm');
    assert.equal(getMilestoneForStreak(60).name, 'Tsunami');
    assert.equal(getMilestoneForStreak(60).icon, 'waves');
    assert.equal(getMilestoneForStreak(89).name, 'Tsunami');
    assert.equal(getMilestoneForStreak(90).name, 'Hurricane');
    assert.equal(getMilestoneForStreak(90).icon, 'wind');
    assert.equal(getMilestoneForStreak(149).name, 'Hurricane');
    assert.equal(getMilestoneForStreak(150).name, 'Volcano');
    assert.equal(getMilestoneForStreak(150).icon, 'mountain');
    assert.equal(getMilestoneForStreak(249).name, 'Volcano');
    assert.equal(getMilestoneForStreak(250).name, 'Solar Storm');
    assert.equal(getMilestoneForStreak(250).icon, 'sun');
    assert.equal(getMilestoneForStreak(364).name, 'Solar Storm');
    assert.equal(getMilestoneForStreak(365).name, 'Cosmic');
    assert.equal(getMilestoneForStreak(365).icon, 'orbit');
    assert.equal(getMilestoneForStreak(729).name, 'Cosmic');
    assert.equal(getMilestoneForStreak(730).name, 'Legendary');
    assert.equal(getMilestoneForStreak(730).icon, 'crown');
    assert.equal(getMilestoneForStreak(1500).name, 'Legendary');
    assert.equal(getMilestoneForStreak(0).name, 'No streak');
    assert.equal(STREAK_MILESTONES.length, 9);
  });
  it('completed days stamp their earned tier (no recoloring of history)', () => {
    const r = applyStreakActivities({ activities: consecutive('2026-08-01', 35), today: '2026-09-04' });
    const byDate = Object.fromEntries(r.days.map((d) => [d.date, d]));
    assert.equal(byDate['2026-08-01'].streakLength, 1);
    assert.equal(byDate['2026-08-01'].tierLevel, 1);
    assert.equal(byDate['2026-08-10'].streakLength, 10);
    assert.equal(byDate['2026-08-10'].tierLevel, 2);
    assert.equal(byDate['2026-08-30'].streakLength, 30);
    assert.equal(byDate['2026-08-30'].tierLevel, 3);
    const cal = buildStreakMonth({ days: r.days, today: '2026-09-04', year: 2026, month: 8 });
    const cell1 = cal.cells.find((c) => c.key === '2026-08-01');
    const cell30 = cal.cells.find((c) => c.key === '2026-08-30');
    assert.equal(cell1.tierLevel, 1);
    assert.equal(cell1.tierName, 'Ember');
    assert.equal(cell1.streakLength, 1);
    assert.equal(cell30.tierLevel, 3);
    assert.equal(cell30.tierName, 'Thunderstorm');
    assert.equal(cell30.streakLength, 30);
  });
  it('day 10 awards exactly one freeze, idempotently', () => {
    const r = applyStreakActivities({ activities: consecutive('2026-09-01', 10), today: '2026-09-10' });
    assert.deepEqual(r.events.awardedMilestones, [{ milestone: 10, freezes: 1, id: 'milestone-10' }]);
    assert.deepEqual(r.claimedMilestones, ['milestone-10']);
    assert.equal(r.summary.freezes.earned, 1);
    const retry = applyStreakActivities({ ...r, activities: [act('2026-09-10', 'another')], today: '2026-09-10' });
    assert.deepEqual(retry.events.awardedMilestones, []);
    assert.equal(retry.summary.freezes.earned, 1);
  });
  it('days 20/30/40 each award, with exact-boundary checks', () => {
    let state = applyStreakActivities({ activities: consecutive('2026-08-01', 19), today: '2026-08-19' });
    assert.deepEqual(state.events.awardedMilestones.map((m) => m.milestone), [10]);
    state = applyStreakActivities({ ...state, activities: [act('2026-08-20', 's19')], today: '2026-08-20' });
    assert.ok(state.events.awardedMilestones.some((m) => m.milestone === 20));
    state = applyStreakActivities({ ...state, activities: consecutive('2026-08-21', 10, 'b'), today: '2026-08-30' });
    assert.ok(state.claimedMilestones.includes('milestone-30'));
    state = applyStreakActivities({ ...state, activities: consecutive('2026-08-31', 10, 'c'), today: '2026-09-09' });
    assert.ok(state.claimedMilestones.includes('milestone-40'));
    assert.equal(state.summary.freezes.earned, 4);
  });
  it('next-milestone progress exposes days remaining', () => {
    const days = Array.from({ length: 27 }, (_, i) => ({ date: addUtcDays('2026-09-01', i), status: 'completed' }));
    const s = summarizeStreak({ days, today: '2026-09-27' });
    assert.equal(s.milestone.name, 'Inferno');
    assert.equal(s.daysToNextTier, 3);
    assert.equal(s.nextTier.name, 'Thunderstorm');
    assert.ok(s.progress > 0 && s.progress <= 1);
  });
  it('getNextMilestone reports the next reward threshold', () => {
    assert.equal(getNextMilestone(27).nextReward.milestone, 30);
    assert.equal(getNextMilestone(40).nextReward.milestone, 50);
  });
});

describe('history and runs', () => {
  it('builds runs across gaps and finds the longest', () => {
    const runs = buildStreakRuns([
      { date: '2026-09-01', status: 'completed' },
      { date: '2026-09-02', status: 'completed' },
      { date: '2026-09-05', status: 'protected' },
      { date: '2026-09-06', status: 'completed' },
      { date: '2026-09-07', status: 'completed' },
    ]);
    assert.deepEqual(runs.map((r) => r.length), [2, 3]);
  });
  it('ignores corrupt day records instead of crashing', () => {
    const s = summarizeStreak({
      days: [{ date: 'not-a-day', status: 'completed' }, { date: '2026-09-24', status: 'weird' }],
      today: '2026-09-24',
    });
    assert.equal(s.totalDays, 0);
    assert.equal(s.current, 0);
  });
});

describe('qualification', () => {
  it('rejects non-learning payloads (no word, bad mode, future)', () => {
    const now = T('2026-09-24T12:00:00Z');
    const out = normalizeStreakAttempts([
      { sessionId: 'a', timestamp: T('2026-09-24T10:00:00Z'), mode: 'dictation' }, // no word
      { sessionId: 'b', timestamp: T('2026-09-24T10:00:00Z'), wordId: 1, mode: 'view' }, // not a mode
      { sessionId: 'c', timestamp: T('2026-09-25T10:00:00Z'), wordId: 1, mode: 'choice' }, // future
      null,
    ], now);
    assert.deepEqual(out, []);
  });
  it('wrong answers still record the learning action (matches review semantics)', () => {
    const out = normalizeStreakAttempts(
      [{ sessionId: 'a', timestamp: T('2026-09-24T10:00:00Z'), wordId: 3, mode: 'artikel', correct: false, xp: 0 }],
      T('2026-09-24T12:00:00Z'),
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].day, '2026-09-24');
  });
});

describe('calendar', () => {
  const days = [
    { date: '2026-09-22', status: 'completed' },
    { date: '2026-09-23', status: 'protected' },
    { date: '2026-09-24', status: 'completed' },
  ];
  it('marks completed/protected/missed/future/today distinctly', () => {
    const cal = buildStreakMonth({ days, today: '2026-09-24', year: 2026, month: 9 });
    const byKey = Object.fromEntries(cal.cells.map((c) => [c.key, c]));
    assert.equal(byKey['2026-09-22'].status, 'completed');
    assert.equal(byKey['2026-09-23'].status, 'protected');
    assert.equal(byKey['2026-09-24'].status, 'completed');
    assert.equal(byKey['2026-09-24'].isToday, true);
    assert.equal(byKey['2026-09-21'].status, 'missed');
    assert.equal(byKey['2026-09-25'].status, 'future');
  });
  it('keeps Gregorian and Shamsi synchronized per cell', () => {
    const cal = buildStreakMonth({ days, today: '2026-09-24', year: 2026, month: 9 });
    const cell = cal.cells.find((c) => c.key === '2026-09-24');
    assert.equal(cell.gregorianDay, 24);
    assert.deepEqual([cell.jalali.jy, cell.jalali.jm, cell.jalali.jd], [1405, 7, 2]);
    assert.ok(cell.jalaliLabel.includes('مهر'));
    assert.ok(cal.jalaliTitle.includes('شهریور') || cal.jalaliTitle.includes('مهر'));
    assert.equal(cal.gregorianTitle, 'September 2026');
  });
  it('uses a Saturday-first RTL week layout', () => {
    // 2026-09-01 is a Tuesday -> Sat Sun Mon before it (3 blanks).
    const cal = buildStreakMonth({ days: [], today: '2026-09-24', year: 2026, month: 9 });
    assert.equal(cal.leadingBlanks, 3);
  });
  it('flags milestone days inside the current run', () => {
    const run = Array.from({ length: 10 }, (_, i) => ({ date: addUtcDays('2026-09-01', i), status: 'completed' }));
    const cal = buildStreakMonth({ days: run, today: '2026-09-10', year: 2026, month: 9 });
    const cell = cal.cells.find((c) => c.key === '2026-09-10');
    assert.equal(cell.isMilestoneDay, true);
    assert.equal(cell.isCurrentRun, true);
  });
});
