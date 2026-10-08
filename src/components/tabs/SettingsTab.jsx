import { useEffect, useState } from 'react';
import Icon from '../shell/Icon.jsx';
import { isSoundEnabled, setSoundEnabled, primeAudio, playTap } from '../../utils/sounds.js';

export default function SettingsTab({ go, stats, authUser, username, onAdd, onLogout, onLogin }) {
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const h = () => setSoundOn(isSoundEnabled());
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('gs:sound-toggle', h);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('gs:sound-toggle', h);
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const toggleSound = () => {
    const next = !isSoundEnabled();
    setSoundEnabled(next);
    setSoundOn(next);
    primeAudio();
    if (next) playTap();
    window.dispatchEvent(new CustomEvent('gs:sound-toggle'));
  };

  const displayName = authUser?.username || username || 'Gast';

  return (
    <div className="page settings-page">
      <button className="back-link" onClick={() => go('more')}>
        <span aria-hidden="true">←</span> Mehr
      </button>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">EINSTELLUNGEN</span>
          <h1>App-Einstellungen</h1>
          <p>Ton, Updates und Konto.</p>
        </div>
      </div>

      <div className="set-card">
        <div className="set-row">
          <div className="set-icon">
            <Icon name={soundOn ? 'sound' : 'mute'} />
          </div>
          <div>
            <b>Ton & Aussprache</b>
            <p>Antworten, Erfolge und Sprachausgabe.</p>
          </div>
          <button
            className={`switch${soundOn ? ' on' : ''}`}
            role="switch"
            aria-checked={soundOn}
            aria-label="Ton ein- oder ausschalten"
            onClick={toggleSound}
          >
            <span />
          </button>
        </div>
        <div className="set-row">
          <div className="set-icon">
            <Icon name="refresh" />
          </div>
          <div>
            <b>Updates</b>
            <p>Neue Versionen werden automatisch im Hintergrund geladen.</p>
          </div>
          <button className="btn light small" onClick={() => window.dispatchEvent(new CustomEvent('gs:check-update'))}>
            Prüfen
          </button>
        </div>
        <div className="set-row">
          <div className="set-icon">
            <Icon name="offline" />
          </div>
          <div>
            <b>{online ? 'Offline bereit' : 'Offline — nur lokal'}</b>
            <p>Alle Wörter und dein Fortschritt liegen auf diesem Gerät.</p>
          </div>
          <span className="set-badge">{online ? 'AKTUELL' : 'LOKAL'}</span>
        </div>
      </div>

      <div className="set-card">
        <div className="set-row">
          <div className="set-icon">
            <Icon name="user" />
          </div>
          <div>
            <b>{displayName}</b>
            <p>
              {authUser
                ? authUser.isAdmin
                  ? 'Angemeldet · Administrator'
                  : 'Angemeldet · Fortschritt synchronisieren'
                : 'Lokal gespeichert · anmelden für Sync'}
            </p>
          </div>
          {authUser ? (
            <button className="btn light small" onClick={onLogout}>
              Abmelden
            </button>
          ) : (
            <button className="btn dark small" onClick={onLogin}>
              Anmelden
            </button>
          )}
        </div>
        <div className="set-row">
          <div className="set-icon">
            <Icon name="plus" />
          </div>
          <div>
            <b>Eigene Karte</b>
            <p>Füge eigene Wörter zu deinem Wortschatz hinzu.</p>
          </div>
          <button className="btn light small" onClick={onAdd}>
            Hinzufügen
          </button>
        </div>
        <div className="set-row">
          <div className="set-icon">
            <Icon name="bolt" />
          </div>
          <div>
            <b>{(Number(stats.xp) || 0).toLocaleString('de-DE')} XP · {Number(stats.streak) || 0} Tage Serie</b>
            <p>Dein bisheriger Lernstand.</p>
          </div>
          <button className="btn light small" onClick={() => go('profile')}>
            Profil
          </button>
        </div>
      </div>
    </div>
  );
}
