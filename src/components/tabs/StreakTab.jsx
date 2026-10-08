import { useCallback, useEffect, useState } from 'react';
import { getStreakCalendar, mergeServerStreak } from '../../db.js';
import { fetchStreakState } from '../../auth.js';
import {
  STREAK_MILESTONES,
  jalaliLabel,
  toPersianDigits,
  utcDayKey,
} from '../../utils/streak.js';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Lock,
  PartyPopper,
  Snowflake,
  Sprout,
} from 'lucide-react';
import CalendarTile from '../streak/CalendarTile.jsx';
import DayDetailSheet from '../streak/DayDetailSheet.jsx';
import TierCelebration from '../streak/TierCelebration.jsx';
import { TierGlyph } from '../streak/TierBadge.jsx';

const WEEKDAY_LETTERS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

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

  const heroEyebrow = summary && summary.milestone.name !== 'No streak'
    ? `${summary.milestone.name.toUpperCase()} · STUFE ${summary.milestone.level}`
    : 'NOCH KEINE SERIE';

  return (
    <div className="page streak-page">
      {tierCelebration && (
        <TierCelebration tier={tierCelebration} streakDays={tierCelebration.streakDays} onDone={handleTierCelebrationDone} />
      )}
      {pendingCelebration && (
        <div className="sk-celebrate-overlay" role="dialog" aria-modal="true" aria-label="Milestone reached">
          <div className="sk-celebrate-card">
            <span className="sk-celebrate-icon">
              <TierGlyph icon={pendingCelebration.icon} size={48} strokeWidth={1.8} />
            </span>
            <h2 className="sk-celebrate-heading">Milestone reached!</h2>
            <div className="sk-celebrate-name">
              <PartyPopper size={18} strokeWidth={1.8} aria-hidden="true" />
              {pendingCelebration.name}
            </div>
            <div lang="fa" dir="rtl" className="sk-celebrate-fa">
              {toPersianDigits(pendingCelebration.milestone)} روز!
              <Snowflake size={14} strokeWidth={1.8} aria-hidden="true" style={{ color: '#0284c7' }} />
              جایزه: {toPersianDigits(pendingCelebration.freezes || 1)} فریز
            </div>
            <div className="sk-celebrate-actions">
              <button type="button" className="btn dark" onClick={() => onCelebrationSeen?.()}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {loading && !payload && (
        <div className="sk-card sk-center">
          <LoaderCircle size={32} strokeWidth={1.8} aria-hidden="true" className="sk-spin" />
          <p className="sk-muted">Loading streak…</p>
        </div>
      )}
      {error && !payload && (
        <div className="sk-card sk-center">
          <p className="sk-error">{error}</p>
        </div>
      )}

      {summary && (
        <>
          <section className="streak-hero">
            <div key={summary.current} className="tier-orb sk-orb-pop" aria-hidden="true">
              <TierGlyph icon={summary.milestone.icon} size={40} strokeWidth={1.8} />
            </div>
            <span className="eyebrow">{heroEyebrow}</span>
            <h1>
              {summary.current} <small>TAGE</small>
            </h1>
            <p lang="fa" dir="rtl">
              {summary.current === 0 ? 'هنوز رکوردی ثبت نشده' : `${toPersianDigits(summary.current)} روز متوالی`}
            </p>
            <div className="tier-progress">
              <div>
                <span>{summary.nextTier ? `Nächste Stufe: ${summary.nextTier.name}` : 'Top-Stufe — legendär'}</span>
                <b>{summary.nextTier ? `${summary.current} / ${summary.nextTier.minDays}` : 'MAX'}</b>
              </div>
              <div className="progress yellow">
                <span style={{ width: `${Math.round(summary.progress * 100)}%` }} />
              </div>
            </div>
          </section>

          <div className="streak-stats">
            <div>
              <span>AKTUELL</span>
              <b>{summary.current}</b>
              <small>Tage</small>
            </div>
            <div>
              <span>BESTWERT</span>
              <b>{summary.longest}</b>
              <small>Tage</small>
            </div>
            <div>
              <span>GESAMT</span>
              <b>{summary.totalDays}</b>
              <small>aktive Tage</small>
            </div>
            <div className="freeze">
              <span>FREESTREAK</span>
              <b>{summary.freezes.balance}</b>
              <small>verfügbar</small>
            </div>
          </div>

          <section className="calendar-card">
            <div className="calendar-head">
              <button type="button" onClick={() => setView((v) => shiftMonth(v, -1))} aria-label="Previous month">
                <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
              </button>
              <div>
                <h2>{month.gregorianTitle}</h2>
                <p lang="fa" dir="rtl">{month.jalaliTitle}</p>
              </div>
              <button type="button" disabled={atCurrentMonth} onClick={() => setView((v) => shiftMonth(v, 1))} aria-label="Next month">
                <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <div className="weekdays" dir="rtl" aria-hidden="true">
              {WEEKDAY_LETTERS.map((w, i) => <span key={i} lang="fa">{w}</span>)}
            </div>
            <div
              key={`${view.y}-${view.m}`}
              className="calendar-grid sk-month-enter"
              dir="rtl"
              role="grid"
              aria-label={`Streak calendar ${month.gregorianTitle}`}
            >
              {Array.from({ length: month.leadingBlanks }).map((_, i) => <span key={`b${i}`} />)}
              {month.cells.map((c) => (
                <CalendarTile key={c.key} cell={c} onSelect={handleSelectCell} />
              ))}
            </div>
            <div className="calendar-legend">
              <span><i className="complete" />Geschafft</span>
              <span><i className="ice" />Freeze</span>
              <span><i className="missed" />Ruhetag</span>
              <span><i className="future" />Zukunft</span>
            </div>
            <p className="sk-cal-note">
              Each completed day keeps the tier it earned — scroll back to watch your evolution. Tap any day for details.
            </p>
          </section>

          <section className="tier-list">
            <div className="section-heading">
              <div>
                <span className="eyebrow">DEINE EVOLUTION</span>
                <h2>Beständigkeit wird sichtbar.</h2>
              </div>
            </div>
            <div className="tier-track">
              {STREAK_MILESTONES.map((t) => {
                const achieved = summary.current >= t.minDays;
                const isActive = achieved && t.level === summary.milestone.level;
                const range = t.maxDays ? `${t.minDays}–${t.maxDays} Tage` : `${t.minDays}+ Tage`;
                return (
                  <div key={t.level} className={isActive ? 'tier active' : achieved ? 'tier done' : 'tier'}>
                    <b>{String(t.level).padStart(2, '0')}</b>
                    <span>
                      {t.name}
                      <small>{range}</small>
                    </span>
                    <i className="sk-tier-side">
                      {t.rewardFreezes > 0 && (
                        <span className="sk-tier-reward">
                          +{t.rewardFreezes}
                          <Snowflake size={11} strokeWidth={1.8} aria-hidden="true" />
                        </span>
                      )}
                      {isActive ? (
                        <TierGlyph icon={t.icon} size={18} strokeWidth={1.8} />
                      ) : achieved ? (
                        <Check size={18} strokeWidth={1.8} aria-hidden="true" />
                      ) : (
                        <Lock size={15} strokeWidth={1.8} aria-hidden="true" />
                      )}
                    </i>
                  </div>
                );
              })}
            </div>
          </section>

          {summary.freezes.earned > 0 && payload.freezeHistory?.length > 0 && (
            <div className="sk-card">
              <span className="sk-card-label">Freeze history</span>
              <div className="sk-history">
                {payload.freezeHistory.slice(0, 8).map((h) => (
                  <div className="sk-history-row" key={h.ref}>
                    <span className="sk-history-left">
                      <Snowflake size={14} strokeWidth={1.8} aria-hidden="true" />
                      {h.type === 'earn' && `+${h.freezes} earned — day ${h.milestone}`}
                      {h.type === 'consume' && 'used — protected a missed day'}
                      {h.type === 'refund' && 'refunded — real activity arrived'}
                    </span>
                    <span className="sk-history-date">
                      {h.date || (h.milestone ? `day ${h.milestone}` : '')}
                      {h.date ? ` • ${jalaliLabel(`${h.date}T12:00:00Z`)}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.totalDays === 0 && (
            <div className="sk-card sk-empty">
              <span className="sk-empty-icon">
                <Sprout size={28} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p>
                Finish a pack, quiz, or game to plant your first streak day. Opening the app alone doesn&apos;t count.
              </p>
              <p lang="fa" dir="rtl">یک بسته، کوئیز یا بازی را کامل کن تا اولین روز ثبت شود.</p>
            </div>
          )}
        </>
      )}

      <div className="sk-footnote">
        Today (UTC): {nowKey} • days are UTC calendar days
      </div>
      {selectedCell && <DayDetailSheet cell={selectedCell} onClose={() => setSelectedCell(null)} />}
    </div>
  );
}
