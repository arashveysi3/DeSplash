import Icon from '../shell/Icon.jsx';
import { Medal, Flame } from 'lucide-react';
import { fetchOnlineLeaderboard, submitOnlineScore, deleteOnlineScore, resetOnlineBoard } from '../../db.js';

const RANK_ICON_COLORS = ['#eab308', '#9aa0b2', '#b45309'];

export default function BoardTab({ leaderboard, stats, username, setUsername, onlineBoard, onlineError, setOnlineError, useOnline, setUseOnline, adminMode, setAdminMode, adminToken, setAdminToken, setOnlineBoard, setToast, selectedBookMeta }) {
  return (
    <div className="page brd-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">RANGLISTE</span>
          <h1>Leaderboard</h1>
          <p>Lokal oder online — dein Fortschritt im Vergleich.</p>
        </div>
      </div>

      <section className="brd-hero">
        <div className="brd-hero-top">
          <div>
            <span className="eyebrow">YOUR RANK</span>
            <div className="brd-rank">#{leaderboard.rank} <span>/ {leaderboard.all.length}</span></div>
            <div className="brd-sub">
              <span>{selectedBookMeta?.label} • {stats.xp} XP • {stats.totalReviews} reviews •</span>
              <span className="brd-streak">
                <Flame size={14} strokeWidth={1.8} style={{ color: '#fb923c' }} aria-hidden="true" /> {stats.streak} streak
              </span>
            </div>
          </div>
          <div className="brd-xp">
            <b><Icon name="bolt" size={18} />{stats.xp}</b>
            <span>TOTAL XP</span>
          </div>
        </div>
        <div className="brd-meta">
          <span>{Math.max(0, (leaderboard.all[0]?.xp || 0) - stats.xp)} XP to #1</span>
          <b>Season ends in 12 days</b>
        </div>
        <div className="brd-sync">
          <input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              localStorage.setItem('gs_username', e.target.value);
            }}
            placeholder="Your name"
          />
          <button
            type="button"
            className="btn light small"
            onClick={async () => {
              if (!username.trim()) {
                setOnlineError('Enter a name first');
                setTimeout(() => setOnlineError(null), 1500);
                return;
              }
              const b = await submitOnlineScore(username.trim(), stats.xp);
              if (b) {
                setOnlineBoard(b);
                setUseOnline(true);
                setToast('Score synced online');
              } else {
                setOnlineError('Online not configured');
              }
              setTimeout(() => setToast(null), 1500);
              setTimeout(() => setOnlineError(null), 2500);
            }}
          >
            Sync
          </button>
        </div>
        {onlineError && <p className="brd-error">{onlineError}</p>}
        <div className="brd-toggle">
          <div className="book-toggle" role="group" aria-label="Ranglistenquelle">
            <button type="button" className={!useOnline ? 'active' : ''} onClick={() => setUseOnline(false)}>
              Local
            </button>
            <button
              type="button"
              className={useOnline ? 'active' : ''}
              onClick={async () => {
                const b = await fetchOnlineLeaderboard();
                if (b) {
                  setOnlineBoard(b);
                  setUseOnline(true);
                } else setOnlineError('Online not available');
                setTimeout(() => setOnlineError(null), 3000);
              }}
            >
              Online {onlineBoard && <Icon name="check" size={12} />}
            </button>
          </div>
          <span className="brd-mode">{useOnline ? 'Synced board' : 'Local mock board'}</span>
        </div>
      </section>

      <div className="brd-list">
        {leaderboard.all.map((p, i) => {
          const mine = p.name.toLowerCase() === (username || 'You').toLowerCase();
          return (
            <div key={p.name} className={`brd-row${mine ? ' mine' : ''}`}>
              <span className="brd-num">#{i + 1}</span>
              <span className="brd-ava">{p.avatar}</span>
              <div className="brd-name">
                <b>{p.name} {mine && '• You'}</b>
                <small>{p.xp} XP</small>
              </div>
              {i < 3 && (
                <span className="brd-trophy">
                  {i === 0 ? (
                    <Icon name="trophy" size={18} style={{ color: RANK_ICON_COLORS[0] }} />
                  ) : (
                    <Medal size={18} strokeWidth={1.8} style={{ color: RANK_ICON_COLORS[i] }} aria-hidden="true" />
                  )}
                </span>
              )}
              {adminMode && (
                <button
                  type="button"
                  className="brd-del"
                  onClick={async () => {
                    const b = await deleteOnlineScore(p.name, adminToken);
                    if (b) {
                      setOnlineBoard(b);
                      setToast(`Deleted ${p.name}`);
                    } else setOnlineError('Delete failed');
                    setTimeout(() => setToast(null), 1500);
                    setTimeout(() => setOnlineError(null), 2000);
                  }}
                  aria-label={`${p.name} löschen`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="brd-admin-bar">
        <button type="button" className="btn light small" onClick={() => setAdminMode(!adminMode)}>
          {adminMode ? 'Exit admin' : 'Admin'}
        </button>
        {adminMode && <span className="brd-hint">Admin: tap × to delete</span>}
      </div>

      {adminMode && (
        <div className="brd-admin">
          <span className="eyebrow">ADMIN</span>
          <input
            value={adminToken}
            onChange={(e) => {
              setAdminToken(e.target.value);
              localStorage.setItem('gs_admin_token', e.target.value);
            }}
            placeholder="Admin token"
          />
          <div className="brd-admin-actions">
            <button
              type="button"
              className="btn light small"
              onClick={async () => {
                const b = await resetOnlineBoard(adminToken);
                if (b) {
                  setOnlineBoard(b);
                  setUseOnline(true);
                  setToast('Board reset');
                } else setOnlineError('Reset failed');
                setTimeout(() => setOnlineError(null), 2000);
                setTimeout(() => setToast(null), 1500);
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn light small"
              onClick={async () => {
                const b = await fetchOnlineLeaderboard();
                if (b) setOnlineBoard(b);
                setUseOnline(true);
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}