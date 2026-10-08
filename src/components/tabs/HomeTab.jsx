import Icon from '../shell/Icon.jsx';
import { getLektionMastery } from '../../utils/progress.js';
import { todayKey, dayStartOf } from '../../utils/selection.js';
import { lekLabel, greeting } from '../../utils/scope.js';

const fmt = (n) => (Number(n) || 0).toLocaleString('de-DE');

export default function HomeTab({
  stats,
  authUser,
  username,
  scopeWords,
  studyQueue,
  weakForScope,
  progressMap,
  selectedBookMeta,
  selectedLektions,
  quizHistory,
  rank,
  go,
}) {
  const dayStart = dayStartOf(todayKey());
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const answeredToday = quizHistory.filter((e) => (e.timestamp || 0) >= dayStart).length;
  const weeklyXp = quizHistory.reduce((sum, e) => ((e.timestamp || 0) >= weekAgo ? sum + (e.xp || 0) : sum), 0);
  const due = studyQueue.length;
  const mastery = getLektionMastery(scopeWords, progressMap);
  const goal = 10;
  const goalPct = Math.min(100, Math.round((answeredToday / goal) * 100));
  const dash = 270;
  const name = authUser?.username || username || '';

  return (
    <div className="page home-page">
      <section className="welcome">
        <div>
          <span className="eyebrow">{greeting(name).toUpperCase()}</span>
          <h1>
            Dein Deutsch
            <br />
            wartet auf dich.
          </h1>
        </div>
        <div className="today-ring">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="43" />
            <circle
              className="filled"
              cx="50"
              cy="50"
              r="43"
              style={{ strokeDasharray: dash, strokeDashoffset: dash - (dash * Math.min(answeredToday, goal)) / goal }}
            />
          </svg>
          <div>
            <Icon name="flame" size={24} />
            <b>{fmt(stats.streak)}</b>
            <small>TAGE</small>
          </div>
        </div>
      </section>

      <section className="daily-card">
        <div className="daily-main">
          <div className="daily-icon">
            <Icon name="cards" size={25} />
            <span>{due > 0 ? due : '✓'}</span>
          </div>
          <div>
            <span className="eyebrow">HEUTE · ~8 MIN</span>
            <h2>Daily Pack</h2>
            <p>
              {due > 0
                ? `${due} fällige Wörter aus deinem aktuellen Lernbereich.`
                : 'Alles fällig — oder ein freier Durchgang zum Wiederholen.'}
            </p>
          </div>
        </div>
        <div className="daily-progress">
          <div>
            <span>Tagesziel</span>
            <b>
              {answeredToday} / {goal} Wörter
            </b>
          </div>
          <div className="progress yellow">
            <span style={{ width: `${goalPct}%` }} />
          </div>
        </div>
        <button className="btn yellow" onClick={() => go('study')}>
          Pack starten <Icon name="arrow" size={18} />
        </button>
      </section>

      <section className="momentum">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DEIN MOMENTUM</span>
            <h2>Stark unterwegs.</h2>
          </div>
          <button className="text-link" onClick={() => go('streak')}>
            Details <Icon name="arrow" size={16} />
          </button>
        </div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon fire">
              <Icon name="flame" />
            </div>
            <b>{fmt(stats.streak)}</b>
            <span>Tagesserie</span>
            <small>{fmt(stats.totalReviews)} Bewertungen gesamt</small>
          </div>
          <div className="stat-card">
            <div className="stat-icon bolt">
              <Icon name="bolt" />
            </div>
            <b>{fmt(stats.xp)}</b>
            <span>Gesamt-XP</span>
            <small>+{fmt(weeklyXp)} diese Woche</small>
          </div>
          <div className="stat-card mastery">
            <div className="stat-icon book">
              <Icon name="book" />
            </div>
            <b>{mastery.masteredPct}%</b>
            <span>{selectedBookMeta?.shortLabel || 'Scope'} gemeistert</span>
            <div className="progress blue">
              <span style={{ width: `${mastery.masteredPct}%` }} />
            </div>
          </div>
        </div>
      </section>

      <section className="continue-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">WEITERMACHEN</span>
            <h2>Was möchtest du tun?</h2>
          </div>
        </div>
        <div className="activity-grid">
          <button className="activity-card quiz-card" onClick={() => go('quiz')}>
            <span className="activity-kicker">EMPFOHLEN · +100 XP</span>
            <div className="activity-symbol">
              <Icon name="quiz" size={28} />
            </div>
            <h3>4-Choice Sprint</h3>
            <p>Der schnellste Weg, Wörter zu festigen.</p>
            <span className="activity-action">
              Quiz starten <Icon name="arrow" size={18} />
            </span>
          </button>
          <button className="activity-card exam-card" onClick={() => go('exam')}>
            <span className="activity-kicker">PRÜFUNGSMODUS</span>
            <div className="activity-symbol">
              <Icon name="exam" size={28} />
            </div>
            <h3>{selectedBookMeta?.shortLabel || 'A1'} Probeprüfung</h3>
            <p>Ruhig, realistisch und ohne Zeitdruck.</p>
            <span className="activity-action">
              Vorbereiten <Icon name="arrow" size={18} />
            </span>
          </button>
        </div>
        <div className="scope-card">
          <div>
            <span className="eyebrow">AKTUELLER LERNBEREICH</span>
            <h3>
              {selectedBookMeta?.label || 'Menschen'} · {lekLabel(selectedLektions)}
            </h3>
            <p>
              {fmt(scopeWords.length)} Wörter · {fmt(due)} fällig · {fmt(weakForScope.length)} schwach
              {rank ? ` · Rang #${rank}` : ''}
            </p>
          </div>
          <button onClick={() => go('books')}>
            Ändern <Icon name="chevron" size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
