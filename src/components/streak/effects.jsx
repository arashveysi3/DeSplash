// Lightweight CSS/SVG particle engine for the legendary streak calendar.
// No canvas, no GIFs, no Lottie — GPU-friendly transforms + opacity only.
// Each effect renders a few spans animated by index.css keyframes.
// Hidden months unmount with the calendar, so only the visible month animates.

function dots(count, className, styleFor) {
  return Array.from({ length: count }).map((_, i) => (
    <span key={i} aria-hidden="true" className={className} style={styleFor ? styleFor(i) : undefined} />
  ));
}

/** Ember (1-9): tiny embers drifting upward, gentle breathing. */
export function EmberEffect() {
  return (
    <span aria-hidden="true" className="gs-tier-fx gs-fx-ember">
      {dots(4, 'gs-p gs-p-rise', (i) => ({ left: `${18 + i * 18}%`, animationDelay: `${i * 0.9}s`, animationDuration: '3.4s' }))}
    </span>
  );
}

/** Inferno (10-29): stronger flames, animated sparks, border flicker. */
export function InfernoEffect() {
  return (
    <span aria-hidden="true" className="gs-tier-fx gs-fx-inferno">
      {dots(6, 'gs-p gs-p-spark', (i) => ({ left: `${8 + i * 15}%`, animationDelay: `${i * 0.45}s`, animationDuration: '2.2s' }))}
      <span aria-hidden="true" className="gs-fx-flicker" />
    </span>
  );
}

/** Thunderstorm (30-59): electric arcs flashing over a fire base. */
export function ThunderstormEffect() {
  return (
    <span aria-hidden="true" className="gs-tier-fx gs-fx-storm">
      <span aria-hidden="true" className="gs-fx-flash" />
      <span aria-hidden="true" className="gs-fx-flash gs-fx-flash-b" />
      {dots(4, 'gs-p gs-p-rise gs-p-volt', (i) => ({ left: `${15 + i * 20}%`, animationDelay: `${i * 0.7}s`, animationDuration: '2.6s' }))}
    </span>
  );
}

/** Tsunami (60-89): flowing liquid bands, reflective highlights. */
export function TsunamiEffect() {
  return (
    <span aria-hidden="true" className="gs-tier-fx gs-fx-tsunami">
      <span aria-hidden="true" className="gs-fx-wave gs-fx-wave-a" />
      <span aria-hidden="true" className="gs-fx-wave gs-fx-wave-b" />
      <span aria-hidden="true" className="gs-fx-sheen" />
    </span>
  );
}

/** Hurricane (90-149): rotating wind overlay + drifting mist. */
export function HurricaneEffect() {
  return (
    <span aria-hidden="true" className="gs-tier-fx gs-fx-hurricane">
      <span aria-hidden="true" className="gs-fx-swirl" />
      {dots(3, 'gs-p gs-p-mist', (i) => ({ top: `${25 + i * 20}%`, animationDelay: `${i * 1.1}s`, animationDuration: '4.2s' }))}
    </span>
  );
}

/** Volcano (150-249): magma crack pulse, rising embers, occasional rumble. */
export function VolcanoEffect() {
  return (
    <span aria-hidden="true" className="gs-tier-fx gs-fx-volcano">
      <span aria-hidden="true" className="gs-fx-crack" />
      {dots(4, 'gs-p gs-p-rise gs-p-magma', (i) => ({ left: `${20 + i * 17}%`, animationDelay: `${i * 1.2}s`, animationDuration: '3.8s' }))}
    </span>
  );
}

/** Solar Storm (250-364): rotating rays + floating light particles. */
export function SolarEffect() {
  return (
    <span aria-hidden="true" className="gs-tier-fx gs-fx-solar">
      <span aria-hidden="true" className="gs-fx-rays" />
      {dots(4, 'gs-p gs-p-float', (i) => ({ left: `${15 + i * 22}%`, top: `${55 - i * 8}%`, animationDelay: `${i * 0.8}s`, animationDuration: '3s' }))}
    </span>
  );
}

/** Cosmic (365-729): drifting nebula + twinkling stars. */
export function CosmicEffect() {
  return (
    <span aria-hidden="true" className="gs-tier-fx gs-fx-cosmic">
      <span aria-hidden="true" className="gs-fx-nebula" />
      {dots(6, 'gs-p gs-p-star', (i) => ({ left: `${10 + ((i * 37) % 80)}%`, top: `${12 + ((i * 53) % 70)}%`, animationDelay: `${i * 0.7}s`, animationDuration: '3.6s' }))}
    </span>
  );
}

/** Legendary (730+): aurora drift + constellation + occasional shooting star. */
export function LegendaryEffect() {
  return (
    <span aria-hidden="true" className="gs-tier-fx gs-fx-legendary">
      <span aria-hidden="true" className="gs-fx-aurora" />
      {dots(5, 'gs-p gs-p-star', (i) => ({ left: `${12 + ((i * 41) % 76)}%`, top: `${10 + ((i * 47) % 66)}%`, animationDelay: `${i * 0.9}s`, animationDuration: '4s' }))}
      <span aria-hidden="true" className="gs-fx-shoot" />
    </span>
  );
}

/** Dispatcher: tier level -> elemental effect. */
export function TierEffect({ level }) {
  switch (Number(level)) {
    case 1: return <EmberEffect />;
    case 2: return <InfernoEffect />;
    case 3: return <ThunderstormEffect />;
    case 4: return <TsunamiEffect />;
    case 5: return <HurricaneEffect />;
    case 6: return <VolcanoEffect />;
    case 7: return <SolarEffect />;
    case 8: return <CosmicEffect />;
    case 9: return <LegendaryEffect />;
    default: return <EmberEffect />;
  }
}
