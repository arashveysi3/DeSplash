import './SplashScreen.css';

export default function SplashScreen({ phase = 'visible', action = null }) {
  return (
    <div
      className={`loading-screen${phase === 'leaving' ? ' is-leaving' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="loading-brand">
        <div className="loading-symbol" aria-hidden="true">
          <span className="loading-card loading-card-back">A</span>
          <span className="loading-card loading-card-front">Ä</span>
          <span className="loading-ripple loading-ripple-one" />
          <span className="loading-ripple loading-ripple-two" />
          <span className="loading-drop" />
        </div>
        <div className="loading-wordmark">
          German<span>Splash</span>
        </div>
        <p>Dein Deutsch-Moment beginnt</p>
        <div className="loading-track" aria-label="App wird geladen">
          <span />
        </div>
        {action && (
          <button className="loading-continue" type="button" onClick={action.onClick}>
            <span>{action.label}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h13m-5-5 5 5-5 5" />
            </svg>
          </button>
        )}
      </div>
      <span className="loading-caption">Wörter, die bleiben.</span>
    </div>
  );
}
