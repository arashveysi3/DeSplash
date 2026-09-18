import { Block } from 'baseui/block';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { Select } from 'baseui/select';
import { Input } from 'baseui/input';
import { ProgressBar } from 'baseui/progress-bar';
import { Heading, HeadingLevel } from 'baseui/heading';
import { LabelSmall, ParagraphSmall, DisplaySmall } from 'baseui/typography';
import { BOOKS, lektionenForBook } from '../../data/menschen.js';
import { QUIZ_XP, GAME_XP } from '../../srs.js';
import { genderColor } from '../../theme';
import { speakGerman } from '../../utils/speak';
import UberCard from '../cards/UberCard.jsx';

export default function QuizTab(props) {
  const {
    quizBook, setQuizBook, quizLektions, setQuizLektions, quizBookMeta,
    quizMode, setQuizMode, quizStarted, setQuizStarted,
    quizScopeWords, weakIds, allWords,
    startQuiz, quizQueue, quizIdx, currentQuizWord,
    choiceOptions, choicePick, setChoicePick,
    quizAnswer, setQuizAnswer, quizArtikelChoice, setQuizArtikelChoice,
    quizFeedback, quizScore, submitQuiz, nextQuiz, insertUmlaut,
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
  } = props;

  if (!quizStarted) {
    return (
      <>
        <UberCard styleOverride={{ backgroundColor:'#f7f7f7', borderColor:'#e5e5e5' }}>
          <Heading $style={{fontSize:16, margin:0}}>Quiz — scoped to book & Lektion</Heading>
          <ParagraphSmall color="#6b6b6b">Dictation (ä ö ü ß), Artikel, and فارسی modes. Supports multi-Lektion scope.</ParagraphSmall>
          <Block display="flex" gridGap="8px" marginTop="10px" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
            <Select options={BOOKS.map(b=> ({id:b.id, label:b.label}))} value={[{id:quizBook, label: quizBookMeta?.label}]} onChange={({value})=> { setQuizBook(value[0].id); setQuizLektions([]); }} size="compact" overrides={{ControlContainer:{style:{minWidth:'140px', borderRadius:'999px'}}}} />
          </Block>
          <Block display="flex" gridGap="6px" marginTop="10px" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
            {lektionenForBook(quizBook).map(l=>{
              const active = quizLektions.includes(l.lektion);
              return (
                <Button key={l.lektion} size={SIZE.mini} kind={active?KIND.primary:KIND.secondary} shape={SHAPE.pill}
                  overrides={{BaseButton:{style:{fontWeight:700, fontSize:11, backgroundColor: active? '#0f0f12':'#fff', color: active?'#fff':'#0f0f12'}}}}
                  onClick={()=> setQuizLektions(prev=> prev.includes(l.lektion) ? prev.filter(x=>x!==l.lektion) : [...prev,l.lektion])}>
                  {active?'✓ ':''}{l.lektion}
                </Button>
              );
            })}
            <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setQuizLektions([])}>All</Button>
            <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setQuizLektions(lektionenForBook(quizBook).map(x=>x.lektion))}>All +</Button>
          </Block>
          <Block display="flex" gridGap="8px" marginTop="12px" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
            <Button size={SIZE.compact} shape={SHAPE.pill} kind={quizMode==='dictation'?KIND.primary:KIND.secondary} onClick={()=> setQuizMode('dictation')}>Dictation DE</Button>
            <Button size={SIZE.compact} shape={SHAPE.pill} kind={quizMode==='artikel'?KIND.primary:KIND.secondary} onClick={()=> setQuizMode('artikel')}>Artikel</Button>
            <Button size={SIZE.compact} shape={SHAPE.pill} kind={quizMode==='mixed'?KIND.primary:KIND.secondary} onClick={()=> setQuizMode('mixed')}>Mixed</Button>
            <Button size={SIZE.compact} shape={SHAPE.pill} kind={quizMode==='choice'?KIND.primary:KIND.secondary} onClick={()=> setQuizMode('choice')}>4-Choice ✨</Button>
            <Button size={SIZE.compact} shape={SHAPE.pill} kind={quizMode==='fa'?KIND.primary:KIND.secondary} onClick={()=> setQuizMode('fa')}>DE → فارسی</Button>
          </Block>
          <Block display="flex" gridGap="8px" marginTop="12px">
            <Button shape={SHAPE.pill} onClick={()=> startQuiz(quizMode, 5)}>Start 5</Button>
            <Button shape={SHAPE.pill} kind={KIND.secondary} onClick={()=> startQuiz(quizMode, 10)}>Start 10</Button>
            <Button shape={SHAPE.pill} kind={KIND.secondary} onClick={()=> startQuiz(quizMode, 20)}>Start 20</Button>
          </Block>
          <ParagraphSmall color="#9a9a9a" marginTop="8px">{quizScopeWords.length} words in {quizBookMeta?.label} {quizLektions.length? quizLektions.join(', ') : 'whole book'} • {quizScopeWords.filter(w=> weakIds.has(w.id)).length} weak • {quizScopeWords.filter(w=> w.article).length} nouns</ParagraphSmall>
        </UberCard>
        <Block display="flex" flexDirection="column" gridGap="10px" marginTop="12px">
          <UberCard styleOverride={{paddingTop:'12px', paddingBottom:'12px', borderLeftWidth:'3px', borderLeftColor:'#4f46e5'}}>
            <ParagraphSmall margin={0}><b>4-Choice ✨ NEW:</b> German word → pick 1 of 4 English meanings. Distractors from same Lektion so you really have to know it. <b>+{QUIZ_XP.choice} XP</b> per correct. Most efficient way to earn!</ParagraphSmall>
          </UberCard>
          <UberCard styleOverride={{paddingTop:'12px', paddingBottom:'12px'}}>
            <ParagraphSmall margin={0}><b>Dictation:</b> Hear German → type exact word (<b>ä ö ü Ä Ö Ü ß</b> strict). <b>+{QUIZ_XP.dictation} XP</b>.</ParagraphSmall>
          </UberCard>
          <UberCard styleOverride={{paddingTop:'12px', paddingBottom:'12px'}}>
            <ParagraphSmall margin={0}><b>Artikel:</b> Pick <span style={{color:genderColor('der'), fontWeight:700}}>der</span> / <span style={{color:genderColor('die'), fontWeight:700}}>die</span> / <span style={{color:genderColor('das'), fontWeight:700}}>das</span>. <b>+{QUIZ_XP.artikel} XP</b>.</ParagraphSmall>
          </UberCard>
          <UberCard styleOverride={{paddingTop:'12px', paddingBottom:'12px'}}>
            <ParagraphSmall margin={0}><b>فارسی:</b> See German → type Persian meaning exactly. <b>+{QUIZ_XP.fa} XP</b>.</ParagraphSmall>
          </UberCard>
        </Block>
        <Heading $style={{fontSize:16, margin:'16px 0 8px'}}>🎮 Games — DE ↔ EN + فارسی</Heading>
        <ParagraphSmall color="#6b6b6b" margin="0 0 8px">Left side German • Right side English + فارسی. Every game uses your multi-Lektion scope.</ParagraphSmall>
        <Block display="flex" flexDirection="column" gridGap="12px">
          <UberCard styleOverride={{background:'linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#a78bfa 100%)', color:'#fff', borderWidth:0, paddingTop:'16px', paddingBottom:'16px', boxShadow:'0 12px 28px rgba(79,70,229,0.28)'}} >
            <Block display="flex" justifyContent="space-between" alignItems="center">
              <Block>
                <div style={{fontWeight:800, fontSize:15, display:'flex', alignItems:'center', gap:6}}><span style={{background:'rgba(255,255,255,0.18)', padding:'4px 8px', borderRadius:999, fontSize:12}}>🧩</span> Match Dash</div>
                <div style={{fontSize:12, opacity:0.92, marginTop:4}}>DE ↔ EN+FA • 6 pairs • no spoilers</div>
                <div style={{fontSize:11, opacity:0.78, marginTop:2}}>+{GAME_XP.matchPair}/pair + {GAME_XP.matchPerfectBonus} perfect = ~40 XP</div>
              </Block>
              <Button size={SIZE.compact} shape={SHAPE.pill} overrides={{BaseButton:{style:{backgroundColor:'#fff', color:'#4f46e5', fontWeight:800, boxShadow:'0 4px 12px rgba(0,0,0,0.12)'}}}} onClick={()=> startQuiz('match', 6)}>Play →</Button>
            </Block>
          </UberCard>
          <UberCard styleOverride={{background:'linear-gradient(135deg,#ea580c 0%,#f97316 55%,#f59e0b 100%)', color:'#fff', borderWidth:0, paddingTop:'16px', paddingBottom:'16px', boxShadow:'0 12px 28px rgba(234,88,12,0.22)'}}>
            <Block display="flex" justifyContent="space-between" alignItems="center">
              <Block>
                <div style={{fontWeight:800, fontSize:15, display:'flex', alignItems:'center', gap:6}}><span style={{background:'rgba(255,255,255,0.18)', padding:'4px 8px', borderRadius:999, fontSize:12}}>⚡</span> Lightning Sprint</div>
                <div style={{fontSize:12, opacity:0.92, marginTop:4}}>45s • DE → EN+FA • 2× streak</div>
                <div style={{fontSize:11, opacity:0.78, marginTop:2}}>+{GAME_XP.sprintBase} base / correct</div>
              </Block>
              <Button size={SIZE.compact} shape={SHAPE.pill} overrides={{BaseButton:{style:{backgroundColor:'#fff', color:'#ea580c', fontWeight:800}}}} onClick={()=> startQuiz('sprint', 12)}>Sprint →</Button>
            </Block>
          </UberCard>
          <UberCard styleOverride={{background:'linear-gradient(135deg,#0f0f12 0%,#2a2a3a 55%,#4f46e5 100%)', color:'#fff', borderWidth:0, paddingTop:'16px', paddingBottom:'16px', boxShadow:'0 12px 28px rgba(15,15,18,0.22)'}}>
            <Block display="flex" justifyContent="space-between" alignItems="center">
              <Block>
                <div style={{fontWeight:800, fontSize:15, display:'flex', alignItems:'center', gap:6}}><span style={{background:'rgba(255,255,255,0.14)', padding:'4px 8px', borderRadius:999, fontSize:12}}>🔨</span> SatzBau — Sentence Forge</div>
                <div style={{fontSize:12, opacity:0.92, marginTop:4}}>Rebuild the German sentence • scrambled words</div>
                <div style={{fontSize:11, opacity:0.78, marginTop:2}}>+{GAME_XP.scramblePerWord} XP / puzzle • word order mastery</div>
              </Block>
              <Button size={SIZE.compact} shape={SHAPE.pill} overrides={{BaseButton:{style:{backgroundColor:'#fff', color:'#0f0f12', fontWeight:800}}}} onClick={()=> startQuiz('satz', 8)}>Forge →</Button>
            </Block>
          </UberCard>
          <UberCard styleOverride={{background:'linear-gradient(135deg,#059669 0%,#0ea5e9 60%,#06b6d4 100%)', color:'#fff', borderWidth:0, paddingTop:'16px', paddingBottom:'16px', boxShadow:'0 12px 28px rgba(5,150,105,0.22)'}}>
            <Block display="flex" justifyContent="space-between" alignItems="center">
              <Block>
                <div style={{fontWeight:800, fontSize:15, display:'flex', alignItems:'center', gap:6}}><span style={{background:'rgba(255,255,255,0.18)', padding:'4px 8px', borderRadius:999, fontSize:12}}>🌧️</span> WortSturm — Word Rain</div>
                <div style={{fontSize:12, opacity:0.92, marginTop:4}}>6s per word • 3 lives • EN+FA choices</div>
                <div style={{fontSize:11, opacity:0.78, marginTop:2}}>Streak multiplier • arcade panic fun</div>
              </Block>
              <Button size={SIZE.compact} shape={SHAPE.pill} overrides={{BaseButton:{style:{backgroundColor:'#fff', color:'#059669', fontWeight:800}}}} onClick={()=> startQuiz('rain', 10)}>Drop →</Button>
            </Block>
          </UberCard>
          <ParagraphSmall color="#9a9a9a">{quizScopeWords.length} words in {quizBookMeta?.label} {quizLektions.length? quizLektions.join(', ') : 'whole book'}</ParagraphSmall>
        </Block>
      </>
    );
  }

  // quizStarted true
  return (
    <>
      <Block display="flex" justifyContent="space-between" alignItems="center" marginBottom="8px">
        <LabelSmall color="#6b6b6b">Quiz • {quizMode} • {quizBookMeta?.label} {quizLektions.length? quizLektions.join(', ') : 'whole book'}</LabelSmall>
        <LabelSmall color="#000" overrides={{Block:{style:{fontWeight:700}}}}>{quizScore.correct}/{quizScore.total} • {quizScore.xp} XP</LabelSmall>
      </Block>
      {quizMode==='match' ? (
        <>
          <Block display="flex" justifyContent="space-between" alignItems="center" marginBottom="8px">
            <LabelSmall color="#6b6b6b">DE ↔ EN+FA • {matchMatched}/6 pairs • {matchMoves} moves</LabelSmall>
            <LabelSmall color="#000" overrides={{Block:{style:{fontWeight:700}}}}>{matchXp} XP</LabelSmall>
          </Block>
          <div style={{display:'flex', justifyContent:'space-between', marginTop:10, padding:'0 2px', fontSize:10, fontWeight:800, letterSpacing:1, color:'#9aa0b2'}}>
            <span style={{flex:1, textAlign:'center'}}>DEUTSCH — LEFT</span>
            <span style={{flex:1, textAlign:'center'}}>EN + فارسی — RIGHT</span>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:8, alignItems:'start'}}>
            {/* LEFT — German */}
            <div style={{display:'flex', flexDirection:'column', gap:0, minWidth:0}}>
              {matchBoard.filter(t=> t.type==='de').map(t=> {
                const isFading = matchFadingIds?.has(t.uid);
                const isShake = matchShakeIds?.has(t.uid);
                const isWrong = matchWrongIds?.has(t.uid);
                const isMatched = t.matched;
                const isHidden = matchHiddenIds?.has(t.uid);
                const collapsed = isHidden;
                const borderColor = isWrong ? '#dc2626' : isMatched ? '#16a34a' : t.flipped ? '#0f0f12' : '#1a1a20';
                const bg = isHidden ? '#e6f9ed' : isFading ? '#e6f9ed' : isMatched ? '#e6f9ed' : isWrong ? '#fef2f2' : t.flipped ? '#ffffff' : '#0f0f12';
                const isGreen = isMatched || isFading || isHidden;
                return (
                <div key={t.uid} onClick={()=> handleMatchPick(t.uid)} className={`gs-match-card ${isFading ? 'gs-fading' : ''} ${isShake ? 'gs-shake' : ''} ${collapsed ? 'gs-matched-collapsed' : isMatched ? 'gs-matched' : ''}`} style={{minHeight: collapsed ? 0 : 84, height: collapsed ? 0 : 84, background: bg, border: collapsed ? '0px solid transparent' : `1.8px solid ${borderColor}`, borderRadius: collapsed ? 0 : 16, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding: collapsed ? '0px 8px' : '10px 8px', margin: collapsed ? '0px' : '0 0 10px 0', cursor: (isMatched || isFading || isHidden) ? 'default' : 'pointer', textAlign:'center', opacity: (isFading || isHidden) ? 0 : 1, transform: isShake ? undefined : isFading ? 'scale(0.95)' : t.flipped ? 'scale(1.02)' : 'scale(1)', transition:'opacity 0.38s cubic-bezier(0.2,0.8,0.2,1), transform 0.38s cubic-bezier(0.2,0.8,0.2,1), border-color 0.2s, background-color 0.2s, height 0.35s cubic-bezier(0.2,0.8,0.2,1), min-height 0.35s ease, margin 0.35s ease, padding 0.35s ease, border-width 0.35s ease', boxShadow: t.flipped && !isMatched && !isHidden ? '0 8px 20px rgba(15,15,18,0.10)': 'none', color: !t.flipped && !isWrong && !isMatched && !isHidden ? '#fff' : t.word.article? genderColor(t.word.article):'#0f0f12', overflow:'hidden', pointerEvents: (isMatched || isFading || isHidden) ? 'none' : 'auto'}}>
                    <div style={{fontWeight:800, fontSize:14, lineHeight:1.2, color: (t.flipped || isWrong || isGreen) ? (t.word.article? genderColor(t.word.article):'#0f0f12') : '#fff'}}>{t.label}</div>
                    <div style={{fontSize:10, color: (t.flipped || isWrong || isGreen) ? '#9aa0b2' : 'rgba(255,255,255,0.72)', marginTop: collapsed ? 0 : 3}}>{collapsed ? '' : t.sub}</div>
                    <div style={{fontSize:9, fontWeight:800, letterSpacing:0.6, color: (t.flipped || isWrong || isGreen) ? '#0f0f12' : 'rgba(255,255,255,0.9)', marginTop: collapsed ? 0 : 4, background: (t.flipped || isWrong || isGreen) ? '#f7f7fb' : 'rgba(255,255,255,0.16)', padding:'2px 6px', borderRadius:999, display: collapsed ? 'none' : 'block'}}>DE</div>
                </div>
              )})}
            </div>
            {/* RIGHT — EN+FA */}
            <div style={{display:'flex', flexDirection:'column', gap:0, minWidth:0}}>
              {matchBoard.filter(t=> t.type==='tr').map(t=> {
                const isFading = matchFadingIds?.has(t.uid);
                const isShake = matchShakeIds?.has(t.uid);
                const isWrong = matchWrongIds?.has(t.uid);
                const isMatched = t.matched;
                const isHidden = matchHiddenIds?.has(t.uid);
                const collapsed = isHidden;
                const borderColor = isWrong ? '#dc2626' : isMatched ? '#16a34a' : t.flipped ? '#0f0f12' : '#e9e8f0';
                const bg = isHidden ? '#e6f9ed' : isFading ? '#e6f9ed' : isMatched ? '#e6f9ed' : isWrong ? '#fef2f2' : t.flipped ? '#ffffff' : '#f7f7fb';
                const isGreen = isMatched || isFading || isHidden;
                return (
                <div key={t.uid} onClick={()=> handleMatchPick(t.uid)} className={`gs-match-card ${isFading ? 'gs-fading' : ''} ${isShake ? 'gs-shake' : ''} ${collapsed ? 'gs-matched-collapsed' : isMatched ? 'gs-matched' : ''}`} style={{minHeight: collapsed ? 0 : 84, height: collapsed ? 0 : 84, background: bg, border: collapsed ? '0px solid transparent' : `1.8px solid ${borderColor}`, borderRadius: collapsed ? 0 : 16, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding: collapsed ? '0px 8px' : '10px 8px', margin: collapsed ? '0px' : '0 0 10px 0', cursor: (isMatched || isFading || isHidden) ? 'default' : 'pointer', textAlign:'center', opacity: (isFading || isHidden) ? 0 : 1, transform: isShake ? undefined : isFading ? 'scale(0.95)' : t.flipped ? 'scale(1.02)' : 'scale(1)', transition:'opacity 0.38s cubic-bezier(0.2,0.8,0.2,1), transform 0.38s cubic-bezier(0.2,0.8,0.2,1), border-color 0.2s, background-color 0.2s, height 0.35s cubic-bezier(0.2,0.8,0.2,1), min-height 0.35s ease, margin 0.35s ease, padding 0.35s ease, border-width 0.35s ease', boxShadow: t.flipped && !isMatched && !isHidden ? '0 8px 20px rgba(15,15,18,0.10)': '0 2px 8px rgba(15,15,18,0.04)', color:'#0f0f12', overflow:'hidden', pointerEvents: (isMatched || isFading || isHidden) ? 'none' : 'auto'}}>
                    <div style={{fontWeight:700, fontSize:12, lineHeight:1.2}}>{collapsed ? '' : t.label}</div>
                    <div style={{fontSize:11, color:'#6b6b7a', marginTop: collapsed ? 0 : 2, fontFamily:'IRANSans, sans-serif', direction:'rtl', display: collapsed ? 'none' : 'block'}}>{t.sub}</div>
                    <div style={{fontSize:9, color:'#9aa0b2', marginTop: collapsed ? 0 : 2, display: collapsed ? 'none' : 'block'}}>{t.sub2}</div>
                    <div style={{fontSize:9, fontWeight:800, letterSpacing:0.6, color:'#4f46e5', marginTop: collapsed ? 0 : 4, background:'#eef2ff', padding:'2px 6px', borderRadius:999, display: collapsed ? 'none' : 'block'}}>EN+FA</div>
                </div>
              )})}
            </div>
          </div>
          {matchDone && (
            <UberCard styleOverride={{marginTop:'12px', textAlign:'center', backgroundColor:'#f0fdf4', borderColor:'#bbf7d0'}}>
              <div style={{fontSize:24}}>🎉</div>
              <div style={{fontWeight:800, marginTop:4}}>Match complete! {matchMatched}/6 in {matchMoves} moves</div>
              <div style={{fontSize:13, color:'#16a34a', marginTop:4}}>+{matchXp} XP earned</div>
              <Block display="flex" gridGap="8px" justifyContent="center" marginTop="12px">
                <Button shape={SHAPE.pill} onClick={()=> { setQuizStarted(false); setMatchStarted(false); }}>Done</Button>
                <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={startMatchGame}>Play again</Button>
              </Block>
            </UberCard>
          )}
          {!matchDone && <Block marginTop="12px" display="flex" justifyContent="center"><Button kind={KIND.secondary} size={SIZE.mini} shape={SHAPE.pill} onClick={()=> { setQuizStarted(false); setMatchStarted(false); }}>Exit game</Button></Block>}
        </>
      ) : quizMode==='sprint' ? (
        <>
          <Block display="flex" justifyContent="space-between" alignItems="center" marginBottom="8px">
            <LabelSmall color="#6b6b6b">⚡ Sprint • {sprintScore.correct}/{sprintScore.total} • streak {sprintScore.streak} (best {sprintScore.best})</LabelSmall>
            <Block display="flex" gridGap="8px" alignItems="center">
              <span style={{background: sprintTime<=10 ? '#fef2f2' : '#fff7ed', color: sprintTime<=10 ? '#dc2626' : '#ea580c', padding:'4px 8px', borderRadius:999, fontWeight:800, fontSize:12, border:'1px solid #ffedd5'}}>{sprintTime}s</span>
              <span style={{background:'#000', color:'#fff', padding:'4px 8px', borderRadius:999, fontWeight:800, fontSize:12}}>{sprintScore.xp} XP</span>
            </Block>
          </Block>
          <div style={{height:6, background:'#eee', borderRadius:999, overflow:'hidden'}}><div style={{height:'100%', width:`${(sprintTime/45)*100}%`, background: sprintTime<=10 ? '#dc2626' : '#ea580c', transition:'width 1s linear'}}/></div>
          {!sprintActive && sprintTime===0 ? (
            <UberCard styleOverride={{marginTop:'12px', textAlign:'center'}}>
              <div style={{fontSize:28}}>⏱️</div>
              <div style={{fontWeight:800, marginTop:6}}>Time&apos;s up!</div>
              <div style={{fontSize:13, color:'#6b6b6b', marginTop:4}}>{sprintScore.correct}/{sprintScore.total} correct • best streak {sprintScore.best} • +{sprintScore.xp} XP</div>
              <Block display="flex" gridGap="8px" justifyContent="center" marginTop="12px">
                <Button shape={SHAPE.pill} onClick={()=> { setQuizStarted(false); setSprintActive(false); }}>Done</Button>
                <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> startSprintGame(12)}>Again</Button>
              </Block>
            </UberCard>
          ) : sprintQueue[sprintIdx] ? (
            <UberCard styleOverride={{marginTop:'12px', minHeight:'260px'}}>
              <Block textAlign="center">
                <LabelSmall color="#6b6b6b">DE → EN + فارسی — pick the right translation</LabelSmall>
                <div style={{fontSize:26, fontWeight:800, marginTop:8, color: sprintQueue[sprintIdx].word.article ? genderColor(sprintQueue[sprintIdx].word.article): '#0f0f12'}}>{sprintQueue[sprintIdx].word.article ? `${sprintQueue[sprintIdx].word.article} ` : ''}{sprintQueue[sprintIdx].word.german}</div>
                <div style={{fontSize:11, color:'#9a9a9a'}}>{sprintQueue[sprintIdx].word.lektion} • {sprintQueue[sprintIdx].word.plural ? `Pl: ${sprintQueue[sprintIdx].word.plural}`: ''}</div>
                {sprintFeedback ? (
                  <Block marginTop="12px" padding="10px" backgroundColor={sprintFeedback.correct? '#dcfce7':'#fef2f2'} overrides={{Block:{style:{borderRadius:'12px'}}}}>
                    <LabelSmall>{sprintFeedback.correct ? `✅ +${sprintFeedback.xp} XP (×${(1+ sprintScore.streak*0.15).toFixed(2)})` : `❌ was "${typeof sprintFeedback.expected==='object'? sprintFeedback.expected.en : sprintFeedback.expected}" • ${typeof sprintFeedback.expected==='object'? sprintFeedback.expected.fa : ''}`}</LabelSmall>
                  </Block>
                ) : (
                  <Block display="grid" gridGap="8px" marginTop="14px" overrides={{Block:{style:{gridTemplateColumns:'1fr 1fr'}}}}>
                    {sprintOptions.map((opt,i)=> {
                      const en = typeof opt==='object'? opt.en : opt;
                      const fa = typeof opt==='object'? opt.fa : '';
                      return (
                      <Button key={en+i} kind={KIND.secondary} shape={SHAPE.pill} overrides={{BaseButton:{style:{backgroundColor:'#fff', borderColor:'#e9e8f0', borderWidth:'1.5px', fontWeight:600, minHeight:'56px', whiteSpace:'normal', lineHeight:1.2, flexDirection:'column', paddingTop:'8px', paddingBottom:'8px'}}}} onClick={()=> handleSprintPick(opt)}>
                        <span style={{fontWeight:700, fontSize:12}}>{en}</span>
                        {fa && <span style={{fontFamily:'IRANSans', direction:'rtl', fontSize:11, color:'#6b6b7a', marginTop:2}}>{fa}</span>}
                      </Button>
                      );
                    })}
                  </Block>
                )}
              </Block>
            </UberCard>
          ) : null}
          {sprintActive && <Block marginTop="12px" display="flex" justifyContent="center"><Button kind={KIND.secondary} size={SIZE.mini} shape={SHAPE.pill} onClick={()=> { setSprintActive(false); setQuizStarted(false); }}>Exit sprint</Button></Block>}
        </>
      ) : quizMode==='satz' ? (
        <>
          <Block display="flex" justifyContent="space-between" alignItems="center" marginBottom="8px">
            <LabelSmall color="#6b6b6b">🔨 Forge {satzIdx+1}/{satzQueue.length} • {satzScore.correct}/{satzScore.total} • {satzScore.xp} XP</LabelSmall>
            <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> { setSatzActive(false); setQuizStarted(false); }}>Exit</Button>
          </Block>
          {satzQueue[satzIdx] && (
            <UberCard styleOverride={{marginTop:'8px'}}>
              <Block textAlign="center">
                <LabelSmall color="#6b6b6b">Rebuild the sentence — tap words in order</LabelSmall>
                <div style={{fontSize:13, color:'#6b6b6b', marginTop:6, fontStyle:'italic'}}>Hint: {satzQueue[satzIdx].hintEn} <span style={{fontFamily:'IRANSans', direction:'rtl'}}>— {satzQueue[satzIdx].hintFa}</span> • {satzQueue[satzIdx].word.lektion}</div>
                <Block marginTop="8px" display="flex" justifyContent="center" gridGap="6px">
                  <Button size={SIZE.mini} shape={SHAPE.pill} onClick={()=> speakGerman(satzQueue[satzIdx].source || satzQueue[satzIdx].word.example || satzQueue[satzIdx].tokens.join(' '))}>🔊 Play sentence</Button>
                  <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> { setSatzBuilt([]); setSatzPool(satzQueue[satzIdx].shuffled); setSatzFeedback(null); }}>↺ Reset</Button>
                </Block>
                <div style={{minHeight:56, background:'#f7f7fb', border:'1.5px dashed #e9e8f0', borderRadius:14, padding:10, marginTop:12, display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', alignItems:'center'}}>
                  {satzBuilt.length===0 ? <span style={{color:'#9a9a9a', fontSize:12}}>Tap words below…</span> : satzBuilt.map((t,i)=> {
                    const isCorrectPos = satzFeedback && !satzFeedback.correct && satzFeedback.perPos ? satzFeedback.perPos[i] : null;
                    const bg = satzFeedback && !satzFeedback.correct ? (isCorrectPos ? '#dcfce7' : '#fee2e2') : '#0f0f12';
                    const color = satzFeedback && !satzFeedback.correct ? (isCorrectPos ? '#16a34a' : '#dc2626') : '#fff';
                    const border = satzFeedback && !satzFeedback.correct ? (isCorrectPos ? '1.5px solid #16a34a' : '1.5px solid #dc2626') : 'none';
                    return (
                    <span key={i} onClick={()=> handleSatzRemove(i)} style={{background:bg, color, padding:'6px 10px', borderRadius:999, fontWeight:700, fontSize:13, cursor:'pointer', border, transition:'all 0.2s'}}>{t} ×</span>
                  )})}
                </div>
                <Block display="flex" gridGap="6px" marginTop="12px" overrides={{Block:{style:{flexWrap:'wrap', justifyContent:'center'}}}}>
                  {satzPool.map((tok,i)=> (
                    <Button key={tok+i} size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} overrides={{BaseButton:{style:{background:'#fff', borderColor:'#e9e8f0', fontWeight:700}}}} onClick={()=> handleSatzPick(tok,i)}>{tok}</Button>
                  ))}
                </Block>
                {satzFeedback?.correct ? (
                  <Block marginTop="12px" padding="10px" backgroundColor={'#dcfce7'} overrides={{Block:{style:{borderRadius:12}}}}>
                    <LabelSmall>✅ Perfect! +{satzFeedback.xp} XP — “{satzFeedback.expected}”</LabelSmall>
                  </Block>
                ) : satzFeedback && !satzFeedback.correct ? (
                  <Block marginTop="12px" padding="10px" backgroundColor={'#fef2f2'} overrides={{Block:{style:{borderRadius:12}}}}>
                    <LabelSmall>❌ Not quite — correct positions in <span style={{color:'#16a34a', fontWeight:800}}>green</span>, wrong in <span style={{color:'#dc2626', fontWeight:800}}>red</span>. Fix the red ones and try again.</LabelSmall>
                    <div style={{marginTop:6, fontSize:12, color:'#6b6b6b'}}>You: “{satzFeedback.built?.join(' ') || satzBuilt.join(' ')}”</div>
                    <div style={{marginTop:4, fontSize:13, fontWeight:700, color:'#0f0f12'}}>Correct: “{satzFeedback.expected}”</div>
                    <div style={{marginTop:6, fontSize:11, color:'#9aa0b2'}}>Tap red word to remove it, then pick correct word.</div>
                  </Block>
                ) : null}
                {!satzFeedback?.correct && (
                  <Button shape={SHAPE.pill} disabled={satzBuilt.length===0} onClick={checkSatz} overrides={{BaseButton:{style:{marginTop:'14px', width:'100%', backgroundColor: satzFeedback && !satzFeedback.correct ? '#dc2626' : '#0f0f12'}}}}>{satzFeedback && !satzFeedback.correct ? 'Try again →' : 'Check'}</Button>
                )}
                {satzFeedback && !satzFeedback.correct && (
                  <Block display="flex" gridGap="6px" marginTop="8px">
                    <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} overrides={{BaseButton:{style:{flex:1}}}} onClick={()=> { setSatzBuilt([]); setSatzPool(satzQueue[satzIdx].shuffled); setSatzFeedback(null); }}>↺ Reset</Button>
                    <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} overrides={{BaseButton:{style:{flex:1}}}} onClick={()=> { setSatzBuilt([...satzQueue[satzIdx].tokens]); setSatzPool([]); setSatzFeedback(null); }}>👁 Show answer</Button>
                    <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} overrides={{BaseButton:{style:{flex:1}}}} onClick={()=> { setSatzFeedback(null); if (satzIdx+1>=satzQueue.length){ setSatzActive(false); setQuizStarted(false);} else { const ni=satzIdx+1; setSatzIdx(ni); setSatzBuilt([]); setSatzPool(satzQueue[ni].shuffled); } }}>Skip →</Button>
                  </Block>
                )}
              </Block>
            </UberCard>
          )}
          {!satzActive && satzScore.total===satzQueue.length && (
            <UberCard styleOverride={{marginTop:'12px', textAlign:'center', background:'#f0fdf4', borderColor:'#bbf7d0'}}>
              <div style={{fontSize:26}}>🎉</div>
              <div style={{fontWeight:800, marginTop:6}}>Forge complete! {satzScore.correct}/{satzScore.total} • +{satzScore.xp} XP</div>
              <Block display="flex" gridGap="8px" justifyContent="center" marginTop="12px">
                <Button shape={SHAPE.pill} onClick={()=> { setQuizStarted(false); setSatzActive(false); }}>Done</Button>
                <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> startSatzGame(8)}>Again</Button>
              </Block>
            </UberCard>
          )}
        </>
      ) : quizMode==='rain' ? (
        <>
          <Block display="flex" justifyContent="space-between" alignItems="center" marginBottom="8px">
            <LabelSmall color="#6b6b6b">🌧️ Sturm {rainIdx+1}/{rainQueue.length} • {rainScore.correct}/{rainScore.total} • streak {rainScore.streak}</LabelSmall>
            <Block display="flex" gridGap="6px" alignItems="center">
              <span style={{background: rainTime<=2 ? '#fef2f2':'#f0fdf4', color: rainTime<=2?'#dc2626':'#059669', padding:'4px 8px', borderRadius:999, fontWeight:800, fontSize:12}}>{rainTime}s</span>
              <span style={{fontSize:14}}>{'❤️'.repeat(rainLives)}{'🖤'.repeat(3-rainLives)}</span>
              <span style={{background:'#0f0f12', color:'#fff', padding:'4px 8px', borderRadius:999, fontWeight:800, fontSize:12}}>{rainScore.xp} XP</span>
            </Block>
          </Block>
          <div style={{height:6, background:'#e9e8f0', borderRadius:999, overflow:'hidden'}}><div style={{height:'100%', width:`${(rainTime/6)*100}%`, background: rainTime<=2? '#dc2626':'#0ea5e9', transition:'width 1s linear'}}/></div>
          {!rainActive && rainLives<=0 ? (
            <UberCard styleOverride={{marginTop:'12px', textAlign:'center'}}>
              <div style={{fontSize:28}}>💀</div>
              <div style={{fontWeight:800, marginTop:6}}>Storm over!</div>
              <div style={{fontSize:13, color:'#6b6b6b', marginTop:4}}>{rainScore.correct}/{rainScore.total} correct • best streak {rainScore.best} • +{rainScore.xp} XP</div>
              <Block display="flex" gridGap="8px" justifyContent="center" marginTop="12px">
                <Button shape={SHAPE.pill} onClick={()=> { setQuizStarted(false); setRainActive(false); }}>Done</Button>
                <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> startRainGame(10)}>Try again</Button>
              </Block>
            </UberCard>
          ) : rainQueue[rainIdx] ? (
            <UberCard styleOverride={{marginTop:'12px', minHeight:'260px', background: 'linear-gradient(180deg,#f7fdff 0%,#ffffff 100%)'}}>
              <Block textAlign="center">
                <div style={{fontSize:11, letterSpacing:1, color:'#0ea5e9', fontWeight:800}}>WORTSTURM • FALLING WORD</div>
                <div style={{marginTop:8, display:'inline-block', background:'linear-gradient(135deg,#0f0f12 0%,#1a1a2e 100%)', color:'#fff', padding:'12px 18px', borderRadius:16, fontWeight:800, fontSize:22, boxShadow:'0 8px 20px rgba(15,15,18,0.18)', animation:'gs-float 1.2s ease-in-out infinite'}}>{rainQueue[rainIdx].word.article? `${rainQueue[rainIdx].word.article} `:''}{rainQueue[rainIdx].word.german}</div>
                <div style={{fontSize:11, color:'#9aa0b2', marginTop:6}}>{rainQueue[rainIdx].word.lektion} • {rainQueue[rainIdx].word.plural? `Pl: ${rainQueue[rainIdx].word.plural}`: ''}</div>
                {rainFeedback ? (
                  <Block marginTop="12px" padding="10px" backgroundColor={rainFeedback.correct? '#dcfce7':'#fef2f2'} overrides={{Block:{style:{borderRadius:12}}}}>
                    <LabelSmall>{rainFeedback.correct? `✅ +${rainFeedback.xp} XP` : rainFeedback.timeout? `⏰ Time! was "${typeof rainFeedback.expected==='object'? rainFeedback.expected.en : rainFeedback.expected}"` : `❌ was "${typeof rainFeedback.expected==='object'? rainFeedback.expected.en : rainFeedback.expected}" • ${typeof rainFeedback.expected==='object'? rainFeedback.expected.fa : ''}`}</LabelSmall>
                  </Block>
                ) : (
                  <Block display="grid" gridGap="8px" marginTop="14px" overrides={{Block:{style:{gridTemplateColumns:'1fr'}}}}>
                    {rainOptions.map((opt,i)=> {
                      const en=typeof opt==='object'?opt.en:opt; const fa=typeof opt==='object'?opt.fa:'';
                      return (
                        <Button key={en+i} kind={KIND.secondary} shape={SHAPE.pill} overrides={{BaseButton:{style:{background:'#fff', borderColor:'#e9e8f0', borderWidth:'1.5px', fontWeight:700, minHeight:'52px', justifyContent:'space-between', paddingLeft:'16px', paddingRight:'16px'}}}} onClick={()=> handleRainPick(opt)}>
                          <span style={{fontWeight:700}}>{en}</span>
                          <span style={{fontFamily:'IRANSans', direction:'rtl', color:'#6b6b7a', fontSize:12}}>{fa}</span>
                        </Button>
                      )
                    })}
                  </Block>
                )}
              </Block>
            </UberCard>
          ) : null}
          {rainActive && <Block marginTop="12px" display="flex" justifyContent="center"><Button kind={KIND.secondary} size={SIZE.mini} shape={SHAPE.pill} onClick={()=> { setRainActive(false); setQuizStarted(false); }}>Exit storm</Button></Block>}
        </>
      ) : (
      <>
      <ProgressBar value={quizQueue.length ? (quizIdx/quizQueue.length)*100 : 0} overrides={{ BarProgress:{style:{backgroundColor:'#000'}}, BarContainer:{style:{backgroundColor:'#eee', height:'4px', borderRadius:'999px'}}, Bar:{style:{height:'4px'}} }} />
      {currentQuizWord && (
        <UberCard styleOverride={{marginTop:'12px', minHeight:'280px'}}>
          {(quizMode==='artikel' || (quizMode==='mixed' && currentQuizWord.article && quizIdx %2===0)) ? (
            <Block textAlign="center">
              <LabelSmall color="#6b6b6b">ARTIKEL — Wähle den Artikel</LabelSmall>
              <div style={{fontSize:28, fontWeight:800, marginTop:8}}>{currentQuizWord.german} <span style={{fontWeight:400, color:'#6b6b6b', fontSize:14}}>- {currentQuizWord.meaning_en}</span></div>
              <div style={{fontSize:12, color:'#9a9a9a', marginTop:4, fontFamily:'IRANSans', direction:'rtl'}}>{currentQuizWord.meaning_fa}</div>
              <div style={{fontSize:12, color:'#9a9a9a', marginTop:4}}>{currentQuizWord.lektion} • {currentQuizWord.example}</div>
              {!quizFeedback ? (
                <Block display="flex" gridGap="8px" marginTop="16px" justifyContent="center">
                  {['der','die','das'].map(a=>(
                    <Button key={a} shape={SHAPE.pill} kind={quizArtikelChoice===a?KIND.primary:KIND.secondary} onClick={()=> setQuizArtikelChoice(a)} overrides={{BaseButton:{style:{flex:1, backgroundColor: quizArtikelChoice===a ? genderColor(a) : undefined, borderColor: genderColor(a)}}}}>{a}</Button>
                  ))}
                </Block>
              ) : (
                <Block marginTop="12px" padding="10px" backgroundColor={quizFeedback.correct ? '#dcfce7' : '#fef2f2'} overrides={{Block:{style:{borderRadius:'12px'}}}}>
                  <LabelSmall>{quizFeedback.correct ? '✅ Correct!' : `Was "${quizFeedback.expected}"`} {quizFeedback.correct ? `+${quizFeedback.xp} XP` : ''}</LabelSmall>
                  {quizFeedback.expectedFa && <div style={{fontFamily:'IRANSans', direction:'rtl', fontSize:12, color:'#6b6b6b'}}>{quizFeedback.expectedFa}</div>}
                </Block>
              )}
              {!quizFeedback ? (
                <Button shape={SHAPE.pill} disabled={!quizArtikelChoice} onClick={submitQuiz} overrides={{BaseButton:{style:{marginTop:'16px', width:'100%'}}}}>Check</Button>
              ) : (
                <Button shape={SHAPE.pill} onClick={nextQuiz} overrides={{BaseButton:{style:{marginTop:'16px', width:'100%'}}}}>{quizIdx+1>=quizQueue.length ? 'Finish' : 'Next'}</Button>
              )}
            </Block>
          ) : quizMode==='choice' ? (
            <Block textAlign="center">
              <LabelSmall color="#6b6b6b">4-CHOICE — Pick the right meaning</LabelSmall>
              <div style={{fontSize:26, fontWeight:800, marginTop:8, color: currentQuizWord.article ? genderColor(currentQuizWord.article) : '#000'}}>{currentQuizWord.article ? `${currentQuizWord.article} ` : ''}{currentQuizWord.german}</div>
              <div style={{fontSize:12, color:'#9a9a9a', marginTop:2, fontFamily:'IRANSans', direction:'rtl'}}>{currentQuizWord.meaning_fa}</div>
              <div style={{fontSize:11, color:'#9a9a9a'}}>{currentQuizWord.lektion} • {currentQuizWord.plural ? `Pl: ${currentQuizWord.plural}` : currentQuizWord.example?.slice(0,48)}</div>
              <Block marginTop="10px"><Button size={SIZE.mini} shape={SHAPE.pill} onClick={()=> speakGerman(currentQuizWord.german)}>🔊 Listen</Button></Block>
              {!quizFeedback ? (
                <Block display="grid" gridGap="8px" marginTop="14px" overrides={{Block:{style:{gridTemplateColumns:'1fr 1fr'}}}}>
                  {choiceOptions.map((opt,i)=> {
                    const en = typeof opt==='object'? opt.en : opt;
                    const fa = typeof opt==='object'? opt.fa : '';
                    const pickedEn = typeof choicePick==='object'? choicePick.en : choicePick;
                    const isPicked = pickedEn===en;
                    return (
                      <Button key={en+i} kind={isPicked?KIND.primary:KIND.secondary} shape={SHAPE.pill}
                        overrides={{BaseButton:{style:{backgroundColor: isPicked ? '#0f0f12' : '#fff', color: isPicked ? '#fff' : '#0f0f12', borderColor:'#e9e8f0', borderWidth:'1.5px', minHeight:'58px', whiteSpace:'normal', lineHeight:1.15, fontWeight:600, flexDirection:'column', paddingTop:'8px', paddingBottom:'8px'}}}}
                        onClick={()=> setChoicePick(opt)}>
                        <span style={{fontSize:12, fontWeight:700}}>{en}</span>
                        {fa && <span style={{fontFamily:'IRANSans', direction:'rtl', fontSize:11, color: isPicked? 'rgba(255,255,255,0.8)' : '#6b6b7a'}}>{fa}</span>}
                      </Button>
                    );
                  })}
                </Block>
              ) : (
                <Block marginTop="12px" padding="10px" backgroundColor={quizFeedback.correct ? '#dcfce7' : '#fef2f2'} overrides={{Block:{style:{borderRadius:'12px'}}}}>
                  <LabelSmall>{quizFeedback.correct ? `✅ Correct! "${quizFeedback.expectedEn}" +${quizFeedback.xp} XP` : `❌ "${typeof choicePick==='object'? choicePick.en : choicePick}" → "${quizFeedback.expectedEn}"`}</LabelSmall>
                  <div style={{fontFamily:'IRANSans', direction:'rtl', fontSize:12, color:'#6b6b6b', marginTop:4}}>{quizFeedback.expectedFa}</div>
                </Block>
              )}
              {!quizFeedback ? (
                <Button shape={SHAPE.pill} disabled={!choicePick} onClick={submitQuiz} overrides={{BaseButton:{style:{marginTop:'14px', width:'100%'}}}}>Check</Button>
              ) : (
                <Button shape={SHAPE.pill} onClick={nextQuiz} overrides={{BaseButton:{style:{marginTop:'14px', width:'100%'}}}}>{quizIdx+1>=quizQueue.length ? 'Finish' : 'Next'}</Button>
              )}
            </Block>
          ) : quizMode==='fa' ? (
            <Block textAlign="center">
              <LabelSmall color="#6b6b6b">FARSI — Tippe die persische Bedeutung</LabelSmall>
              <div style={{fontSize:22, fontWeight:800, marginTop:8}}>{currentQuizWord.german} <span style={{color: genderColor(currentQuizWord.article), fontSize:14, fontWeight:600}}>{currentQuizWord.article || ''}</span></div>
              <div style={{fontSize:12, color:'#6b6b6b'}}>{currentQuizWord.meaning_en} • {currentQuizWord.lektion}</div>
              <Block marginTop="10px">
                <Button size={SIZE.mini} shape={SHAPE.pill} onClick={()=> speakGerman(currentQuizWord.german)}>🔊 German</Button>
              </Block>
              {!quizFeedback ? (
                <>
                  <Input value={quizAnswer} onChange={(e)=> setQuizAnswer(e.target.value)} placeholder="فارسی را تایپ کنید..." onKeyDown={(e)=> { if(e.key==='Enter') submitQuiz(); }} autoFocus overrides={{ Root:{style:{marginTop:'12px', borderRadius:'12px'}}}} />
                  <Button shape={SHAPE.pill} disabled={!quizAnswer.trim()} onClick={submitQuiz} overrides={{BaseButton:{style:{marginTop:'12px', width:'100%'}}}}>Check</Button>
                </>
              ) : (
                <>
                  <Block marginTop="12px" padding="10px" backgroundColor={quizFeedback.correct ? '#dcfce7' : '#fef2f2'} overrides={{Block:{style:{borderRadius:'12px'}}}}>
                    <LabelSmall>{quizFeedback.correct ? `Correct! "${quizFeedback.expectedFa}" +${quizFeedback.xp} XP` : `"${quizAnswer.trim()}" is wrong → "${quizFeedback.expectedFa}"`}</LabelSmall>
                  </Block>
                  <Button shape={SHAPE.pill} onClick={nextQuiz} overrides={{BaseButton:{style:{marginTop:'12px', width:'100%'}}}}>{quizIdx+1>=quizQueue.length ? 'Finish' : 'Next'}</Button>
                </>
              )}
            </Block>
          ) : (
            <Block textAlign="center">
              <LabelSmall color="#6b6b6b">DICTATION — Höre und tippe (Umlaute wichtig!)</LabelSmall>
              <DisplaySmall $style={{fontSize:16, color:'#6b6b6b', marginTop:'8px'}}>{currentQuizWord.meaning_en} — {currentQuizWord.lektion}</DisplaySmall>
              <div style={{fontFamily:'IRANSans', direction:'rtl', fontSize:13, color:'#9a9a9a'}}>{currentQuizWord.meaning_fa}</div>
              <Block marginTop="12px">
                <Button size={SIZE.compact} shape={SHAPE.pill} onClick={()=> speakGerman(currentQuizWord.german)}>▶ Play German</Button>
                <Button size={SIZE.compact} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> speakGerman(currentQuizWord.example)} overrides={{BaseButton:{style:{marginLeft:'8px'}}}}>Sentence</Button>
              </Block>
              {!quizFeedback ? (
                <>
                  <Input value={quizAnswer} onChange={(e)=> setQuizAnswer(e.target.value)} placeholder="Tippe das deutsche Wort..." onKeyDown={(e)=> { if(e.key==='Enter') submitQuiz(); }} autoFocus overrides={{ Root:{style:{marginTop:'12px', borderRadius:'12px'}}}} />
                  <Block display="flex" gridGap="6px" marginTop="8px" justifyContent="center" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
                    {['ä','ö','ü','Ä','Ö','Ü','ß'].map(ch=>(
                      <Button key={ch} size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.circle} onClick={()=> insertUmlaut(ch)}>{ch}</Button>
                    ))}
                    <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setQuizAnswer('')}>Clear</Button>
                  </Block>
                  <Button shape={SHAPE.pill} disabled={!quizAnswer.trim()} onClick={submitQuiz} overrides={{BaseButton:{style:{marginTop:'12px', width:'100%'}}}}>Check</Button>
                </>
              ) : (
                <>
                  <Block marginTop="12px" padding="10px" backgroundColor={quizFeedback.correct ? '#dcfce7' : '#fef2f2'} overrides={{Block:{style:{borderRadius:'12px'}}}}>
                    <LabelSmall>{quizFeedback.correct ? `Correct! "${quizFeedback.expected}" +${quizFeedback.xp} XP` : `"${quizAnswer.trim()}" → "${quizFeedback.expected}"`}</LabelSmall>
                    {!quizFeedback.correct && <ParagraphSmall margin="4px 0 0">Umlaute: ä ≠ a, ö ≠ o, ü ≠ u, ß ≠ ss</ParagraphSmall>}
                  </Block>
                  <Button shape={SHAPE.pill} onClick={nextQuiz} overrides={{BaseButton:{style:{marginTop:'12px', width:'100%'}}}}>{quizIdx+1>=quizQueue.length ? 'Finish' : 'Next'}</Button>
                </>
              )}
            </Block>
          )}
        </UberCard>
      )}
      <Block marginTop="12px" display="flex" justifyContent="center">
        <Button kind={KIND.secondary} size={SIZE.mini} shape={SHAPE.pill} onClick={()=> { setQuizStarted(false); setQuizFeedback && setQuizFeedback(null); }}>Exit quiz</Button>
      </Block>
    </>
      )}
    </>
  );
}
