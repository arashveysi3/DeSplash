import { Block } from 'baseui/block';
import { Button, KIND, SIZE, SHAPE } from 'baseui/button';
import { Input } from 'baseui/input';
import { Tag } from 'baseui/tag';
import { LabelSmall } from 'baseui/typography';
import { BOOKS } from '../../data/menschen.js';
import { genderColor, genderBg } from '../../theme';
import { speakGerman } from '../../utils/speak';
import UberCard from '../cards/UberCard.jsx';
import { Search, ICON_SIZES } from '../icons.jsx';

export default function SucheTab({ search, setSearch, setSelectedBook, selectedBook, filteredWordsForSearch, handleDeleteCustom }) {
  return (
    <Block paddingTop="16px">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Suche German, English, فارسی oder Lektion..."
        clearable
        size="compact"
        overrides={{ Root: { style: { backgroundColor: '#f7f7f7', borderColor: '#e5e5e5', borderRadius: '999px', paddingTop: '4px', paddingBottom: '4px' } }, Input: { style: { fontSize: '14px' } } }}
        startEnhancer={<Search size={ICON_SIZES.button} aria-hidden="true" style={{ color: '#9aa0b2' }} />}
      />
      <Block display="flex" gridGap="6px" marginTop="12px" overrides={{ Block: { style: { flexWrap: 'wrap' } } }}>
        {BOOKS.map(b=> <Tag key={b.id} closeable={false} variant={selectedBook===b.id ? 'solid' : 'outlined'} onClick={() => setSelectedBook(b.id)}>{b.label}</Tag>)}
        <Tag closeable={false} variant="outlined" onClick={() => setSearch('')}>Clear</Tag>
      </Block>
      <LabelSmall color="#6b6b6b" marginTop="12px">{filteredWordsForSearch.length} results {search && `for “${search}”`}</LabelSmall>
      <Block display="flex" flexDirection="column" gridGap="8px" marginTop="8px" overrides={{ Block: { style: { maxHeight: '62vh', overflowY: 'auto', paddingBottom: '20px' } } }}>
        {filteredWordsForSearch.slice(0, 80).map((w) => {
          const rawG = w.german || '';
          const displayG = rawG.includes(' / ') ? rawG.split(' / ')[0].trim() : rawG;
          const isLong = rawG.split(/\s+/).length > 8 && /[?!.]/.test(rawG);
          return (
          <UberCard key={w.id} onClick={() => speakGerman(displayG)} styleOverride={{ cursor: 'pointer', backgroundColor: w.article ? genderBg(w.article) : '#fff', borderColor: w.article ? genderColor(w.article) + '30' : '#eee' }}>
            <Block display="flex" justifyContent="space-between" alignItems="center">
              <Block>
                <div style={{ fontWeight: 700, fontSize: isLong ? 12 : 14, color: w.article ? genderColor(w.article) : '#000', lineHeight: isLong ? 1.3 : 1.2 }}>
                  {w.article && <span style={{ fontSize: 11, marginRight: 6, opacity: 0.8 }}>{w.article}</span>}
                  {displayG} <span style={{ fontWeight: 400, color: '#6b6b6b' }}>— {w.meaning_en || w.english}</span>
                  <span style={{ fontWeight:400, color:'#9a9a9a', fontFamily:'IRANSans, Tahoma, sans-serif', direction:'rtl', marginLeft:6 }}>— {w.meaning_fa}</span>
                  {w.isCustom ? <span style={{ fontSize:10, background:'#000', color:'#fff', borderRadius:'999px', padding:'1px 6px', marginLeft:6 }}>custom</span>:null}
                </div>
                {isLong && rawG !== displayG && <div style={{fontSize:11, color:'#9a9a9a', fontStyle:'italic', marginTop:2}}>Full: {rawG.slice(0,100)}{rawG.length>100?'…':''}</div>}
                <div style={{ fontSize: 11, color: '#9a9a9a' }}>{w.lektion} • {w.bookLabel} {w.plural ? `• Pl: ${w.plural}` : ''}</div>
                {w.example ? <div style={{ fontSize: 12, color: '#6b6b6b', fontStyle: 'italic', marginTop: 2 }}>{w.example}</div> : null}
              </Block>
              <Block display="flex" gridGap="6px" alignItems="center">
                <Tag closeable={false} overrides={{ Root: { style: { backgroundColor: '#000', color: '#fff', flexShrink: 0 } } }}>{w.lektion}</Tag>
                {w.isCustom && <Button size={SIZE.mini} kind={KIND.secondary} shape={SHAPE.circle} onClick={(e)=> {e.stopPropagation(); handleDeleteCustom(w.id);}}>×</Button>}
              </Block>
            </Block>
          </UberCard>
          )
        })}
        {filteredWordsForSearch.length > 80 && <LabelSmall color="#9a9a9a">Showing 80 of {filteredWordsForSearch.length}. Refine search.</LabelSmall>}
      </Block>
    </Block>
  );
}
