import { Block } from 'baseui/block';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { Tag } from 'baseui/tag';
import { Heading } from 'baseui/heading';
import { LabelSmall, ParagraphSmall } from 'baseui/typography';
import { BOOKS, lektionenForBook } from '../../data/menschen.js';
import { getBookMastery, getLektionMastery } from '../../utils/progress.js';
import { speakGerman } from '../../utils/speak.js';
import UberCard from '../cards/UberCard.jsx';
import BookAnalytics from '../analytics/BookAnalytics.jsx';
import {
  BookOpen,
  Star,
  Check,
  Volume2,
  Library,
  ICON_SIZES,
} from '../icons.jsx';

export default function BuecherTab({ selectedBook, setSelectedBook, selectedLektions, setSelectedLektions, bookView, setBookView, allWords, progressMap, scopeWords, setActiveKey, setQuizBook, setQuizLektions, selectedBookMeta, quizHistory, historyLoading, historyError, onReloadHistory }) {
  if (!bookView) {
    return (
      <>
        <Block marginBottom="12px">
          <Heading $style={{fontSize:22, margin:'0 0 4px', letterSpacing:'-0.5px'}}>Wähle dein Buch</Heading>
          <ParagraphSmall color="#6b6b6b" margin="0">Menschen A1 — 24 Lektionen • {BOOKS.reduce((a,b)=>a+b.total,0)} Wörter • Deutsch + English + فارسی</ParagraphSmall>
        </Block>
        <Block display="flex" flexDirection="column" gridGap="12px">
          {BOOKS.map(book=>{
            const mastery = getBookMastery(book.id, allWords, progressMap);
            const isSelected = selectedBook===book.id;
            return (
              <Block key={book.id} onClick={()=> setBookView(book.id)} overrides={{Block:{style:{cursor:'pointer', background: book.gradient, borderRadius:'20px', padding:'18px', color:'#fff', position:'relative', overflow:'hidden', border: isSelected ? '3px solid #000' : '1px solid rgba(255,255,255,0.2)', boxShadow: isSelected ? '0 8px 24px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.08)'}}}}>
                <div aria-hidden="true" style={{position:'absolute', right:-8, top:-8, opacity:0.18, transform:'rotate(-12deg)', display:'flex'}}><Library size={92} aria-hidden="true" style={{ color: '#fff' }} /></div>
                <Block display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Block>
                    <div style={{fontSize:12, letterSpacing:1, opacity:0.9, fontWeight:700}}>{book.levels} • {book.publisher}</div>
                    <div style={{fontSize:22, fontWeight:800, marginTop:4}}>{book.label}</div>
                    <div style={{fontSize:12, opacity:0.85, marginTop:2}}>{book.title} • {book.isbn}</div>
                    <Block display="flex" gridGap="6px" marginTop="12px">
                      <span style={{background:'rgba(255,255,255,0.2)', padding:'4px 10px', borderRadius:999, fontSize:11, fontWeight:700}}>{book.total} Wörter</span>
                      <span style={{background: isSelected ? '#fff' : 'rgba(255,255,255,0.2)', color: isSelected ? '#000' : '#fff', padding:'4px 10px', borderRadius:999, fontSize:11, fontWeight:700, display:'inline-flex', alignItems:'center', gap:4}}>{isSelected && <Check size={12} aria-hidden="true" />}{isSelected ? 'Selected' : 'Tap to open'}</span>
                    </Block>
                  </Block>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:28, fontWeight:800}}>{mastery.pct}%</div>
                    <div style={{fontSize:11, opacity:0.8}}>{mastery.seen}/{mastery.total} seen • {mastery.mastered} mastered</div>
                  </div>
                </Block>
                <div style={{height:6, background:'rgba(255,255,255,0.3)', borderRadius:999, marginTop:14, overflow:'hidden'}}>
                  <div style={{height:'100%', width:`${mastery.pct}%`, background:'#fff', borderRadius:999, transition:'width 0.5s'}} />
                </div>
                <Block display="flex" gridGap="8px" marginTop="14px">
                  <Button size={SIZE.mini} kind={KIND.primary} shape={SHAPE.pill} overrides={{BaseButton:{style:{backgroundColor:'#fff', color:'#000', fontWeight:700}}}} onClick={(e)=>{e.stopPropagation(); setSelectedBook(book.id); setSelectedLektions([]); setActiveKey('1');}}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><BookOpen size={14} aria-hidden="true" /> Whole book — Study</span></Button>
                  <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} overrides={{BaseButton:{style:{backgroundColor:'rgba(255,255,255,0.2)', color:'#fff', backdropFilter:'blur(8px)'}}}} onClick={(e)=>{e.stopPropagation(); setBookView(book.id);}}>Lektionen →</Button>
                </Block>
              </Block>
            );
          })}
        </Block>
        <UberCard styleOverride={{marginTop:'12px', backgroundColor:'#f7f7f7', borderColor:'#e5e5e5'}}>
          <LabelSmall>Current scope</LabelSmall>
          <div style={{fontWeight:700, marginTop:4}}>{selectedBookMeta?.label} • {selectedLektions.length===0 ? 'Whole book' : selectedLektions.join(', ')} • {scopeWords.length} words</div>
          <div style={{fontSize:11, color:'#6b6b6b', marginTop:2}}>{selectedLektions.length? `${selectedLektions.length} Lektionen selected` : 'All Lektionen'}</div>
          <Block display="flex" gridGap="8px" marginTop="10px">
            <Button size={SIZE.mini} shape={SHAPE.pill} onClick={()=> setActiveKey('1')}>Go to Study →</Button>
            <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> { setQuizBook(selectedBook); setQuizLektions([...selectedLektions]); setActiveKey('2');}}>Quiz this scope</Button>
          </Block>
        </UberCard>
      </>
    );
  }
  const book = BOOKS.find(b=> b.id===bookView);
  const lektions = lektionenForBook(bookView);
  return (
    <>
      <Block display="flex" alignItems="center" gridGap="8px" marginBottom="12px">
        <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={()=> setBookView(null)}>← All books</Button>
        <Tag closeable={false} overrides={{Root:{style:{background: book.gradient, color:'#fff', fontWeight:700}}}}>{book.label}</Tag>
        <LabelSmall color="#6b6b6b">{book.levels}</LabelSmall>
      </Block>
      <Block overrides={{Block:{style:{background: book.gradient, borderRadius:'16px', padding:'16px', color:'#fff'}}}}>
        <Block display="flex" justifyContent="space-between" alignItems="center">
          <Block>
            <div style={{fontWeight:800, fontSize:18}}>{book.label} — Alle Lektionen</div>
            <div style={{fontSize:12, opacity:0.9}}>{book.total} Wörter • Tap a Lektion to focus</div>
          </Block>
          <div style={{display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end'}}>
            <Button size={SIZE.mini} shape={SHAPE.pill} overrides={{BaseButton:{style:{backgroundColor:'#fff', color:'#000', fontWeight:700}}}} onClick={()=> { setSelectedBook(book.id); setSelectedLektions([]); setActiveKey('1'); }}>Study whole book</Button>
            {selectedBook===book.id && selectedLektions.length>0 && (
              <Button size={SIZE.mini} shape={SHAPE.pill} overrides={{BaseButton:{style:{backgroundColor:'#0f0f12', color:'#fff', fontWeight:700}}}} onClick={()=> setActiveKey('1')}>Study {selectedLektions.length} selected →</Button>
            )}
            <div style={{display:'flex', gap:6, marginTop:4}}>
              <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} overrides={{BaseButton:{style:{backgroundColor:'rgba(255,255,255,0.18)', color:'#fff', fontSize:11}}}} onClick={()=> setSelectedLektions(lektionenForBook(book.id).map(x=>x.lektion))}>Select all</Button>
              <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} overrides={{BaseButton:{style:{backgroundColor:'rgba(255,255,255,0.18)', color:'#fff', fontSize:11}}}} onClick={()=> setSelectedLektions([])}>Clear</Button>
            </div>
            {selectedBook===book.id && selectedLektions.length>0 && <div style={{fontSize:11, opacity:0.9, fontWeight:600}}>{selectedLektions.join(', ')}</div>}
          </div>
        </Block>
      </Block>
      <Block marginTop="12px">
        <BookAnalytics
          book={book}
          allWords={allWords}
          progressMap={progressMap}
          attempts={quizHistory}
          loading={historyLoading}
          error={historyError}
          onRetry={onReloadHistory}
          actions={{
            onStudy: () => { setSelectedBook(book.id); setSelectedLektions([]); setActiveKey('1'); },
            onQuizBook: () => { setQuizBook(book.id); setQuizLektions([]); setActiveKey('2'); },
            onQuizLektion: (lektion) => { setQuizBook(book.id); setQuizLektions([lektion]); setActiveKey('2'); },
            onPracticeWeak: () => setActiveKey('4'),
          }}
        />
      </Block>
      <Block display="grid" gridGap="10px" marginTop="12px" overrides={{Block:{style:{gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))'}}}}>
        {lektions.map(l=>{
          const words = allWords.filter(w=> w.book===l.book && w.lektion===l.lektion);
          const mastery = getLektionMastery(words, progressMap);
          const isActive = selectedBook===l.book && selectedLektions.includes(l.lektion);
          const isBookActive = selectedBook===l.book;
          return (
            <UberCard key={l.key} styleOverride={{ borderColor: isActive ? '#0f0f12' : '#e9e8f0', backgroundColor: isActive ? '#f7f7fb' : '#fff', borderWidth: isActive ? '2px' : '1px' }}>
              <Block display="flex" justifyContent="space-between" alignItems="flex-start">
                <Block>
                  <div style={{fontSize:11, letterSpacing:1, color:'#6b6b6b', fontWeight:700}}>{l.lektion}</div>
                  <div style={{fontWeight:800, fontSize:14, marginTop:2}}>{l.title}</div>
                  <div style={{fontSize:11, color:'#9a9a9a', marginTop:2, lineHeight:1.3}}>{l.theme}</div>
                </Block>
                <div style={{textAlign:'right', flexShrink:0, marginLeft:8}}>
                  <div style={{fontWeight:800, fontSize:16, color: mastery.pct>=80 ? '#16a34a' : mastery.pct>=40 ? '#ea580c' : '#000'}}>{mastery.pct}%</div>
                  <div style={{fontSize:10, color:'#6b6b6b', display:'inline-flex', alignItems:'center', gap:3}}>{mastery.seen}/{mastery.total} seen • {mastery.mastered}<Star size={10} aria-hidden="true" style={{ color: '#eab308' }} /></div>
                </div>
              </Block>
              <div style={{height:6, background:'#eee', borderRadius:999, marginTop:10, overflow:'hidden'}}>
                <div style={{height:'100%', width:`${mastery.pct}%`, background: mastery.pct>=80 ? '#16a34a' : mastery.pct>=40 ? '#000' : '#9a9a9a', borderRadius:999, transition:'width 0.5s'}}/>
              </div>
              <Block display="flex" justifyContent="space-between" alignItems="center" marginTop="8px">
                <LabelSmall color="#6b6b6b">{words.length} words • {mastery.mastered} mastered</LabelSmall>
                <LabelSmall color={mastery.pct>=80 ? '#16a34a' : '#9a9a9a'}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{mastery.pct>=80 ? <><Check size={12} aria-hidden="true" /> Studied</> : mastery.pct>=30 ? 'In progress' : 'Not started'}</span></LabelSmall>
              </Block>
              <Block display="flex" gridGap="6px" marginTop="10px">
                <Button size={SIZE.mini} shape={SHAPE.pill} overrides={{BaseButton:{style:{flex:1, fontWeight:700, backgroundColor: isActive ? '#0f0f12' : undefined, color: isActive ? '#fff' : undefined}}}} onClick={()=> {
                  if (isBookActive && !isActive) { setSelectedLektions(prev=> [...prev, l.lektion]); }
                  else if (isActive) { setSelectedLektions(prev=> prev.filter(x=>x!==l.lektion)); }
                  else { setSelectedBook(l.book); setSelectedLektions([l.lektion]); }
                }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{isActive && <Check size={12} aria-hidden="true" />}{isActive? 'Selected' : '+ Add'}</span></Button>
                <Button size={SIZE.mini} shape={SHAPE.pill} overrides={{BaseButton:{style:{flex:1, fontWeight:700}}}} onClick={()=> {
                  if (isActive) setActiveKey('1');
                  else { setSelectedBook(l.book); setSelectedLektions([l.lektion]); setActiveKey('1'); }
                }}>Study</Button>
                <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} overrides={{BaseButton:{style:{flex:1}}}} onClick={()=> { setQuizBook(l.book); setQuizLektions([l.lektion]); setActiveKey('2');}}>Quiz</Button>
                <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.circle} onClick={()=> speakGerman(words[0]?.german || l.title)} aria-label="Listen"><Volume2 size={ICON_SIZES.button} aria-hidden="true" /></Button>
              </Block>
              {isActive && <div style={{fontSize:10, color:'#16a34a', fontWeight:700, marginTop:6, textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:4}}><Check size={12} aria-hidden="true" /> In your multi-scope • tap to remove</div>}
            </UberCard>
          );
        })}
      </Block>
    </>
  );
}
