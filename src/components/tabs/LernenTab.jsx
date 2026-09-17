import { Block } from 'baseui/block';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { Select } from 'baseui/select';
import { ProgressBar } from 'baseui/progress-bar';
import { Tag } from 'baseui/tag';
import { Heading } from 'baseui/heading';
import { LabelSmall, ParagraphSmall } from 'baseui/typography';
import { BOOKS, lektionenForBook } from '../../data/menschen.js';
import { getLektionMastery } from '../../utils/progress.js';
import UberCard from '../cards/UberCard.jsx';
import FlashCard from '../cards/FlashCard.jsx';

export default function LernenTab({
  selectedBook, setSelectedBook, selectedLektions, setSelectedLektions, selectedBookMeta, scopeWords, weakForScope, studyQueue, packSize, setPackSize, packWords, packIdx, packAnswers, showPackSummary, flipped, setFlipped, listening, setListening, transcript, setTranscript, handlePackSwipe, handlePackRate, startNewPack, savePack, isSavingPack, progressMap, setActiveKey, onDiscard
}) {
  return (
    <>
      <UberCard styleOverride={{backgroundColor:'#f7f7f7', borderColor:'#e5e5e5', paddingTop:'12px', paddingBottom:'12px'}}>
        <Block display="flex" justifyContent="space-between" alignItems="center">
          <Block>
            <LabelSmall color="#6b6b6b">Scope</LabelSmall>
            <div style={{fontWeight:800, fontSize:14}}>{selectedBookMeta?.label} • {selectedLektions.length===0 ? 'Whole book' : `${selectedLektions.length} Lektionen`}</div>
            <div style={{fontSize:11, color:'#6b6b6b'}}>{selectedLektions.length? selectedLektions.join(', ') : 'All'} • {scopeWords.length} words • {weakForScope.length} weak</div>
          </Block>
          <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setActiveKey('0')}>Change →</Button>
        </Block>
        <Block display="flex" gridGap="8px" marginTop="10px" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
          <Select options={BOOKS.map(b=> ({id:b.id, label:b.label}))} value={[{id:selectedBook, label:selectedBookMeta?.label}]} onChange={({value})=> { if(value[0]) { setSelectedBook(value[0].id); setSelectedLektions([]); }}} size="compact" overrides={{ControlContainer:{style:{minWidth:'140px', borderRadius:'999px'}}}} />
          <Select options={[{id:10, label:'10 / pack'},{id:20, label:'20 / pack'},{id:50, label:'50 / pack'}]} value={[{id:packSize, label:`${packSize} / pack`}]} onChange={({value})=> setPackSize(value[0].id)} size="compact" overrides={{ ControlContainer: { style: { minWidth: '110px', borderRadius:'999px' } } }} />
        </Block>
        <Block display="flex" gridGap="6px" marginTop="10px" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
          {lektionenForBook(selectedBook).map(l=>{
            const active = selectedLektions.includes(l.lektion);
            return (
              <Button key={l.key} size={SIZE.mini} kind={active?KIND.primary:KIND.secondary} shape={SHAPE.pill}
                overrides={{BaseButton:{style:{fontWeight:700, fontSize:11, backgroundColor: active? '#0f0f12' : '#fff', color: active? '#fff':'#0f0f12', borderColor:'#e9e8f0'}}}}
                onClick={()=> setSelectedLektions(prev=> prev.includes(l.lektion) ? prev.filter(x=>x!==l.lektion) : [...prev, l.lektion])}>
                {active? '✓ ':''}{l.lektion}
              </Button>
            );
          })}
          <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setSelectedLektions([])}>All</Button>
          <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setSelectedLektions(lektionenForBook(selectedBook).map(l=>l.lektion))}>All +</Button>
        </Block>
        <Block display="flex" gridGap="8px" marginTop="10px">
          <Button size={SIZE.mini} shape={SHAPE.pill} onClick={startNewPack}>New pack</Button>
          <LabelSmall color="#6b6b6b" overrides={{Block:{style:{alignSelf:'center'}}}}>{studyQueue.length} due</LabelSmall>
        </Block>
      </UberCard>

      {packWords.length > 0 && !showPackSummary ? (
        <>
          <Block display="flex" justifyContent="space-between" alignItems="center" marginTop="12px" marginBottom="8px">
            <LabelSmall color="#6b6b6b">Pack {packIdx+1}/{packWords.length} • {packAnswers.length} answered</LabelSmall>
            <LabelSmall color="#000" overrides={{ Block: { style: { fontWeight: 700 } } }}>{Math.round((packIdx/packWords.length)*100)}%</LabelSmall>
          </Block>
          <ProgressBar value={(packIdx/packWords.length)*100} overrides={{ Bar: { style: { height: '4px' } }, BarProgress: { style: { backgroundColor: '#000' } }, BarContainer: { style: { backgroundColor: '#eee', height: '4px', borderRadius: '999px' } } }} />
          <Block marginTop="16px">
            <FlashCard word={packWords[packIdx]} flipped={flipped} setFlipped={setFlipped} onSwipe={handlePackSwipe} onRate={handlePackRate} listening={listening} setListening={setListening} transcript={transcript} setTranscript={setTranscript} />
          </Block>
          <Block display="flex" justifyContent="center" marginTop="12px">
            <LabelSmall color="#9a9a9a">{packWords.length - packIdx - 1} remaining</LabelSmall>
          </Block>
        </>
      ) : showPackSummary ? (
        <UberCard styleOverride={{textAlign:'center', paddingTop:'24px', paddingBottom:'24px', backgroundColor:'#f7f7f7', borderColor:'#e5e5e5', marginTop:'12px'}}>
          <div style={{fontSize:36}}>🎉</div>
          <Heading $style={{fontSize:18, margin:'8px 0 0'}}>Pack complete!</Heading>
          <ParagraphSmall margin="8px 0 0">{packAnswers.filter(a=>a.correct).length}/{packAnswers.length} correct • +{packAnswers.reduce((a,b)=>a+b.xp,0)} XP • {selectedBookMeta?.label} {selectedLektions.length? selectedLektions.join(', ') : 'Whole book'}</ParagraphSmall>
          <Block display="flex" gridGap="8px" justifyContent="center" marginTop="12px" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
            {packAnswers.map((a,i)=>(
              <Tag key={i} closeable={false} overrides={{Root:{style:{backgroundColor: a.correct ? '#dcfce7' : '#fee2e2', color: a.correct ? '#16a34a' : '#dc2626', borderRadius:'999px'}}}}>{a.word.german}: {a.label}</Tag>
            ))}
          </Block>
          <Block display="flex" gridGap="8px" justifyContent="center" marginTop="16px">
            <Button shape={SHAPE.pill} onClick={savePack} isLoading={isSavingPack}>Save & next pack</Button>
            <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={onDiscard}>Discard</Button>
          </Block>
          <ParagraphSmall color="#6b6b6b" margin="8px 0 0">Tap Save to keep your progress.</ParagraphSmall>
        </UberCard>
      ) : (
        <UberCard styleOverride={{ backgroundColor: '#f7f7f7', borderColor: '#e5e5e5', textAlign: 'center', paddingTop: '30px', paddingBottom: '30px', marginTop:'12px' }}>
          <div style={{ fontSize: 32 }}>📦</div>
          <Heading $style={{fontSize:16}}>Ready for a pack?</Heading>
          <ParagraphSmall color="#6b6b6b">Scoped to <b>{selectedBookMeta?.label} {selectedLektions.length? selectedLektions.join(', ') : 'whole book'}</b> • {scopeWords.length} words. Tap Start to begin.</ParagraphSmall>
          <Block marginTop="12px" display="flex" justifyContent="center"><Button shape={SHAPE.pill} onClick={startNewPack}>Start {packSize}-word pack</Button></Block>
          {studyQueue.length===0 && <ParagraphSmall color="#dc2626" margin="8px 0 0">No due words for this scope — try another Lektion or whole book.</ParagraphSmall>}
          <Block display="flex" justifyContent="center" gridGap="16px" marginTop="16px">
            <Block display="flex" alignItems="center" gridGap="6px"><span style={{ width: 10, height: 10, borderRadius: '999px', background: '#2563eb' }} /><LabelSmall>der</LabelSmall></Block>
            <Block display="flex" alignItems="center" gridGap="6px"><span style={{ width: 10, height: 10, borderRadius: '999px', background: '#dc2626' }} /><LabelSmall>die</LabelSmall></Block>
            <Block display="flex" alignItems="center" gridGap="6px"><span style={{ width: 10, height: 10, borderRadius: '999px', background: '#16a34a' }} /><LabelSmall>das</LabelSmall></Block>
          </Block>
        </UberCard>
      )}

      {(() => { const m = getLektionMastery(scopeWords, progressMap); return (
        <UberCard styleOverride={{marginTop:'12px', paddingTop:'12px', paddingBottom:'12px'}}>
          <Block display="flex" justifyContent="space-between" alignItems="center">
            <LabelSmall>Scope progress — {m.seen}/{m.total} seen • {m.mastered} mastered</LabelSmall>
            <LabelSmall color="#000" overrides={{Block:{style:{fontWeight:700}}}}>{m.pct}% seen • {m.masteredPct}% mastered</LabelSmall>
          </Block>
          <div style={{height:6, background:'#eee', borderRadius:999, marginTop:8, overflow:'hidden'}}>
            <div style={{height:'100%', width:`${m.pct}%`, background:'#000', borderRadius:999, transition:'width 0.5s'}}/>
          </div>
          <div style={{height:4, background:'#dcfce7', borderRadius:999, marginTop:4, overflow:'hidden'}}>
            <div style={{height:'100%', width:`${m.masteredPct}%`, background:'#16a34a', borderRadius:999, transition:'width 0.5s'}}/>
          </div>
          <ParagraphSmall color="#9a9a9a" margin="4px 0 0">Gray = studied, green = mastered (3× Good, interval ≥14d)</ParagraphSmall>
        </UberCard>
      ); })()}
    </>
  );
}
