import { BOOKS } from '../data/menschen.js';
import Icon from './shell/Icon.jsx';
import { Brand } from './shell/Shell.jsx';

const fmt = (n) => (Number(n) || 0).toLocaleString('de-DE');

export default function SplashScreen({ phase = 'visible', action = null }) {
  const total = BOOKS.reduce((a, b) => a + b.total, 0);
  return (
    <div
      className={`splash${phase === 'leaving' ? ' is-leaving' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="splash-top">
        <Brand />
      </div>
      <div className="splash-art" aria-hidden="true">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="splash-card splash-card-der">
          <span>der</span>
          <strong>Apfel</strong>
          <small>apple · سیب</small>
        </div>
        <div className="splash-card splash-card-die">
          <span>die</span>
          <strong>Sprache</strong>
          <small>language · زبان</small>
        </div>
        <div className="splash-card splash-card-das">
          <span>das</span>
          <strong>Wort</strong>
          <small>word · کلمه</small>
        </div>
        <span className="splash-spark splash-spark-one" />
        <span className="splash-spark splash-spark-two" />
      </div>
      <div className="splash-copy">
        <span className="eyebrow"><i /> DEIN DEUTSCH-MOMENT BEGINNT</span>
        <h1>
          Wörter, die
          <br />
          <em>bleiben.</em>
        </h1>
        <p>
          German vocabulary. Persian warmth.
          <br />A little progress, every day.
        </p>
        {action ? (
          <button className="btn splash-cta" type="button" onClick={action.onClick}>
            {action.label} <Icon name="arrow" size={18} />
          </button>
        ) : (
          <span className="loading-pill">
            <i /> Wörter werden geladen …
          </span>
        )}
        <small className="safe-note">
          <Icon name="offline" size={15} /> {fmt(total)} Wörter · offline bereit
        </small>
      </div>
    </div>
  );
}
