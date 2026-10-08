import Icon from '../shell/Icon.jsx';
import { lekLabel } from '../../utils/scope.js';

const fmt = (n) => (Number(n) || 0).toLocaleString('de-DE');

const TOOLS = [
  { id: 'streak', label: 'Streak', icon: 'flame', cls: 'streak' },
  { id: 'search', label: 'Suche', icon: 'search', cls: 'search' },
  { id: 'weak', label: 'Fehlerbank', icon: 'weak', cls: 'weak' },
  { id: 'board', label: 'Rangliste', icon: 'board', cls: 'board' },
];

export default function MoreTab({
  stats,
  authUser,
  username,
  totalWords,
  bookCount,
  weakCount,
  rank,
  selectedBookMeta,
  selectedLektions,
  go,
}) {
  const notes = {
    streak: `${fmt(stats.streak)} Tage aktiv`,
    search: `${fmt(totalWords)} Wörter durchsuchbar`,
    weak: weakCount > 0 ? `${fmt(weakCount)} Wörter warten` : 'Alles geübt',
    board: rank ? `Diese Woche #${rank}` : 'Lokale Rangliste',
  };
  const displayName = authUser?.username || username || 'Gast';

  return (
    <div className="page more-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">DEIN BEREICH</span>
          <h1>Mehr</h1>
          <p>Werkzeuge, Fortschritt und Einstellungen.</p>
        </div>
      </div>

      <button className="profile-banner" onClick={() => go('profile')}>
        <div className="avatar">{displayName.slice(0, 2).toUpperCase()}</div>
        <div>
          <h2>{displayName}</h2>
          <p>{authUser ? `${authUser.email || authUser.username} · angemeldet` : 'Lokal gespeichert · ohne Konto'}</p>
        </div>
        <span>{authUser ? 'PRO' : 'LOKAL'}</span>
        <Icon name="chevron" />
      </button>

      <div className="more-grid">
        {TOOLS.map((item) => (
          <button key={item.id} onClick={() => go(item.id)}>
            <div className={`more-icon ${item.cls}`}>
              <Icon name={item.icon} />
            </div>
            <div>
              <h3>{item.label}</h3>
              <p>{notes[item.id]}</p>
            </div>
            <Icon name="chevron" />
          </button>
        ))}
        <button onClick={() => go('books')}>
          <div className="more-icon books">
            <Icon name="book" />
          </div>
          <div>
            <h3>Bücher & Lektionen</h3>
            <p>
              {fmt(bookCount)} Bücher · {fmt(totalWords)} Wörter · {selectedBookMeta?.shortLabel || 'A1.1'} ·{' '}
              {lekLabel(selectedLektions)}
            </p>
          </div>
          <Icon name="chevron" />
        </button>
        <button onClick={() => go('settings')}>
          <div className="more-icon settings">
            <Icon name="settings" />
          </div>
          <div>
            <h3>Einstellungen</h3>
            <p>Ton, Updates, Konto</p>
          </div>
          <Icon name="chevron" />
        </button>
      </div>

      <div className="offline-card">
        <Icon name="offline" />
        <div>
          <b>Offline bereit</b>
          <p>Alle Wörter sind auf diesem Gerät. Dein Fortschritt ist sicher.</p>
        </div>
        <span>AKTUELL</span>
      </div>
    </div>
  );
}
