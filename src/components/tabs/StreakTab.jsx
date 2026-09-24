import { useEffect, useState } from 'react';
import { Block } from 'baseui/block';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { Heading } from 'baseui/heading';
import { LabelSmall, ParagraphSmall } from 'baseui/typography';
import { getStreakCalendar, mergeServerStreak } from '../../db.js';
import { fetchStreakState } from '../../auth.js';
import {
  PERSIAN_WEEKDAYS,
  STREAK_MILESTONES,
  jalaliLabel,
  toPersianDigits,
  utcDayKey,
} from '../../utils/streak.js';
import UberCard from '../cards/UberCard.jsx';

function monthRange(year, month) {
  const m = String(month).padStart(2, '0');
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${year}-${m}-01`,
    end: `${year}-${m}-${String(daysInMonth).padStart(2, '0')}`,
  };
}

function shiftMonth(view, delta) {
  const d = new Date(Date.UTC(view.y, view.m - 1 + delta, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
}

export default function StreakTab({ authToken, refreshKey, pendingCelebration, onCelebrationSeen }) {
  const [nowKey] = useState(() => utcDayKey(Date.now()));
  const [view, setView] = useState(() => {
    const d = new Date();
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
  });
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cal = await getStreakCalendar({ year: view.y, month: view.m });
        if (cancelled) return;
        setPayload(cal);
        if (authToken) {
          // Confirm against the server-authoritative state when logged in.
          const { start, end } = monthRange(view.y, view.m);
          const server = await fetchStreakState({ start, end });
          if (server?.ok) {
            await mergeServerStreak(server);
            const confirmed = await getStreakCalendar({ year: view.y, month: view.m });
            if (!cancelled) setPayload(confirmed);
          }
        }
      } catch {
        if (!cancelled) setError('Could not load streak — try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [view.y, view.m, refreshKey, authToken]);

  const summary = payload?.summary || null;
  const month = payload?.month || null;
  const curY = new Date().getUTCFullYear();
  const curM = new Date().getUTCMonth() + 1;
  const atCurrentMonth = view.y === curY && view.m === curM;

  return (
    <Block paddingTop="16px">
      {pendingCelebration && (
        <div className="gs-celebrate-overlay" role="dialog" aria-modal="true" aria-label="Milestone reached">
          <div className="gs-celebrate-card">
            <div style={{ fontSize: 56, lineHeight: 1 }}>{pendingCelebration.icon || '🔥'}</div>
            <Heading $style={{ fontSize: 20, margin: '12px 0 4px' }}>Milestone reached!</Heading>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{pendingCelebration.name}</div>
            <div lang="fa" dir="rtl" style={{ fontFamily: 'IRANSans', fontSize: 13, color: '#4b4b58', marginTop: 6 }}>
              {toPersianDigits(pendingCelebration.milestone)} روز! ❄️ جایزه: {toPersianDigits(pendingCelebration.freezes || 1)} فریز
            </div>
            <Block marginTop="16px">
              <Button shape={SHAPE.pill} onClick={() => onCelebrationSeen?.()}>Continue</Button>
            </Block>
          </div>
        </div>
      )}

      {loading && !payload && (
        <UberCard styleOverride={{ textAlign: 'center', paddingTop: '28px', paddingBottom: '28px' }}>
          <div style={{ fontSize: 32 }}>🔥</div>
          <ParagraphSmall color="#6b6b7a">Loading streak…</ParagraphSmall>
        </UberCard>
      )}
      {error && !payload && (
        <UberCard styleOverride={{ textAlign: 'center' }}>
          <ParagraphSmall color="#b91c1c">{error}</ParagraphSmall>
        </UberCard>
      )}

      {summary && (
        <>
          <UberCard styleOverride={{ backgroundColor: '#0f0f12', color: '#fff', borderWidth: 0, borderRadius: '20px', textAlign: 'center' }}>
            <div key={summary.current} className="gs-streak-pop" style={{ fontSize: 52, lineHeight: 1 }}>
              {summary.milestone.icon}
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-1px', marginTop: 4 }}>
              {summary.current} <span style={{ fontSize: 15, fontWeight: 700, opacity: 0.75 }}>DAYS</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{summary.milestone.name}</div>
            <div lang="fa" dir="rtl" style={{ fontFamily: 'IRANSans', fontSize: 12, opacity: 0.7, marginTop: 2 }}>
              {summary.current === 0 ? 'هنوز رکوردی ثبت نشده' : `${toPersianDigits(summary.current)} روز متوالی`}
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.16)', borderRadius: 999, marginTop: 12, overflow: 'hidden' }}>
              <div className="gs-bar-fill" style={{ height: '100%', width: `${Math.round(summary.progress * 100)}%`, background: 'linear-gradient(90deg,#fb923c,#ef4444)', borderRadius: 999 }} />
            </div>
            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85 }}>
              {summary.nextTier ? `${summary.daysToNextTier} day${summary.daysToNextTier === 1 ? '' : 's'} until ${summary.nextTier.icon} ${summary.nextTier.name}` : 'Top tier — legendary 🏆'}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 800 }}>
              <span>❄️ {summary.freezes.balance}</span>
              <span lang="fa" dir="rtl" style={{ fontFamily: 'IRANSans', fontWeight: 400, fontSize: 12, opacity: 0.8 }}>فریز</span>
            </div>
          </UberCard>

          <Block display="flex" gridGap="8px" marginTop="8px">
            {[
              { label: 'Current', value: summary.current },
              { label: 'Longest', value: summary.longest },
              { label: 'Total days', value: summary.totalDays },
            ].map((s) => (
              <UberCard key={s.label} styleOverride={{ flex: 1, textAlign: 'center', paddingTop: '12px', paddingBottom: '12px' }}>
                <LabelSmall>{s.label}</LabelSmall>
                <div style={{ fontWeight: 900, fontSize: 22 }}>{s.value}</div>
              </UberCard>
            ))}
          </Block>

          <UberCard styleOverride={{ marginTop: '8px' }}>
            <Block display="flex" justifyContent="space-between" alignItems="center">
              <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={() => setView((v) => shiftMonth(v, -1))} aria-label="Previous month">→ <span lang="fa">قبل</span></Button>
              <Block display="flex" flexDirection="column" alignItems="center">
                <LabelSmall>{month.gregorianTitle}</LabelSmall>
                <div lang="fa" dir="rtl" style={{ fontFamily: 'IRANSans', fontSize: 13, fontWeight: 700 }}>{month.jalaliTitle}</div>
              </Block>
              <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} disabled={atCurrentMonth} onClick={() => setView((v) => shiftMonth(v, 1))} aria-label="Next month"><span lang="fa">بعد</span> ←</Button>
            </Block>
            <div className="gs-cal-grid gs-cal-weekdays" dir="rtl" aria-hidden="true">
              {PERSIAN_WEEKDAYS.map((w) => <span key={w} lang="fa">{w.slice(0, 3)}</span>)}
            </div>
            <div className="gs-cal-grid" dir="rtl" role="grid" aria-label={`Streak calendar ${month.gregorianTitle}`}>
              {Array.from({ length: month.leadingBlanks }).map((_, i) => <span key={`b${i}`} />)}
              {month.cells.map((c) => (
                <div
                  key={c.key}
                  role="gridcell"
                  aria-label={`${c.key}: ${c.status}`}
                  title={`${c.key} • ${c.jalaliLabel}${c.isMilestoneDay ? ' • milestone' : ''}`}
                  className={`gs-cal-cell gs-cal-${c.status}${c.isToday ? ' gs-cal-today' : ''}${c.isCurrentRun ? ' gs-cal-run' : ''}${c.isMilestoneDay ? ' gs-cal-milestone' : ''}`}
                >
                  <span className="gs-cal-g">{c.gregorianDay}</span>
                  <span className="gs-cal-j" lang="fa">{toPersianDigits(c.jalali.jd)}</span>
                </div>
              ))}
            </div>
            <Block display="flex" gridGap="12px" marginTop="8px" flexWrap>
              {[['done', 'Completed', '#16a34a'], ['protected', 'Freeze ❄️', '#0284c7'], ['missed', 'Missed', '#d4d4d8'], ['future', 'Future', '#f4f4f5']].map(([k, label, color]) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6b6b7a' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block' }} />{label}
                </span>
              ))}
            </Block>
          </UberCard>

          <UberCard styleOverride={{ marginTop: '8px' }}>
            <LabelSmall>Milestones</LabelSmall>
            <Block display="flex" flexDirection="column" gridGap="6px" marginTop="8px">
              {STREAK_MILESTONES.map((t) => {
                const achieved = summary.current >= t.minDays;
                return (
                  <Block key={t.level} display="flex" justifyContent="space-between" alignItems="center">
                    <span style={{ fontSize: 13, fontWeight: achieved ? 800 : 400 }}>
                      {t.icon} {t.name} <span style={{ color: '#9aa0b2' }}>{t.minDays}–{t.maxDays}</span>
                    </span>
                    <span style={{ fontSize: 12, color: achieved ? '#16a34a' : '#9aa0b2' }}>
                      {t.rewardFreezes ? `+${t.rewardFreezes} ❄️` : '—'} {achieved ? '✓' : ''}
                    </span>
                  </Block>
                );
              })}
            </Block>
          </UberCard>

          {summary.freezes.earned > 0 && payload.freezeHistory?.length > 0 && (
            <UberCard styleOverride={{ marginTop: '8px' }}>
              <LabelSmall>Freeze history</LabelSmall>
              <Block display="flex" flexDirection="column" gridGap="6px" marginTop="8px">
                {payload.freezeHistory.slice(0, 8).map((h) => (
                  <Block key={h.ref} display="flex" justifyContent="space-between" alignItems="center">
                    <span style={{ fontSize: 13 }}>
                      {h.type === 'earn' && `+${h.freezes} ❄️ earned — day ${h.milestone}`}
                      {h.type === 'consume' && `❄️ used — protected a missed day`}
                      {h.type === 'refund' && `❄️ refunded — real activity arrived`}
                    </span>
                    <span style={{ fontSize: 11, color: '#9aa0b2' }}>
                      {h.date || (h.milestone ? `day ${h.milestone}` : '')}
                      {h.date ? ` • ${jalaliLabel(`${h.date}T12:00:00Z`)}` : ''}
                    </span>
                  </Block>
                ))}
              </Block>
            </UberCard>
          )}

          {summary.totalDays === 0 && (
            <UberCard styleOverride={{ marginTop: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: 28 }}>🌱</div>
              <ParagraphSmall color="#6b6b7a">
                Finish a pack, quiz, or game to plant your first streak day. Opening the app alone doesn&apos;t count.
              </ParagraphSmall>
              <ParagraphSmall lang="fa" dir="rtl" color="#6b6b7a">یک بسته، کوئیز یا بازی را کامل کن تا اولین روز ثبت شود.</ParagraphSmall>
            </UberCard>
          )}
        </>
      )}
      <div style={{ fontSize: 11, color: '#9aa0b2', textAlign: 'center', marginTop: 12 }}>
        Today (UTC): {nowKey} • days are UTC calendar days
      </div>
    </Block>
  );
}
