import { useCallback, useEffect, useState } from 'react';
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
import {
  StreakTierIcon,
  getIconByName,
  Snowflake,
  LoaderCircle,
  Sprout,
  Trophy,
  CheckCircle2,
  PartyPopper,
  ChevronLeft,
  ChevronRight,
  ICON_SIZES,
} from '../icons.jsx';
import CalendarTile from '../streak/CalendarTile.jsx';
import TierBadge from '../streak/TierBadge.jsx';
import DayDetailSheet from '../streak/DayDetailSheet.jsx';
import TierCelebration from '../streak/TierCelebration.jsx';

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

function tierSeenKey(level) {
  return `gs_tier_seen_${level}`;
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
  const [selectedCell, setSelectedCell] = useState(null);
  const [tierCelebration, setTierCelebration] = useState(null);

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

  // One-time fullscreen celebration when a tier threshold is crossed.
  useEffect(() => {
    if (!summary || summary.current <= 0) return;
    const tier = summary.milestone;
    if (!tier || tier.name === 'No streak') return;
    if (summary.current !== tier.minDays) return;
    try {
      if (localStorage.getItem(tierSeenKey(tier.level))) return;
    } catch { return; }
    setTierCelebration({ ...tier, streakDays: summary.current });
  }, [summary]);

  const handleTierCelebrationDone = useCallback(() => {
    if (tierCelebration) {
      try { localStorage.setItem(tierSeenKey(tierCelebration.level), '1'); } catch {}
    }
    setTierCelebration(null);
  }, [tierCelebration]);

  const handleSelectCell = useCallback((cell) => {
    setSelectedCell(cell);
  }, []);

  return (
    <Block paddingTop="16px">
      {tierCelebration && (
        <TierCelebration tier={tierCelebration} streakDays={tierCelebration.streakDays} onDone={handleTierCelebrationDone} />
      )}
      {pendingCelebration && (
        <div className="gs-celebrate-overlay" role="dialog" aria-modal="true" aria-label="Milestone reached">
          <div className="gs-celebrate-card">
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span style={{ display: 'inline-flex', padding: 12, borderRadius: 999, background: '#fef3c7' }}>
                <StreakTierIcon level={pendingCelebration.level} iconName={pendingCelebration.icon} size={48} />
              </span>
            </div>
            <Heading $style={{ fontSize: 20, margin: '12px 0 4px' }}>Milestone reached!</Heading>
            <div style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <PartyPopper size={18} aria-hidden="true" style={{ color: '#f59e0b' }} />
              {pendingCelebration.name}
            </div>
            <div lang="fa" dir="rtl" style={{ fontFamily: 'IRANSans', fontSize: 13, color: '#4b4b58', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              {toPersianDigits(pendingCelebration.milestone)} روز!
              <Snowflake size={14} aria-hidden="true" style={{ color: '#0284c7' }} />
              جایزه: {toPersianDigits(pendingCelebration.freezes || 1)} فریز
            </div>
            <Block marginTop="16px">
              <Button shape={SHAPE.pill} onClick={() => onCelebrationSeen?.()}>Continue</Button>
            </Block>
          </div>
        </div>
      )}

      {loading && !payload && (
        <UberCard styleOverride={{ textAlign: 'center', paddingTop: '28px', paddingBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LoaderCircle size={32} aria-hidden="true" className="gs-spin" style={{ color: '#f97316' }} />
          </div>
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
            <div key={summary.current} className="gs-streak-pop" style={{ display: 'flex', justifyContent: 'center', lineHeight: 1 }}>
              <StreakTierIcon level={summary.milestone.level} iconName={summary.milestone.icon} size={52} />
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-1px', marginTop: 4 }}>
              {summary.current} <span style={{ fontSize: 15, fontWeight: 700, opacity: 0.75 }}>DAYS</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
              <TierBadge level={summary.milestone.level} name={summary.milestone.name} icon={summary.milestone.icon} />
            </div>
            <div lang="fa" dir="rtl" style={{ fontFamily: 'IRANSans', fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              {summary.current === 0 ? 'هنوز رکوردی ثبت نشده' : `${toPersianDigits(summary.current)} روز متوالی`}
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.16)', borderRadius: 999, marginTop: 12, overflow: 'hidden' }}>
              <div className="gs-bar-fill" style={{ height: '100%', width: `${Math.round(summary.progress * 100)}%`, background: 'linear-gradient(90deg,#fb923c,#ef4444)', borderRadius: 999 }} />
            </div>
            <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {summary.nextTier ? (
                <>
                  <span>{summary.daysToNextTier} day{summary.daysToNextTier === 1 ? '' : 's'} until {summary.nextTier.name}</span>
                  <StreakTierIcon level={summary.nextTier.level} iconName={summary.nextTier.icon} size={16} />
                </>
              ) : (
                <>
                  <span>Top tier — legendary</span>
                  <Trophy size={16} aria-hidden="true" style={{ color: '#f59e0b' }} />
                </>
              )}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 800 }}>
              <Snowflake size={16} aria-hidden="true" style={{ color: '#7dd3fc' }} />
              <span>{summary.freezes.balance}</span>
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
              <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={() => setView((v) => shiftMonth(v, -1))} aria-label="Previous month"><ChevronLeft size={14} aria-hidden="true" /> <span lang="fa">قبل</span></Button>
              <Block display="flex" flexDirection="column" alignItems="center">
                <LabelSmall>{month.gregorianTitle}</LabelSmall>
                <div lang="fa" dir="rtl" style={{ fontFamily: 'IRANSans', fontSize: 13, fontWeight: 700 }}>{month.jalaliTitle}</div>
              </Block>
              <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} disabled={atCurrentMonth} onClick={() => setView((v) => shiftMonth(v, 1))} aria-label="Next month"><span lang="fa">بعد</span> <ChevronRight size={14} aria-hidden="true" /></Button>
            </Block>
            <div className="gs-cal-grid gs-cal-weekdays" dir="rtl" aria-hidden="true">
              {PERSIAN_WEEKDAYS.map((w) => <span key={w} lang="fa">{w.slice(0, 3)}</span>)}
            </div>
            <div key={`${view.y}-${view.m}`} className="gs-cal-grid gs-cal-month-enter" dir="rtl" role="grid" aria-label={`Streak calendar ${month.gregorianTitle}`}>
              {Array.from({ length: month.leadingBlanks }).map((_, i) => <span key={`b${i}`} />)}
              {month.cells.map((c) => (
                <CalendarTile key={c.key} cell={c} onSelect={handleSelectCell} />
              ))}
            </div>
            <Block display="flex" gridGap="12px" marginTop="8px" flexWrap>
              {[
                ['evolution', 'Evolution timeline', 'linear-gradient(135deg,#f97316,#8b5cf6)', null],
                ['protected', 'Freeze', '#0284c7', Snowflake],
                ['missed', 'Rest', '#d4d4d8', null],
                ['future', 'Future', '#f4f4f5', null],
              ].map(([k, label, color, Icon]) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6b6b7a' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block' }} />{label}
                  {Icon && <Icon size={12} aria-hidden="true" style={{ color }} />}
                </span>
              ))}
            </Block>
            <ParagraphSmall color="#9aa0b2" margin="8px 0 0">Each completed day keeps the tier it earned — scroll back to watch your evolution. Tap any day for details.</ParagraphSmall>
          </UberCard>

          <UberCard styleOverride={{ marginTop: '8px' }}>
            <LabelSmall>Evolution tiers</LabelSmall>
            <Block display="flex" flexDirection="column" gridGap="8px" marginTop="8px">
              {STREAK_MILESTONES.map((t) => {
                const achieved = summary.current >= t.minDays;
                const TierIcon = getIconByName(t.icon);
                return (
                  <Block key={t.level} display="flex" justifyContent="space-between" alignItems="center">
                    <span style={{ fontSize: 13, fontWeight: achieved ? 800 : 400, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <TierIcon size={ICON_SIZES.card} aria-hidden="true" style={{ color: achieved ? '#f97316' : '#9aa0b2', flexShrink: 0 }} />
                      {t.name} <span style={{ color: '#9aa0b2' }}>{t.minDays}{t.maxDays ? `–${t.maxDays}` : '+'}</span>
                    </span>
                    <span style={{ fontSize: 12, color: achieved ? '#16a34a' : '#9aa0b2', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {t.rewardFreezes ? (
                        <>
                          +{t.rewardFreezes}
                          <Snowflake size={12} aria-hidden="true" />
                        </>
                      ) : '—'}
                      {achieved && <CheckCircle2 size={14} aria-hidden="true" style={{ color: '#16a34a' }} />}
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
                    <span style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Snowflake size={14} aria-hidden="true" style={{ color: '#0284c7' }} />
                      {h.type === 'earn' && `+${h.freezes} earned — day ${h.milestone}`}
                      {h.type === 'consume' && `used — protected a missed day`}
                      {h.type === 'refund' && `refunded — real activity arrived`}
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
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                <span style={{ display: 'inline-flex', padding: 12, borderRadius: 999, background: '#f0fdf4' }}>
                  <Sprout size={28} aria-hidden="true" style={{ color: '#16a34a' }} />
                </span>
              </div>
              <ParagraphSmall color="#6b6b7a">
                Finish a pack, quiz, or game to plant your first streak day. Opening the app alone doesn&apos;t count.
              </ParagraphSmall>
              <ParagraphSmall lang="fa" dir="rtl" color="#6b6b6b">یک بسته، کوئیز یا بازی را کامل کن تا اولین روز ثبت شود.</ParagraphSmall>
            </UberCard>
          )}
        </>
      )}
      <div style={{ fontSize: 11, color: '#9aa0b2', textAlign: 'center', marginTop: 12 }}>
        Today (UTC): {nowKey} • days are UTC calendar days
      </div>
      {selectedCell && <DayDetailSheet cell={selectedCell} onClose={() => setSelectedCell(null)} />}
    </Block>
  );
}
