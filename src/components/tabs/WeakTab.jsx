import { Block } from 'baseui/block';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { Heading } from 'baseui/heading';
import { LabelSmall, ParagraphSmall } from 'baseui/typography';
import { genderColor } from '../../theme';
import { speakGerman } from '../../utils/speak';
import UberCard from '../cards/UberCard.jsx';
import { TriangleAlert, Volume2, Target, CheckCircle2, ICON_SIZES } from '../icons.jsx';

export default function WeakTab({ weakWords, weakForScope, weakIds, scopeWords, packSize, selectedBook, selectedLektions, selectedBookMeta, setPackWords, setPackIdx, setPackAnswers, setPendingProgress, setShowPackSummary, setFlipped, setActiveKey, setQuizBook, setQuizLektions, startQuiz, setToast }) {
  return (
    <Block paddingTop="16px">
      <UberCard styleOverride={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
        <Block display="flex" justifyContent="space-between" alignItems="center">
          <Block>
            <Heading $style={{ fontSize: 16, margin: 0 }}>Mistake Bank</Heading>
            <ParagraphSmall margin="4px 0 0" color="#991b1b">Failed cards auto-collected. Filtered to current scope: {selectedBookMeta?.label} {selectedLektions.length ? selectedLektions.join(', ') : 'Whole book'}</ParagraphSmall>
          </Block>
          <span style={{ display: 'inline-flex', padding: 10, borderRadius: 999, background: '#fff', border: '1px solid #fecaca' }}>
            <TriangleAlert size={ICON_SIZES.card} aria-hidden="true" style={{ color: '#dc2626' }} />
          </span>
        </Block>
        {weakWords.length > 0 && (
          <Block marginTop="12px" display="flex" gridGap="8px" overrides={{Block:{style:{flexWrap:'wrap'}}}}>
            <Button size={SIZE.mini} shape={SHAPE.pill} kind={KIND.primary} onClick={()=> { const w = weakForScope.slice(0, packSize); if(!w.length){ setToast('No weak in this scope'); setTimeout(()=> setToast(null),1500); return; } setPackWords(w); setPackIdx(0); setPackAnswers([]); setPendingProgress({}); setShowPackSummary(false); setFlipped(false); setActiveKey('1'); }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Target size={14} aria-hidden="true" /> Practice Weak ({weakForScope.length})</span></Button>
            <Button size={SIZE.mini} shape={SHAPE.pill} kind={KIND.secondary} onClick={()=> { setQuizBook(selectedBook); setQuizLektions([...selectedLektions]); setTimeout(()=> startQuiz('mixed', Math.min(10, weakForScope.length)), 100); setActiveKey('2');}}>Quiz Weak</Button>
            <LabelSmall color="#6b6b6b" overrides={{Block:{style:{alignSelf:'center'}}}}>{weakForScope.length} in scope • {weakWords.length} total</LabelSmall>
          </Block>
        )}
      </UberCard>
      <Block display="flex" flexDirection="column" gridGap="8px" marginTop="12px">
        {weakWords.length === 0 ? (
          <UberCard styleOverride={{ textAlign: 'center', paddingTop: '30px', paddingBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <CheckCircle2 size={ICON_SIZES.empty} aria-hidden="true" style={{ color: '#16a34a' }} />
            </div>
            <ParagraphSmall>No weak words yet. Cards marked “Again” appear here.</ParagraphSmall>
          </UberCard>
        ) : (
          (scopeWords.filter(w=> weakIds.has(w.id)).length ? scopeWords.filter(w=> weakIds.has(w.id)) : weakWords).slice(0, 60).map((w) => (
            <UberCard key={w.id} styleOverride={{ borderColor: '#fecaca' }}>
              <Block display="flex" justifyContent="space-between" alignItems="center">
                <div><span style={{ fontWeight: 700, color: genderColor(w.article) }}>{w.fullGerman || (w.article? `${w.article} ${w.german}`: w.german)}</span> <span style={{ color: '#6b6b6b' }}>— {w.meaning_en || w.english}</span> <span style={{fontFamily:'IRANSans, Tahoma, sans-serif', direction:'rtl', color:'#9a9a9a'}}>— {w.meaning_fa}</span> <span style={{ fontSize: 11, background: '#000', color: '#fff', borderRadius: '999px', padding: '2px 6px', marginLeft: 6 }}>{w.lektion}</span></div>
                <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.pill} onClick={() => speakGerman(w.german)} aria-label="Listen"><Volume2 size={14} aria-hidden="true" /></Button>
              </Block>
              <div style={{ fontSize: 12, fontStyle: 'italic', color: '#6b6b6b', marginTop: 6 }}>{w.example}</div>
              {w.plural && <div style={{fontSize:11, color:'#9a9a9a'}}>Plural: {w.plural}</div>}
            </UberCard>
          ))
        )}
      </Block>
    </Block>
  );
}
