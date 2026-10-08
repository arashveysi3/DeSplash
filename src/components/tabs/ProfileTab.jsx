import Icon from '../shell/Icon.jsx';
import { Zap, Flame, Target, Medal, BookOpen, Star } from 'lucide-react';
import { BOOKS } from '../../data/menschen.js';
import { getBookMastery, getLektionMastery } from '../../utils/progress.js';
import { fetchOnlineLeaderboard } from '../../db.js';

function MetricCard({ icon: Icon, label, value, color = '#0f0f12', bg = '#f7f7fb' }) {
  return (
    <div className="prf-metric">
      <span className="prf-metric-icon" style={{ background: bg, color }}>
        <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div>
        <span className="prf-metric-label">{label}</span>
        <b>{value}</b>
      </div>
    </div>
  );
}

export default function ProfileTab({ authUser, stats, selectedBookMeta, selectedLektions, scopeWords, progressMap, allWords, weakForScope, weakWords, setAuthMode, setShowAuth, handleLogout, setToast, setOnlineBoard, setUseOnline }) {
  if (!authUser) {
    return (
      <div className="page prf-page">
        <div className="page-title-row">
          <div>
            <span className="eyebrow">DEIN PROFIL</span>
            <h1>Profil</h1>
            <p>Synchronisiere deinen Fortschritt über Geräte.</p>
          </div>
        </div>
        <div className="prf-guest">
          <div className="prf-guest-icon">
            <Icon name="user" size={44} />
          </div>
          <h2>Not logged in</h2>
          <p>Sign up to save your XP, streak and weak words online. Works offline too.</p>
          <div className="prf-guest-actions">
            <button
              type="button"
              className="btn dark"
              onClick={() => {
                setAuthMode('login');
                setShowAuth(true);
              }}
            >
              Login
            </button>
            <button
              type="button"
              className="btn light"
              onClick={() => {
                setAuthMode('signup');
                setShowAuth(true);
              }}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    );
  }

  const m = getLektionMastery(scopeWords, progressMap);

  return (
    <div className="page prf-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">DEIN PROFIL</span>
          <h1>Profil</h1>
          <p>{selectedBookMeta?.label} · {selectedLektions.length ? selectedLektions.join(', ') : 'Ganzes Buch'}</p>
        </div>
      </div>

      <section className="prf-banner">
        <div className="prf-avatar">{authUser.username.slice(0, 2).toUpperCase()}</div>
        <div className="prf-banner-copy">
          <h2>
            {authUser.username} {authUser.isAdmin && <span className="prf-admin">ADMIN</span>}
          </h2>
          <p>{authUser.email || 'No email'} • Joined {new Date(authUser.createdAt).toLocaleDateString()}</p>
          <p className="prf-stats">
            <span>{selectedBookMeta?.label} •</span>
            <span><Icon name="bolt" size={14} /> {stats.xp} XP •</span>
            <span><Flame size={14} strokeWidth={1.8} style={{ color: '#fb923c' }} aria-hidden="true" /> {stats.streak} streak •</span>
            <span>{stats.totalReviews} reviews</span>
          </p>
        </div>
        <div className="prf-actions">
          <button type="button" className="btn light small" onClick={handleLogout}>
            Logout
          </button>
          <button
            type="button"
            className="btn light small"
            onClick={async () => {
              const b = await fetchOnlineLeaderboard();
              if (b) setOnlineBoard(b);
              setUseOnline(true);
              setToast('Synced');
              setTimeout(() => setToast(null), 1200);
            }}
          >
            Sync XP
          </button>
        </div>
      </section>

      <section className="prf-progress">
        <div className="prf-progress-head">
          <span className="eyebrow">PROGRESS — {selectedBookMeta?.label} {selectedLektions.length ? selectedLektions.join(', ') : 'Whole book'}</span>
          <div className="prf-pct">
            <b>{m.pct}% <span>seen</span></b>
            <span className="prf-mas">• {m.masteredPct}% mas.</span>
          </div>
        </div>
        <div className="prf-mini">
          {m.seen}/{m.total} seen • {m.mastered} <Star size={12} strokeWidth={1.8} style={{ color: '#eab308' }} aria-hidden="true" />
        </div>
        <div className="progress">
          <span style={{ width: `${m.pct}%` }} />
        </div>
        <div className="progress green">
          <span style={{ width: `${m.masteredPct}%` }} />
        </div>
        <p className="prf-note">{m.masteredPct >= 80 ? 'Mastered! Try next Lektion.' : `Study to see green grow — ${80 - m.masteredPct}% mastered to unlock`}</p>
      </section>

      <div className="prf-books">
        {BOOKS.map((b) => {
          const bm = getBookMastery(b.id, allWords, progressMap);
          return (
            <div key={b.id} className="prf-book" style={{ background: b.gradient }}>
              <span className="eyebrow">{b.label}</span>
              <b>{bm.pct}% <small>seen</small></b>
              <span className="prf-book-seen">
                {bm.seen}/{bm.total} seen • {bm.mastered} <Star size={11} strokeWidth={1.8} aria-hidden="true" /> {bm.masteredPct}% mas.
              </span>
            </div>
          );
        })}
      </div>

      <section className="prf-card">
        <span className="eyebrow">STATS</span>
        <div className="prf-metrics">
          <MetricCard icon={Zap} label="Total XP" value={stats.xp} color="#eab308" bg="#fefce8" />
          <MetricCard icon={Flame} label="Day streak" value={stats.streak} color="#f97316" bg="#fff7ed" />
          <MetricCard icon={Target} label="Weak in scope" value={weakForScope.length} color="#dc2626" bg="#fef2f2" />
          <MetricCard icon={Medal} label="Mastered words" value={allWords.filter((w) => progressMap[w.id]?.interval >= 14).length} color="#16a34a" bg="#f0fdf4" />
          <MetricCard icon={BookOpen} label="Learned words" value={Object.keys(progressMap).length} color="#4f46e5" bg="#eef2ff" />
        </div>
        <div className="prf-rows">
          <span>Total weak</span>
          <b>{weakWords.length}</b>
        </div>
        <div className="prf-rows">
          <span>Custom cards</span>
          <b>{allWords.filter((w) => w.isCustom).length}</b>
        </div>
        <div className="prf-rows">
          <span>Total words</span>
          <b>{allWords.length}</b>
        </div>
        <div className="prf-sync">
          <Icon name="check" size={14} style={{ color: '#16a34a' }} />
          <span>Progress syncs across devices when logged in</span>
        </div>
      </section>
    </div>
  );
}