import './SplashScreen.css';

export default function SplashScreen({ phase = 'visible' }) {
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
      </div>
      <span className="loading-caption">Wörter, die bleiben.</span>
    </div>
  );
}
