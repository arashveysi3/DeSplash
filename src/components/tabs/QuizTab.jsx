import { BOOKS, lektionenForBook } from '../../data/menschen.js';
import { QUIZ_XP, GAME_XP } from '../../srs.js';
import { genderColor } from '../../utils/gender.js';
import { speakGerman } from '../../utils/speak';
import { BarChart3, CircleX, CloudRainWind, Eye, Hammer, Heart, PartyPopper, RotateCcw, Skull, Star, Timer } from 'lucide-react';
import Icon from '../shell/Icon.jsx';
import QuizReport from '../analytics/QuizReport.jsx';

const MODE_TOP = {
  dictation: 'DIKTATION',
  artikel: 'ARTIKEL',
  mixed: 'GEMISCHT',
  choice: '4-CHOICE',
  fa: 'DE → فارسی',
  diktat: 'DIKTAT-CHECK',
};

const MODES = [
  { key: 'dictation', title: 'Diktat', desc: 'Hören & exakt tippen', xp: `+${QUIZ_XP.dictation} XP`, icon: 'sound' },
  { key: 'artikel', title: 'Artikel', desc: 'der, die oder das?', xp: `+${QUIZ_XP.artikel} XP`, icon: 'cards' },
  { key: 'fa', title: 'DE → فارسی', desc: 'Auf Persisch antworten', xp: `+${QUIZ_XP.fa} XP`, icon: 'arrow' },
  { key: 'diktat', title: 'Diktat-Check', desc: 'Falsche Schreibweise finden', xp: `+${QUIZ_XP.diktat} XP`, icon: 'search' },
  { key: 'mixed', title: 'Gemischt', desc: 'Diktat & Artikel abwechselnd', xp: '+8–12 XP', icon: 'book' },
  { key: 'choice', title: '4-Choice', desc: 'Bedeutung aus 4 Optionen wählen', xp: `+${QUIZ_XP.choice} XP`, icon: 'quiz' },
];

export default function QuizTab(props) {
  const {
    quizBook, setQuizBook, quizLektions, setQuizLektions, quizBookMeta,
    quizMode, setQuizMode, quizStarted, setQuizStarted,
    quizScopeWords, quizScopeStatus, weakIds, allWords,
    startQuiz, quizQueue, quizIdx, currentQuizWord,
    choiceOptions, choicePick, setChoicePick,
    quizAnswer, setQuizAnswer, quizArtikelChoice, setQuizArtikelChoice,
    quizFeedback, quizScore, submitQuiz, nextQuiz, insertUmlaut,
    // choice enhanced
    choiceEliminated, choiceCorrectLocked, choiceCorrectEn, choiceTransition, questionFade, choiceAnimKey, quizSubmitting, handleChoiceSelect,
    // match
    matchBoard, matchMatched, matchMoves, matchDone, matchXp, handleMatchPick, startMatchGame, matchStarted, setMatchStarted,
    matchFadingIds, matchShakeIds, matchWrongIds, matchHiddenIds,
    // sprint
    sprintActive, setSprintActive, sprintQueue, sprintIdx, sprintOptions, sprintTime, sprintScore, sprintFeedback, handleSprintPick, startSprintGame,
    // satz
    satzQueue, satzIdx, setSatzIdx, satzBuilt, setSatzBuilt, satzPool, setSatzPool, satzFeedback, setSatzFeedback, satzScore, satzActive, setSatzActive, handleSatzPick, handleSatzRemove, checkSatz, startSatzGame,
    // rain
    rainQueue, rainIdx, rainOptions, rainTime, rainLives, rainScore, rainFeedback, rainActive, setRainActive, handleRainPick, startRainGame,
    setQuizFeedback,
    // Diktat-Check: German spelling 4-choice (single word, article ignored)
    diktatOptions, diktatKind, diktatCorrect, diktatHint, handleDiktatSelect,
    // completion report (Issue #2)
    lastQuizReport, showQuizReport, setShowQuizReport, onRetakeQuiz, onPracticeLektion, onPracticeWeak, onGoToBook,
  } = props;

  const GAMES = [
    { key: 'match', title: 'Match Dash', desc: 'DE ↔ EN+FA · 6 Paare · ohne Vorschau', xp: `+${GAME_XP.matchPair}/Paar +${GAME_XP.matchPerfectBonus} perfekt = ~40 XP`, icon: <Icon name="puzzle" size={20} />, iconBg: '#eef2ff', iconColor: '#4f46e5', cta: 'Spielen →', start: () => startQuiz('match', 6) },
    { key: 'sprint', title: 'Blitzsprint', desc: '45 s · DE → EN+FA · 2× Serie', xp: `+${GAME_XP.sprintBase} pro Treffer`, icon: <Icon name="bolt" size={20} />, iconBg: '#fff0bd', iconColor: '#b27b00', cta: 'Sprint →', start: () => startQuiz('sprint', 12) },
    { key: 'satz', title: 'SatzBau', desc: 'Deutschen Satz zusammensetzen · gemischte Wörter', xp: `+${GAME_XP.scramblePerWord} XP pro Satz · Wortstellungs-Meisterschaft`, icon: <Hammer size={20} aria-hidden="true" />, iconBg: '#f1f1f3', iconColor: '#0f0f12', cta: 'Schmieden →', start: () => startQuiz('satz', 8) },
    { key: 'rain', title: 'WortSturm', desc: '6 s pro Wort · 3 Leben · EN+FA-Auswahl', xp: 'Serien-Multiplikator · Arcade-Panik', icon: <CloudRainWind size={20} aria-hidden="true" />, iconBg: '#e8f8f0', iconColor: '#059669', cta: 'Stürmen →', start: () => startQuiz('rain', 10) },
  ];

  const exitQuiz = () => {
    if (quizMode === 'match') { setQuizStarted(false); setMatchStarted(false); return; }
    if (quizMode === 'sprint') { setSprintActive(false); setQuizStarted(false); return; }
    if (quizMode === 'satz') { setSatzActive(false); setQuizStarted(false); return; }
    if (quizMode === 'rain') { setRainActive(false); setQuizStarted(false); return; }
    setQuizStarted(false);
    if (setQuizFeedback) setQuizFeedback(null);
  };
  const exitLabel = quizMode === 'match' ? 'Spiel beenden'
    : quizMode === 'sprint' ? 'Sprint beenden'
      : quizMode === 'satz' ? 'Spiel beenden'
        : quizMode === 'rain' ? 'Sturm beenden' : 'Quiz beenden';

  // Quiz completion report replaces the start screen after a finished quiz.
  if (!quizStarted && showQuizReport && lastQuizReport) {
    return (
      <div className="page report-page">
        <div className="qz-report-top">
          <span className="qz-report-title">AUSWERTUNG{lastQuizReport.meta?.scopeLabel ? ` · ${lastQuizReport.meta.scopeLabel}` : ''}</span>
          <button className="btn light small" onClick={() => setShowQuizReport(false)}>Neues Quiz</button>
        </div>
        <QuizReport
          report={lastQuizReport.report}
          meta={lastQuizReport.meta}
          actions={{ onRetake: onRetakeQuiz, onNewQuiz: () => setShowQuizReport(false), onGoToBook: () => onGoToBook && onGoToBook(), onPracticeWeak, onPracticeLektion }}
        />
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="page quiz-page">
        <div className="page-title-row">
          <div>
            <span className="eyebrow">TRAINING</span>
            <h1>Quiz</h1>
            <p>Kurze Challenges. Sofortiges Feedback.</p>
          </div>
          <label className="qz-book">
            <span className="qz-book-label">BUCH</span>
            <select
              className="qz-book-select"
              value={quizBook}
              onChange={(e) => { setQuizBook(e.target.value); setQuizLektions([]); }}
            >
              {BOOKS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </label>
        </div>

        <section className="qz-scope">
          <div className="qz-scope-row">
            <span className="eyebrow">LEKTIONEN</span>
            <span className="qz-scope-sub">{quizBookMeta?.label} · {quizLektions.length ? quizLektions.join(', ') : 'Ganzes Buch'}</span>
          </div>
          <div className="qz-chips">
            {lektionenForBook(quizBook).map((l) => {
              const active = quizLektions.includes(l.lektion);
              return (
                <button
                  key={l.lektion}
                  className={`qz-chip-btn ${active ? 'on' : ''}`}
                  onClick={() => setQuizLektions((prev) => prev.includes(l.lektion) ? prev.filter((x) => x !== l.lektion) : [...prev, l.lektion])}
                >
                  {active && <Icon name="check" size={12} />}{l.lektion}
                </button>
              );
            })}
            <button className="qz-chip-btn" onClick={() => setQuizLektions([])}>Alle</button>
            <button className="qz-chip-btn" onClick={() => setQuizLektions(lektionenForBook(quizBook).map((x) => x.lektion))}>Alle +</button>
          </div>
          {quizMode === 'diktat' && quizScopeStatus && (
            <div className="qz-status">
              <div className="qz-status-head">
                <span>Lernstand · {quizBookMeta?.label} {quizLektions.length ? quizLektions.join(', ') : 'ganzes Buch'}</span>
                <strong>{quizScopeStatus.total} Wörter</strong>
              </div>
              <div className="qz-tiles">
                <div className="qz-tile">
                  <span className="qz-tile-ic"><Eye size={16} aria-hidden="true" /></span>
                  <b>{quizScopeStatus.unseen}</b>
                  <small>Neu</small>
                </div>
                <div className="qz-tile">
                  <span className="qz-tile-ic" style={{ background: '#eef2ff', color: '#4f46e5' }}><Icon name="book" size={16} /></span>
                  <b>{quizScopeStatus.practiced}</b>
                  <small>Geübt</small>
                </div>
                <div className={`qz-tile ${quizScopeStatus.weak > 0 ? 'warn' : ''}`}>
                  <span className="qz-tile-ic" style={{ background: '#fef2f2', color: '#dc2626' }}><Icon name="target" size={16} /></span>
                  <b>{quizScopeStatus.weak}</b>
                  <small>Schwach</small>
                </div>
              </div>
              <div className="qz-status-foot">
                <span className="qz-mastered"><Star size={12} aria-hidden="true" /> {quizScopeStatus.mastered} gemeistert</span>
                <span>{quizScopeStatus.weak > 0 ? 'Schwache Wörter zuerst' : quizScopeStatus.unseen === quizScopeStatus.total ? 'Frischer Satz — viel Erfolg' : 'Solide Basis — weiter so'}</span>
              </div>
            </div>
          )}
          <p className="qz-meta">{quizScopeWords.length} Wörter in {quizBookMeta?.label} {quizLektions.length ? quizLektions.join(', ') : 'ganzes Buch'} · {quizScopeWords.filter((w) => weakIds.has(w.id)).length} schwach · {quizScopeWords.filter((w) => w.article).length} Nomen</p>
          {lastQuizReport && !showQuizReport && (
            <button className="btn light small qz-report-btn" onClick={() => setShowQuizReport(true)}>
              <BarChart3 size={14} aria-hidden="true" /> Auswertung ansehen · {lastQuizReport.report.correct}/{lastQuizReport.report.total} ({lastQuizReport.report.accuracy !== null ? `${lastQuizReport.report.accuracy}%` : '—'})
            </button>
          )}
        </section>

        <section className="featured-mode">
          <span className="mode-badge">BESTE XP-RATE</span>
          <div className="mode-art" aria-hidden="true"><div>A</div><div>B</div><div>C</div></div>
          <div className="mode-copy">
            <span className="eyebrow">EMPFOHLEN</span>
            <h2>4-Choice Sprint</h2>
            <p>Finde die richtige Bedeutung. Schnell, fokussiert, effektiv.</p>
            <div className="mode-meta">
              <span>10 Fragen</span>
              <span>~4 Min</span>
              <span>bis +100 XP</span>
            </div>
            <button className="btn yellow" onClick={() => startQuiz('choice', 10)}>Starten <Icon name="arrow" size={18} /></button>
          </div>
        </section>

        <div className="section-heading">
          <div>
            <span className="eyebrow">TRAININGSMODI</span>
            <h2>Wähle deine Challenge</h2>
          </div>
        </div>
        <div className="mode-grid">
          {MODES.map((m) => (
            <button key={m.key} className={`mode-card ${quizMode === m.key ? 'qz-on' : ''}`} onClick={() => setQuizMode(m.key)}>
              <div className="mode-icon"><Icon name={m.icon} size={22} /></div>
              <div><h3>{m.title}</h3><p>{m.desc}</p></div>
              <span>{m.xp}</span>
              <Icon name="chevron" size={18} />
            </button>
          ))}
        </div>
        <div className="qz-start-bar">
          {quizMode === 'diktat' ? (
            <>
              <button className="btn dark" onClick={() => startQuiz('diktat', 20)}>20er-Pack starten</button>
              <button className="btn light" onClick={() => startQuiz('diktat', 10)}>10er-Pack starten</button>
            </>
          ) : (
            <>
              <button className="btn dark" onClick={() => startQuiz(quizMode, 5)}>Starten · 5</button>
              <button className="btn light" onClick={() => startQuiz(quizMode, 10)}>Starten · 10</button>
              <button className="btn light" onClick={() => startQuiz(quizMode, 20)}>Starten · 20</button>
            </>
          )}
        </div>

        <div className="section-heading">
          <div>
            <span className="eyebrow">MODUS-INFO</span>
            <h2>So funktioniert&apos;s</h2>
          </div>
        </div>
        <div className="qz-info-grid">
          <p className="qz-info green"><b>Diktat-Check NEW — 20-Pack:</b> German spelling 4-choice, single words only (no article). Half the cards ask <b>"Which is CORRECT?"</b> (1 right + 3 misspelled), half ask <b>"Which is WRONG?"</b> (3 right + 1 misspelled). <b>+{QUIZ_XP.diktat} XP</b> per correct.</p>
          <p className="qz-info blue"><b>4-Choice NEW:</b> German word → pick 1 of 4 English meanings. Distractors from same Lektion so you really have to know it. <b>+{QUIZ_XP.choice} XP</b> per correct. Most efficient way to earn!</p>
          <p className="qz-info"><b>Dictation:</b> Hear German → type exact word (<b>ä ö ü Ä Ö Ü ß</b> strict). <b>+{QUIZ_XP.dictation} XP</b>.</p>
          <p className="qz-info"><b>Artikel:</b> Pick <span style={{ color: genderColor('der'), fontWeight: 700 }}>der</span> / <span style={{ color: genderColor('die'), fontWeight: 700 }}>die</span> / <span style={{ color: genderColor('das'), fontWeight: 700 }}>das</span>. <b>+{QUIZ_XP.artikel} XP</b>.</p>
          <p className="qz-info"><b>فارسی:</b> See German → type Persian meaning exactly. <b>+{QUIZ_XP.fa} XP</b>.</p>
        </div>

        <section className="games-strip">
          <div>
            <span className="eyebrow">SPIELHALLE</span>
            <h2>Mehr Tempo. Mehr XP.</h2>
            <p>Match Dash · Blitzsprint · SatzBau · WortSturm</p>
          </div>
        </section>
        <p className="qz-games-note">Left side German • Right side English + فارسی. Every game uses your multi-Lektion scope.</p>
        <div className="mode-grid">
          {GAMES.map((g) => (
            <button key={g.key} className="mode-card" onClick={g.start}>
              <div className="mode-icon" style={{ background: g.iconBg, color: g.iconColor }}>{g.icon}</div>
              <div><h3>{g.title}</h3><p>{g.desc}</p></div>
              <span>{g.xp}</span>
              <span className="btn small light qz-cta">{g.cta} <Icon name="arrow" size={14} /></span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // quizStarted true
  let topLabel = '';
  let topProgress = 0;
  let topTone = '';
  let topXp = 0;
  let topHud = [];
  if (quizMode === 'match') {
    topLabel = `MATCH DASH · ${matchMatched}/6 PAARE · ${matchMoves} ZÜGE`;
    topProgress = (matchMatched / 6) * 100;
    topTone = 'green';
    topXp = matchXp;
  } else if (quizMode === 'sprint') {
    topLabel = `BLITZSPRINT · ${sprintScore.correct}/${sprintScore.total} RICHTIG · SERIE ${sprintScore.streak} (REKORD ${sprintScore.best})`;
    topProgress = Math.max(0, Math.min(100, (sprintTime / 45) * 100));
    topTone = sprintTime <= 10 ? '' : 'yellow';
    topXp = sprintScore.xp;
    topHud = [<span key="time" className={`qz-chip ${sprintTime <= 10 ? 'warn' : ''}`}>{sprintTime}s</span>];
  } else if (quizMode === 'satz') {
    topLabel = `SATZBAU · ${satzIdx + 1}/${satzQueue.length} · ${satzScore.correct}/${satzScore.total} RICHTIG`;
    topProgress = satzQueue.length ? (satzIdx / satzQueue.length) * 100 : 0;
    topXp = satzScore.xp;
  } else if (quizMode === 'rain') {
    topLabel = `WORTSTURM · ${rainIdx + 1}/${rainQueue.length} · ${rainScore.correct}/${rainScore.total} RICHTIG · SERIE ${rainScore.streak}`;
    topProgress = Math.max(0, Math.min(100, (rainTime / 6) * 100));
    topTone = rainTime <= 2 ? '' : 'blue';
    topXp = rainScore.xp;
    topHud = [
      <span key="time" className={`qz-chip ${rainTime <= 2 ? 'warn' : 'blue'}`}>{rainTime}s</span>,
      <span key="lives" className="qz-chip">
        {[0, 1, 2].map((i) => (
          <Heart key={i} size={14} aria-hidden="true" style={{ color: i < rainLives ? '#dc2626' : '#d4d4d8' }} fill={i < rainLives ? '#dc2626' : 'none'} />
        ))}
      </span>,
    ];
  } else {
    topLabel = `${MODE_TOP[quizMode]} · ${quizIdx + 1} VON ${quizQueue.length} · ${quizScore.correct}/${quizScore.total} RICHTIG`;
    topProgress = quizQueue.length ? (quizIdx / quizQueue.length) * 100 : 0;
    topTone = quizMode === 'diktat' ? 'green' : 'yellow';
    topXp = quizScore.xp;
    topHud = [<span key="scope" className="qz-chip">{quizBookMeta?.label}{quizLektions.length ? ` · ${quizLektions.join(', ')}` : ' · Ganzes Buch'}</span>];
  }

  return (
    <div className="page quiz-play">
      <div className="quiz-top">
        <button onClick={exitQuiz} aria-label={exitLabel} title={exitLabel}><Icon name="close" size={20} /></button>
        <div>
          <span>{topLabel}</span>
          <div className={topTone ? `progress ${topTone}` : 'progress'}><span style={{ width: `${topProgress}%` }} /></div>
        </div>
        <b><Icon name="bolt" size={16} /> {topXp} XP</b>
      </div>
      {topHud.length > 0 && <div className="qz-hud">{topHud}</div>}

      {quizMode === 'match' ? (
        <>
          <div className="qz-board-labels">
            <span>DEUTSCH — LINKS</span>
            <span>EN + فارسی — RECHTS</span>
          </div>
          <div className="qz-board">
            <div className="qz-col">
              {matchBoard.filter((t) => t.type === 'de').map((t) => {
                const isFading = matchFadingIds?.has(t.uid);
                const isShake = matchShakeIds?.has(t.uid);
                const isWrong = matchWrongIds?.has(t.uid);
                const isMatched = t.matched;
                const isHidden = matchHiddenIds?.has(t.uid);
                const collapsed = isHidden;
                const borderColor = isWrong ? '#dc2626' : isMatched ? '#16a34a' : t.flipped ? '#181816' : '#1a1a20';
                const bg = isHidden ? '#e6f9ed' : isFading ? '#e6f9ed' : isMatched ? '#e6f9ed' : isWrong ? '#fef2f2' : t.flipped ? '#ffffff' : '#181816';
                const isGreen = isMatched || isFading || isHidden;
                return (
                  <div key={t.uid} onClick={() => handleMatchPick(t.uid)} className={`qz-match-card ${isFading ? 'qz-fading' : ''} ${isShake ? 'qz-shake' : ''} ${collapsed ? 'qz-matched-collapsed' : isMatched ? 'qz-matched' : ''}`} style={{ minHeight: collapsed ? 0 : 84, height: collapsed ? 0 : 84, background: bg, border: collapsed ? '0px solid transparent' : `1.8px solid ${borderColor}`, borderRadius: collapsed ? 0 : 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: collapsed ? '0px 8px' : '10px 8px', margin: collapsed ? '0px' : '0 0 10px 0', cursor: (isMatched || isFading || isHidden) ? 'default' : 'pointer', textAlign: 'center', opacity: (isFading || isHidden) ? 0 : 1, transform: isShake ? undefined : isFading ? 'scale(0.95)' : t.flipped ? 'scale(1.02)' : 'scale(1)', transition: 'opacity 0.38s cubic-bezier(0.2,0.8,0.2,1), transform 0.38s cubic-bezier(0.2,0.8,0.2,1), border-color 0.2s, background-color 0.2s, height 0.35s cubic-bezier(0.2,0.8,0.2,1), min-height 0.35s ease, margin 0.35s ease, padding 0.35s ease, border-width 0.35s ease', boxShadow: t.flipped && !isMatched && !isHidden ? '0 8px 20px rgba(24,24,22,0.10)' : 'none', color: !t.flipped && !isWrong && !isMatched && !isHidden ? '#fff' : t.word.article ? genderColor(t.word.article) : '#181816', overflow: 'hidden', pointerEvents: (isMatched || isFading || isHidden) ? 'none' : 'auto' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2, color: (t.flipped || isWrong || isGreen) ? (t.word.article ? genderColor(t.word.article) : '#181816') : '#fff' }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: (t.flipped || isWrong || isGreen) ? '#9aa0b2' : 'rgba(255,255,255,0.72)', marginTop: collapsed ? 0 : 3 }}>{collapsed ? '' : t.sub}</div>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.6, color: (t.flipped || isWrong || isGreen) ? '#181816' : 'rgba(255,255,255,0.9)', marginTop: collapsed ? 0 : 4, background: (t.flipped || isWrong || isGreen) ? '#f7f7fb' : 'rgba(255,255,255,0.16)', padding: '2px 6px', borderRadius: 999, display: collapsed ? 'none' : 'block' }}>DE</div>
                  </div>
                );
              })}
            </div>
            <div className="qz-col">
              {matchBoard.filter((t) => t.type === 'tr').map((t) => {
                const isFading = matchFadingIds?.has(t.uid);
                const isShake = matchShakeIds?.has(t.uid);
                const isWrong = matchWrongIds?.has(t.uid);
                const isMatched = t.matched;
                const isHidden = matchHiddenIds?.has(t.uid);
                const collapsed = isHidden;
                const borderColor = isWrong ? '#dc2626' : isMatched ? '#16a34a' : t.flipped ? '#181816' : '#e9e8f0';
                const bg = isHidden ? '#e6f9ed' : isFading ? '#e6f9ed' : isMatched ? '#e6f9ed' : isWrong ? '#fef2f2' : t.flipped ? '#ffffff' : '#f7f7fb';
                return (
                  <div key={t.uid} onClick={() => handleMatchPick(t.uid)} className={`qz-match-card ${isFading ? 'qz-fading' : ''} ${isShake ? 'qz-shake' : ''} ${collapsed ? 'qz-matched-collapsed' : isMatched ? 'qz-matched' : ''}`} style={{ minHeight: collapsed ? 0 : 84, height: collapsed ? 0 : 84, background: bg, border: collapsed ? '0px solid transparent' : `1.8px solid ${borderColor}`, borderRadius: collapsed ? 0 : 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: collapsed ? '0px 8px' : '10px 8px', margin: collapsed ? '0px' : '0 0 10px 0', cursor: (isMatched || isFading || isHidden) ? 'default' : 'pointer', textAlign: 'center', opacity: (isFading || isHidden) ? 0 : 1, transform: isShake ? undefined : isFading ? 'scale(0.95)' : t.flipped ? 'scale(1.02)' : 'scale(1)', transition: 'opacity 0.38s cubic-bezier(0.2,0.8,0.2,1), transform 0.38s cubic-bezier(0.2,0.8,0.2,1), border-color 0.2s, background-color 0.2s, height 0.35s cubic-bezier(0.2,0.8,0.2,1), min-height 0.35s ease, margin 0.35s ease, padding 0.35s ease, border-width 0.35s ease', boxShadow: t.flipped && !isMatched && !isHidden ? '0 8px 20px rgba(24,24,22,0.10)' : '0 2px 8px rgba(24,24,22,0.04)', color: '#181816', overflow: 'hidden', pointerEvents: (isMatched || isFading || isHidden) ? 'none' : 'auto' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.2 }}>{collapsed ? '' : t.label}</div>
                    <div style={{ fontSize: 11, color: '#6b6b7a', marginTop: collapsed ? 0 : 2, fontFamily: 'IRANSans, sans-serif', direction: 'rtl', display: collapsed ? 'none' : 'block' }}>{t.sub}</div>
                    <div style={{ fontSize: 9, color: '#9aa0b2', marginTop: collapsed ? 0 : 2, display: collapsed ? 'none' : 'block' }}>{t.sub2}</div>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.6, color: '#4f46e5', marginTop: collapsed ? 0 : 4, background: '#eef2ff', padding: '2px 6px', borderRadius: 999, display: collapsed ? 'none' : 'block' }}>EN+FA</div>
                  </div>
                );
              })}
            </div>
          </div>
          {matchDone && (
            <div className="qz-done">
              <div style={{ display: 'flex', justifyContent: 'center' }}><PartyPopper size={28} aria-hidden="true" style={{ color: '#3fa970' }} /></div>
              <h3>Match geschafft! {matchMatched}/6 in {matchMoves} Zügen</h3>
              <p className="qz-done-sub">+{matchXp} XP verdient</p>
              <div className="qz-actions">
                <button className="btn dark" onClick={() => { setQuizStarted(false); setMatchStarted(false); }}>Fertig</button>
                <button className="btn light" onClick={startMatchGame}>Nochmal spielen</button>
              </div>
            </div>
          )}
        </>
      ) : quizMode === 'sprint' ? (
        <>
          {!sprintActive && sprintTime === 0 ? (
            <div className="qz-done">
              <div style={{ display: 'flex', justifyContent: 'center' }}><Timer size={28} aria-hidden="true" style={{ color: '#ea580c' }} /></div>
              <h3>Zeit ab!</h3>
              <p className="qz-done-sub">{sprintScore.correct}/{sprintScore.total} richtig · beste Serie {sprintScore.best} · +{sprintScore.xp} XP</p>
              <div className="qz-actions">
                <button className="btn dark" onClick={() => { setQuizStarted(false); setSprintActive(false); }}>Fertig</button>
                <button className="btn light" onClick={() => startSprintGame(12)}>Nochmal</button>
              </div>
            </div>
          ) : sprintQueue[sprintIdx] ? (
            <>
              <div className="question-wrap qz-tight">
                <span className="eyebrow">DE → EN + فارسی — RICHTIGE ÜBERSETZUNG WÄHLEN</span>
                <h1 style={sprintQueue[sprintIdx].word.article ? { color: genderColor(sprintQueue[sprintIdx].word.article) } : undefined}>{sprintQueue[sprintIdx].word.article ? `${sprintQueue[sprintIdx].word.article} ` : ''}{sprintQueue[sprintIdx].word.german}</h1>
                <p className="qz-qmeta">{sprintQueue[sprintIdx].word.lektion} · {sprintQueue[sprintIdx].word.plural ? `Pl: ${sprintQueue[sprintIdx].word.plural}` : ''}</p>
              </div>
              {sprintFeedback ? (
                <div className={`qz-feedback ${sprintFeedback.correct ? 'ok' : 'bad'}`}>
                  <span className="qz-fb-line">{sprintFeedback.correct ? <Icon name="check" size={14} /> : <CircleX size={14} aria-hidden="true" />}{sprintFeedback.correct ? `+${sprintFeedback.xp} XP (×${(1 + sprintScore.streak * 0.15).toFixed(2)})` : `War „${typeof sprintFeedback.expected === 'object' ? sprintFeedback.expected.en : sprintFeedback.expected}" • ${typeof sprintFeedback.expected === 'object' ? sprintFeedback.expected.fa : ''}`}</span>
                </div>
              ) : (
                <div className="answer-grid">
                  {sprintOptions.map((opt, i) => {
                    const en = typeof opt === 'object' ? opt.en : opt;
                    const fa = typeof opt === 'object' ? opt.fa : '';
                    return (
                      <button key={en + i} className="qz-tile" onClick={() => handleSprintPick(opt)}>
                        <span>{String.fromCharCode(65 + i)}</span>
                        <b><span className="qz-opt-en">{en}</span>{fa && <small className="qz-opt-fa">{fa}</small>}</b>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </>
      ) : quizMode === 'satz' ? (
        <>
          {satzQueue[satzIdx] && (
            <>
              <div className="question-wrap qz-tight">
                <span className="eyebrow">SATZBAU — DEUTSCHEN SATZ ZUSAMMENSETZEN</span>
                <p className="qz-hint">Tipp: {satzQueue[satzIdx].hintEn} <span className="qz-fa">— {satzQueue[satzIdx].hintFa}</span> · {satzQueue[satzIdx].word.lektion}</p>
                <div className="qz-satz-tools">
                  <button className="btn small" onClick={() => speakGerman(satzQueue[satzIdx].source || satzQueue[satzIdx].word.example || satzQueue[satzIdx].tokens.join(' '))}><Icon name="sound" size={14} /> Satz anhören</button>
                  <button className="btn small light" onClick={() => { setSatzBuilt([]); setSatzPool(satzQueue[satzIdx].shuffled); setSatzFeedback(null); }}><RotateCcw size={14} aria-hidden="true" /> Zurücksetzen</button>
                </div>
              </div>
              <div className="qz-built">
                {satzBuilt.length === 0 ? <span className="qz-built-empty">Wörter antippen …</span> : satzBuilt.map((t, i) => {
                  const isCorrectPos = satzFeedback && !satzFeedback.correct && satzFeedback.perPos ? satzFeedback.perPos[i] : null;
                  const bg = satzFeedback && !satzFeedback.correct ? (isCorrectPos ? '#dcfce7' : '#fee2e2') : '#181816';
                  const color = satzFeedback && !satzFeedback.correct ? (isCorrectPos ? '#16a34a' : '#dc2626') : '#fff';
                  const border = satzFeedback && !satzFeedback.correct ? (isCorrectPos ? '1.5px solid #16a34a' : '1.5px solid #dc2626') : 'none';
                  return (
                    <span key={i} onClick={() => handleSatzRemove(i)} style={{ background: bg, color, padding: '6px 10px', borderRadius: 999, fontWeight: 700, fontSize: 13, cursor: 'pointer', border, transition: 'all 0.2s' }}>{t} ×</span>
                  );
                })}
              </div>
              <div className="qz-words">
                {satzPool.map((tok, i) => (
                  <button key={tok + i} className="qz-word" onClick={() => handleSatzPick(tok, i)}>{tok}</button>
                ))}
              </div>
              {satzFeedback?.correct ? (
                <div className="qz-feedback ok">
                  <span className="qz-fb-line"><Icon name="check" size={14} /> Perfekt! +{satzFeedback.xp} XP — „{satzFeedback.expected}"</span>
                </div>
              ) : satzFeedback && !satzFeedback.correct ? (
                <div className="qz-feedback bad">
                  <span className="qz-fb-line"><CircleX size={14} aria-hidden="true" /> Noch nicht ganz — richtige Positionen sind <b style={{ color: '#16a34a' }}>grün</b>, falsche <b style={{ color: '#dc2626' }}>rot</b>. Korrigiere die roten und versuche es erneut.</span>
                  <span className="qz-fb-sub">Du: „{satzFeedback.built?.join(' ') || satzBuilt.join(' ')}"</span>
                  <span className="qz-fb-sub st">Richtig: „{satzFeedback.expected}"</span>
                  <span className="qz-fb-sub">Tippe das rote Wort zum Entfernen, dann wähle das richtige.</span>
                </div>
              ) : null}
              {!satzFeedback?.correct && (
                <div className="qz-actions">
                  <button className="btn dark" disabled={satzBuilt.length === 0} onClick={checkSatz} style={satzFeedback && !satzFeedback.correct ? { background: '#dc2626' } : undefined}>{satzFeedback && !satzFeedback.correct ? 'Nochmal versuchen →' : 'Prüfen'}</button>
                </div>
              )}
              {satzFeedback && !satzFeedback.correct && (
                <div className="qz-actions">
                  <button className="btn small light" onClick={() => { setSatzBuilt([]); setSatzPool(satzQueue[satzIdx].shuffled); setSatzFeedback(null); }}><RotateCcw size={14} aria-hidden="true" /> Zurücksetzen</button>
                  <button className="btn small light" onClick={() => { setSatzBuilt([...satzQueue[satzIdx].tokens]); setSatzPool([]); setSatzFeedback(null); }}><Eye size={14} aria-hidden="true" /> Lösung zeigen</button>
                  <button className="btn small light" onClick={() => { setSatzFeedback(null); if (satzIdx + 1 >= satzQueue.length) { setSatzActive(false); setQuizStarted(false); } else { const ni = satzIdx + 1; setSatzIdx(ni); setSatzBuilt([]); setSatzPool(satzQueue[ni].shuffled); } }}>Überspringen →</button>
                </div>
              )}
            </>
          )}
          {!satzActive && satzScore.total === satzQueue.length && (
            <div className="qz-done">
              <div style={{ display: 'flex', justifyContent: 'center' }}><PartyPopper size={28} aria-hidden="true" style={{ color: '#3fa970' }} /></div>
              <h3>Satz fertig! {satzScore.correct}/{satzScore.total} · +{satzScore.xp} XP</h3>
              <div className="qz-actions">
                <button className="btn dark" onClick={() => { setQuizStarted(false); setSatzActive(false); }}>Fertig</button>
                <button className="btn light" onClick={() => startSatzGame(8)}>Nochmal</button>
              </div>
            </div>
          )}
        </>
      ) : quizMode === 'rain' ? (
        <>
          {!rainActive && rainLives <= 0 ? (
            <div className="qz-done">
              <div style={{ display: 'flex', justifyContent: 'center' }}><Skull size={28} aria-hidden="true" style={{ color: '#6b6b7a' }} /></div>
              <h3>Sturm vorbei!</h3>
              <p className="qz-done-sub">{rainScore.correct}/{rainScore.total} richtig · beste Serie {rainScore.best} · +{rainScore.xp} XP</p>
              <div className="qz-actions">
                <button className="btn dark" onClick={() => { setQuizStarted(false); setRainActive(false); }}>Fertig</button>
                <button className="btn light" onClick={() => startRainGame(10)}>Nochmal versuchen</button>
              </div>
            </div>
          ) : rainQueue[rainIdx] ? (
            <>
              <div className="question-wrap qz-tight">
                <span className="eyebrow">WORTSTURM · FALLENDES WORT</span>
                <div className="qz-rain-word">{rainQueue[rainIdx].word.article ? `${rainQueue[rainIdx].word.article} ` : ''}{rainQueue[rainIdx].word.german}</div>
                <p className="qz-qmeta">{rainQueue[rainIdx].word.lektion} · {rainQueue[rainIdx].word.plural ? `Pl: ${rainQueue[rainIdx].word.plural}` : ''}</p>
              </div>
              {rainFeedback ? (
                <div className={`qz-feedback ${rainFeedback.correct ? 'ok' : 'bad'}`}>
                  <span className="qz-fb-line">{rainFeedback.correct ? <Icon name="check" size={14} /> : rainFeedback.timeout ? <Timer size={14} aria-hidden="true" /> : <CircleX size={14} aria-hidden="true" />}{rainFeedback.correct ? `+${rainFeedback.xp} XP` : rainFeedback.timeout ? `Zeit ab! War „${typeof rainFeedback.expected === 'object' ? rainFeedback.expected.en : rainFeedback.expected}"` : `War „${typeof rainFeedback.expected === 'object' ? rainFeedback.expected.en : rainFeedback.expected}" • ${typeof rainFeedback.expected === 'object' ? rainFeedback.expected.fa : ''}`}</span>
                </div>
              ) : (
                <div className="answer-grid qz-one">
                  {rainOptions.map((opt, i) => {
                    const en = typeof opt === 'object' ? opt.en : opt;
                    const fa = typeof opt === 'object' ? opt.fa : '';
                    return (
                      <button key={en + i} className="qz-tile" onClick={() => handleRainPick(opt)}>
                        <span>{String.fromCharCode(65 + i)}</span>
                        <b>{en}</b>
                        {fa && <small className="qz-opt-fa">{fa}</small>}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </>
      ) : quizMode === 'diktat' ? (
        <>
          {currentQuizWord && (
            <>
              <div className="question-wrap qz-tight">
                <span className="eyebrow">{diktatKind === 'find-error' ? 'DIKTAT-CHECK — Welches ist FALSCH geschrieben?' : 'DIKTAT-CHECK — Welches ist RICHTIG geschrieben?'}</span>
                <p className="qz-qmeta">Frage {quizIdx + 1}/{quizQueue.length} · Einzelwort · ohne Artikel · {currentQuizWord.lektion}</p>
                <div className={`qz-q ${questionFade ? 'qz-q-fading' : ''}`}>
                  {diktatKind === 'find-correct' ? (
                    <>
                      <p className="qz-prompt">{diktatHint?.en || currentQuizWord.meaning_en || currentQuizWord.english}</p>
                      {diktatHint?.fa && <p className="qz-sub-fa">{diktatHint.fa}</p>}
                      <button className="speak-button" onClick={() => speakGerman(diktatCorrect || currentQuizWord.german)}><Icon name="sound" size={16} /> Anhören</button>
                    </>
                  ) : (
                    <p className="qz-prompt">3 sind richtig geschrieben — 1 hat einen Fehler. Finde den Fehler!</p>
                  )}
                </div>
              </div>
              <div className="answer-grid qz-choice-grid" key={choiceAnimKey}>
                {(diktatOptions || []).map((opt, i) => {
                  const de = typeof opt === 'object' ? (opt.de || opt.text || opt.en) : opt;
                  const isCorrect = choiceCorrectLocked && diktatCorrect ? de === diktatCorrect : false;
                  const isEliminated = choiceEliminated ? choiceEliminated.has(de) : false;
                  const isLocked = !!choiceCorrectLocked;
                  const isLeft = i % 2 === 0;
                  const exiting = choiceTransition === 'exiting';
                  const isReturning = choiceTransition === 'returning';
                  const isEntering = choiceTransition === 'entering';
                  const animDelay = (isEntering || isReturning || choiceTransition === 'idle') ? `${i * 65}ms` : '0ms';
                  const state = isLocked ? (isCorrect ? 'correct' : 'dim') : isEliminated ? 'dim' : '';
                  return (
                    <button
                      key={de + '-' + i + '-' + choiceAnimKey}
                      onClick={() => handleDiktatSelect && handleDiktatSelect(de)}
                      disabled={isLocked || isEliminated || exiting || isReturning}
                      className={`qz-tile ${state} ${isCorrect && isLocked ? 'qz-tile-pop' : ''} ${isEliminated ? 'qz-tile-elim' : ''} ${isEntering ? 'qz-tile-enter' : ''} ${isReturning ? (isLeft ? 'qz-tile-back-l' : 'qz-tile-back-r') : ''}`}
                      style={{
                        animationDelay: animDelay,
                        pointerEvents: (isLocked || isEliminated || exiting || isReturning) ? 'none' : 'auto',
                        cursor: (isLocked || isEliminated || exiting || isReturning) ? 'default' : 'pointer',
                        ...(exiting ? { transform: isLeft ? 'translateX(-130%)' : 'translateX(130%)', opacity: 0, transition: 'transform 380ms cubic-bezier(0.4,0,0.2,1), opacity 280ms ease, background-color 200ms, border-color 200ms' } : { transition: 'background-color 200ms, border-color 200ms, opacity 200ms, transform 200ms' }),
                      }}
                    >
                      <span>{String.fromCharCode(65 + i)}</span>
                      <b className="qz-word-de">{de}</b>
                      {isCorrect && isLocked && <Icon name="check" size={16} />}
                    </button>
                  );
                })}
              </div>
              {choiceCorrectLocked && (
                <div className="qz-feedback ok">
                  <span className="qz-fb-line"><Icon name="check" size={14} />{diktatKind === 'find-error' ? `Fehler gefunden! Richtig: „${currentQuizWord.german}"` : `Richtig: „${diktatCorrect}"`} +{QUIZ_XP.diktat} XP</span>
                  {diktatKind === 'find-error'
                    ? <span className="qz-fb-sub">{currentQuizWord.meaning_en || currentQuizWord.english || ''}</span>
                    : <span className="qz-fb-sub">{currentQuizWord.lektion} · {currentQuizWord.meaning_en || currentQuizWord.english || ''}</span>}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {currentQuizWord && (
            <>
              {(quizMode === 'artikel' || (quizMode === 'mixed' && currentQuizWord.article && quizIdx % 2 === 0)) ? (
                <>
                  <div className="question-wrap">
                    <span className="eyebrow">ARTIKEL — WÄHLE DEN ARTIKEL</span>
                    <h1>{currentQuizWord.german}</h1>
                    <p className="qz-sub">- {currentQuizWord.meaning_en}</p>
                    <p className="qz-sub-fa">{currentQuizWord.meaning_fa}</p>
                    <p className="qz-qmeta">{currentQuizWord.lektion} · {currentQuizWord.example}</p>
                  </div>
                  {!quizFeedback ? (
                    <div className="qz-artikel-row">
                      {['der', 'die', 'das'].map((a) => (
                        <button key={a} className="qz-artikel" style={{ borderColor: genderColor(a), color: quizArtikelChoice === a ? '#fff' : genderColor(a), background: quizArtikelChoice === a ? genderColor(a) : '#fff' }} onClick={() => setQuizArtikelChoice(a)}>{a}</button>
                      ))}
                    </div>
                  ) : (
                    <div className={`qz-feedback ${quizFeedback.correct ? 'ok' : 'bad'}`}>
                      <span className="qz-fb-line">{quizFeedback.correct ? <Icon name="check" size={14} /> : <CircleX size={14} aria-hidden="true" />}{quizFeedback.correct ? `Richtig! +${quizFeedback.xp} XP` : `War „${quizFeedback.expected}"`}</span>
                      {quizFeedback.expectedFa && <span className="qz-fb-sub">{quizFeedback.expectedFa}</span>}
                    </div>
                  )}
                  {!quizFeedback ? (
                    <div className="qz-actions"><button className="btn dark qz-btn-block" disabled={!!quizSubmitting || !quizArtikelChoice} onClick={submitQuiz}>Prüfen</button></div>
                  ) : (
                    <div className="qz-actions"><button className="btn dark qz-btn-block" onClick={nextQuiz}>{quizIdx + 1 >= quizQueue.length ? 'Abschließen' : 'Weiter'}</button></div>
                  )}
                </>
              ) : quizMode === 'choice' ? (
                <>
                  <div className="question-wrap">
                    <span className="eyebrow">4-CHOICE — RICHTIGE BEDEUTUNG WÄHLEN</span>
                    <div className={`qz-q ${questionFade ? 'qz-q-fading' : ''}`}>
                      <h1 style={currentQuizWord.article ? { color: genderColor(currentQuizWord.article) } : undefined}>{currentQuizWord.article ? `${currentQuizWord.article} ` : ''}{currentQuizWord.german}</h1>
                      <p className="qz-qmeta">{currentQuizWord.lektion} · {currentQuizWord.plural ? `Pl: ${currentQuizWord.plural}` : currentQuizWord.example?.slice(0, 48) || currentQuizWord.type}</p>
                    </div>
                    <button className="speak-button" onClick={() => speakGerman(currentQuizWord.german)}><Icon name="sound" size={16} /> Anhören</button>
                  </div>
                  <div className="answer-grid qz-choice-grid" key={choiceAnimKey}>
                    {choiceOptions.map((opt, i) => {
                      const en = typeof opt === 'object' ? opt.en : opt;
                      const fa = typeof opt === 'object' ? opt.fa : '';
                      const isCorrect = choiceCorrectEn ? en === choiceCorrectEn : false;
                      const isEliminated = choiceEliminated ? choiceEliminated.has(en) : false;
                      const isLocked = !!choiceCorrectLocked;
                      const isLeft = i % 2 === 0;
                      const exiting = choiceTransition === 'exiting';
                      const isReturning = choiceTransition === 'returning';
                      const isEntering = choiceTransition === 'entering';
                      const animDelay = (isEntering || isReturning || choiceTransition === 'idle') ? `${i * 65}ms` : '0ms';
                      const state = isLocked ? (isCorrect ? 'correct' : 'dim') : isEliminated ? 'dim' : '';
                      return (
                        <button
                          key={en + '-' + i + '-' + choiceAnimKey}
                          onClick={() => handleChoiceSelect && handleChoiceSelect(opt)}
                          disabled={isLocked || isEliminated || exiting || isReturning}
                          className={`qz-tile ${state} ${isCorrect && isLocked ? 'qz-tile-pop' : ''} ${isEliminated ? 'qz-tile-elim' : ''} ${isEntering ? 'qz-tile-enter' : ''} ${isReturning ? (isLeft ? 'qz-tile-back-l' : 'qz-tile-back-r') : ''}`}
                          style={{
                            animationDelay: animDelay,
                            pointerEvents: (isLocked || isEliminated || exiting || isReturning) ? 'none' : 'auto',
                            cursor: (isLocked || isEliminated || exiting || isReturning) ? 'default' : 'pointer',
                            ...(exiting ? { transform: isLeft ? 'translateX(-130%)' : 'translateX(130%)', opacity: 0, transition: 'transform 380ms cubic-bezier(0.4,0,0.2,1), opacity 280ms ease, background-color 200ms, border-color 200ms' } : { transition: 'background-color 200ms, border-color 200ms, opacity 200ms, transform 200ms' }),
                          }}
                        >
                          <span>{String.fromCharCode(65 + i)}</span>
                          <b><span className="qz-opt-en">{en}</span>{fa && <small className="qz-opt-fa">{fa}</small>}</b>
                          {isCorrect && isLocked && <Icon name="check" size={16} />}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : quizMode === 'fa' ? (
                <>
                  <div className="question-wrap">
                    <span className="eyebrow">FARSI — TIPPE DIE PERSISCHE BEDEUTUNG</span>
                    <h1>{currentQuizWord.german} <span className="qz-art" style={{ color: genderColor(currentQuizWord.article) }}>{currentQuizWord.article || ''}</span></h1>
                    <p className="qz-sub">{currentQuizWord.meaning_en} · {currentQuizWord.lektion}</p>
                    <button className="speak-button" onClick={() => speakGerman(currentQuizWord.german)}><Icon name="sound" size={16} /> Anhören</button>
                  </div>
                  {!quizFeedback ? (
                    <div className="qz-inputzone">
                      <div className="search-box">
                        <input value={quizAnswer} onChange={(e) => setQuizAnswer(e.target.value)} placeholder="فارسی را تایپ کنید..." onKeyDown={(e) => { if (e.key === 'Enter' && !quizSubmitting) submitQuiz(); }} autoFocus />
                      </div>
                      <button className="btn dark qz-btn-block" disabled={!!quizSubmitting || !quizAnswer.trim()} onClick={submitQuiz}>Prüfen</button>
                    </div>
                  ) : (
                    <>
                      <div className={`qz-feedback ${quizFeedback.correct ? 'ok' : 'bad'}`}>
                        <span className="qz-fb-line">{quizFeedback.correct ? <Icon name="check" size={14} /> : <CircleX size={14} aria-hidden="true" />}{quizFeedback.correct ? `Richtig! „${quizFeedback.expectedFa}" +${quizFeedback.xp} XP` : `„${quizAnswer.trim()}" ist falsch → „${quizFeedback.expectedFa}"`}</span>
                      </div>
                      <div className="qz-actions"><button className="btn dark qz-btn-block" onClick={nextQuiz}>{quizIdx + 1 >= quizQueue.length ? 'Abschließen' : 'Weiter'}</button></div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="question-wrap">
                    <span className="eyebrow">DIKTATION — HÖRE UND TIPPE (UMLAUTE WICHTIG!)</span>
                    <h1>{currentQuizWord.meaning_en || currentQuizWord.english || ''}</h1>
                    <p className="qz-qmeta">{currentQuizWord.lektion}</p>
                    <p className="qz-sub-fa">{currentQuizWord.meaning_fa}</p>
                    <div className="listen-row">
                      <button onClick={() => speakGerman(currentQuizWord.german)}><Icon name="sound" size={16} /> Wort abspielen</button>
                      <button onClick={() => speakGerman(currentQuizWord.example)}><Icon name="sound" size={16} /> Satz anhören</button>
                    </div>
                  </div>
                  {!quizFeedback ? (
                    <div className="qz-inputzone">
                      <div className="search-box">
                        <input value={quizAnswer} onChange={(e) => setQuizAnswer(e.target.value)} placeholder="Tippe das deutsche Wort..." onKeyDown={(e) => { if (e.key === 'Enter' && !quizSubmitting) submitQuiz(); }} autoFocus />
                      </div>
                      <div className="qz-umlauts">
                        {['ä', 'ö', 'ü', 'Ä', 'Ö', 'Ü', 'ß'].map((ch) => (
                          <button key={ch} className="btn small light qz-umlaut" onClick={() => insertUmlaut(ch)}>{ch}</button>
                        ))}
                        <button className="btn small light" onClick={() => setQuizAnswer('')}>Leeren</button>
                      </div>
                      <button className="btn dark qz-btn-block" disabled={!!quizSubmitting || !quizAnswer.trim()} onClick={submitQuiz}>Prüfen</button>
                    </div>
                  ) : (
                    <>
                      <div className={`qz-feedback ${quizFeedback.correct ? 'ok' : 'bad'}`}>
                        <span className="qz-fb-line">{quizFeedback.correct ? <Icon name="check" size={14} /> : <CircleX size={14} aria-hidden="true" />}{quizFeedback.correct ? `Richtig! „${quizFeedback.expected}" +${quizFeedback.xp} XP` : `„${quizAnswer.trim()}" → „${quizFeedback.expected}"`}</span>
                        {!quizFeedback.correct && <span className="qz-fb-sub">Umlaute: ä ≠ a, ö ≠ o, ü ≠ u, ß ≠ ss</span>}
                      </div>
                      <div className="qz-actions"><button className="btn dark qz-btn-block" onClick={nextQuiz}>{quizIdx + 1 >= quizQueue.length ? 'Abschließen' : 'Weiter'}</button></div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}