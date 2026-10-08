import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { isSoundEnabled, setSoundEnabled, primeAudio, playTap } from '../../utils/sounds.js';

const NAV_ITEMS = [
  { id: 'home', label: 'Heute', icon: 'home' },
  { id: 'study', label: 'Lernen', icon: 'cards' },
  { id: 'quiz', label: 'Quiz', icon: 'quiz' },
  { id: 'exam', label: 'Prüfung', icon: 'exam' },
];

const TOOL_ITEMS = [
  { id: 'streak', label: 'Streak', icon: 'flame' },
  { id: 'search', label: 'Suche', icon: 'search' },
  { id: 'weak', label: 'Fehlerbank', icon: 'weak' },
  { id: 'board', label: 'Rangliste', icon: 'board' },
];

const MORE_SCREENS = ['more', 'search', 'weak', 'board', 'books', 'profile', 'settings', 'admin'];
const fmt = (n) => (Number(n) || 0).toLocaleString('de-DE');

export function Brand({ compact = false }) {
  return (
    <div className="brand">
      <div className="brand-mark">
        <span>D</span>
      </div>
      {!compact && (
        <div>
          <strong>
            German<span>Splash</span>
          </strong>
          <small>DEUTSCH, DAS BLEIBT.</small>
        </div>
      )}
    </div>
  );
}

function useMenu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return { open, setOpen, wrapRef };
}

function AccountMenu({ authUser, username, onAdd, onLogout, onLogin, go, up = false }) {
  const { open, setOpen, wrapRef } = useMenu();
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  useEffect(() => {
    const h = () => setSoundOn(isSoundEnabled());
    window.addEventListener('gs:sound-toggle', h);
    return () => window.removeEventListener('gs:sound-toggle', h);
  }, []);
  const toggleSound = () => {
    const next = !isSoundEnabled();
    setSoundEnabled(next);
    setSoundOn(next);
    primeAudio();
    if (next) playTap();
    window.dispatchEvent(new CustomEvent('gs:sound-toggle'));
  };
  const item = (icon, label, onClick) => (
    <button role="menuitem" onClick={() => { setOpen(false); onClick(); }}>
      <Icon name={icon} size={16} /> {label}
    </button>
  );
  return (
    <div className="shell-menu-wrap" ref={wrapRef}>
      <button
        className="avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Konto-Menü"
        onClick={() => { primeAudio(); playTap(); setOpen(!open); }}
      >
        {(authUser?.username || username || 'DU').slice(0, 2).toUpperCase()}
      </button>
      {open && (
        <div className={`shell-menu${up ? ' up' : ''}`} role="menu">
          <div className="shell-menu-head">
            <b>{authUser?.username || username || 'Gast'}</b>
            <span>{authUser ? (authUser.isAdmin ? 'Administrator' : 'Angemeldet') : 'Lokal · ohne Konto'}</span>
          </div>
          {item('user', 'Profil', () => go?.('profile'))}
          {item('plus', 'Karte hinzufügen', () => onAdd?.())}
          <div className="shell-menu-sep" />
          {item(soundOn ? 'sound' : 'mute', soundOn ? 'Ton an' : 'Ton aus', toggleSound)}
          {item('refresh', 'Nach Update suchen', () => window.dispatchEvent(new CustomEvent('gs:check-update')))}
          <div className="shell-menu-sep" />
          {authUser
            ? item('logout', 'Abmelden', () => onLogout?.())
            : item('login', 'Anmelden', () => onLogin?.())}
        </div>
      )}
    </div>
  );
}

export function ScopePill({ bookLabel, lekLabel, count, onClick }) {
  return (
    <button className="scope-pill" onClick={onClick} title="Lernbereich ändern">
      <span>{bookLabel}</span>
      <b>{lekLabel}</b>
      <small>{fmt(count)} Wörter</small>
      <Icon name="chevron" size={16} />
    </button>
  );
}

export function Sidebar({ activeKey, go, stats, dueCount, wordCount, weakCount, rank, authUser, username, onAdd, onLogout, onLogin, scope, isAdmin }) {
  const toolNotes = {
    streak: `${fmt(stats.streak)} Tage`,
    search: `${fmt(wordCount)} Wörter`,
    weak: fmt(weakCount),
    board: rank ? `#${rank}` : null,
  };
  return (
    <aside className="sidebar">
      <Brand />
      <nav>
        <span className="nav-label">LERNEN</span>
        {NAV_ITEMS.map((item) => (
          <button key={item.id} className={activeKey === item.id ? 'active' : ''} onClick={() => go(item.id)}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.id === 'study' && <small>{dueCount > 0 ? dueCount : '✓'}</small>}
            {item.id === 'quiz' && <small>{scope}</small>}
          </button>
        ))}
        <span className="nav-label second">WERKZEUGE</span>
        {TOOL_ITEMS.map((item) => (
          <button key={item.id} className={activeKey === item.id ? 'active' : ''} onClick={() => go(item.id)}>
            <Icon name={item.icon} />
            <span>{item.label}</span>
            <small>{toolNotes[item.id]}</small>
          </button>
        ))}
        {isAdmin && (
          <button className={activeKey === 'admin' ? 'active' : ''} onClick={() => go('admin')}>
            <Icon name="shield" />
            <span>Admin</span>
          </button>
        )}
      </nav>
      <div className="sidebar-account">
        <AccountMenu authUser={authUser} username={username} onAdd={onAdd} onLogout={onLogout} onLogin={onLogin} go={go} />
        <div>
          <b>{authUser?.username || username || 'Gast'}</b>
          <span>{authUser ? (authUser.isAdmin ? 'Admin' : 'Konto') : 'Lokal gespeichert'}</span>
        </div>
        <Icon name="more" size={16} />
      </div>
    </aside>
  );
}

export function DesktopTopbar({ scope, go, stats }) {
  return (
    <div className="desktop-topbar">
      {scope}
      <div className="top-actions">
        <span><i /> Offline bereit</span>
        <button onClick={() => go('search')} aria-label="Suche"><Icon name="search" /></button>
        <button onClick={() => go('settings')} aria-label="Einstellungen"><Icon name="settings" /></button>
        <div className="xp-chip"><Icon name="bolt" size={16} /> {fmt(stats.xp)} XP</div>
      </div>
    </div>
  );
}

export function MobileHeader({ scope, go, stats, authUser, username, onAdd, onLogout, onLogin }) {
  return (
    <header className="mobile-header">
      <Brand compact />
      {scope}
      <div className="xp-chip"><Icon name="bolt" size={16} /> {fmt(stats.xp)}</div>
      <AccountMenu authUser={authUser} username={username} onAdd={onAdd} onLogout={onLogout} onLogin={onLogin} go={go} />
    </header>
  );
}

export function BottomNav({ activeKey, go, dueCount }) {
  const items = [
    NAV_ITEMS[0],
    NAV_ITEMS[1],
    NAV_ITEMS[2],
    TOOL_ITEMS[0],
    { id: 'more', label: 'Mehr', icon: 'more' },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.id}
          className={activeKey === item.id || (item.id === 'more' && MORE_SCREENS.includes(activeKey)) ? 'active' : ''}
          onClick={() => go(item.id)}
        >
          <span>
            <Icon name={item.icon} />
            {item.id === 'study' && dueCount > 0 && <i>{dueCount > 99 ? '99+' : dueCount}</i>}
          </span>
          <small>{item.label}</small>
        </button>
      ))}
    </nav>
  );
}
