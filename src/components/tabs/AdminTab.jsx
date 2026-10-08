import Icon from '../shell/Icon.jsx';
import { resetOnlineBoard, fetchOnlineLeaderboard } from '../../db.js';
import { deleteUser } from '../../auth.js';

export default function AdminTab({ authUser, usersList, loadUsersList, setToast, setOnlineBoard, setUseOnline, adminToken }) {
  return (
    <div className="page adm-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">ADMIN</span>
          <h1>Nutzerverwaltung</h1>
          <p>Konten, Punktestände und Rangliste.</p>
        </div>
      </div>

      <section className="adm-card">
        <h2>Admin — User management</h2>
        <p>You are admin ({authUser.username}).</p>
        <div className="adm-actions">
          <button type="button" className="btn dark" onClick={loadUsersList}>
            <Icon name="refresh" size={16} /> Refresh users
          </button>
          <button
            type="button"
            className="btn light"
            onClick={async () => {
              const b = await resetOnlineBoard(adminToken);
              if (b) {
                setOnlineBoard(b);
                setUseOnline(true);
                setToast('Leaderboard reset');
              }
              setTimeout(() => setToast(null), 1500);
            }}
          >
            Reset board
          </button>
        </div>
      </section>

      <div className="adm-list">
        {usersList.length === 0 ? (
          <p className="adm-empty">No users loaded. Tap Refresh.</p>
        ) : (
          usersList.map((u) => (
            <div key={u.username} className="adm-row">
              <div>
                <b>
                  {u.username} {u.isAdmin && <span className="adm-chip">admin</span>} <span className="adm-sub">• {u.xp} XP • {u.email || 'no email'}</span>
                </b>
                <p>Joined {new Date(u.createdAt).toLocaleDateString()} • {u.streak || 0} streak • {u.totalReviews || 0} reviews</p>
              </div>
              <button
                type="button"
                className="adm-del"
                onClick={async () => {
                  if (!confirm(`Delete ${u.username}?`)) return;
                  const r = await deleteUser(u.username);
                  if (r) {
                    const b = await fetchOnlineLeaderboard();
                    if (b) setOnlineBoard(b);
                    setToast(`Deleted ${u.username}`);
                    setTimeout(() => setToast(null), 1500);
                  } else {
                    setToast('Delete failed');
                    setTimeout(() => setToast(null), 1500);
                  }
                }}
                aria-label={`${u.username} löschen`}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}