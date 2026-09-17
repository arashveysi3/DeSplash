import { Block } from 'baseui/block';
import { Button, KIND, SHAPE } from 'baseui/button';
import { Input } from 'baseui/input';
import { Select } from 'baseui/select';
import { Heading, HeadingLevel } from 'baseui/heading';
import { ParagraphSmall } from 'baseui/typography';

export default function AddCardModal({ show, onClose, newCard, setNewCard, onAdd, selectedBookMeta, selectedLektions }) {
  if (!show) return null;
  return (
    <Block overrides={{ Block: { style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' } } }} onClick={onClose}>
      <Block onClick={(e)=> e.stopPropagation()} overrides={{ Block: { style: { background: '#fff', borderRadius: '20px', padding: '20px', width: '100%', maxWidth: '420px', maxHeight: '85vh', overflowY: 'auto' } } }}>
        <Heading $style={{ fontSize: 18, marginTop: 0 }}>Add custom card</Heading>
        <ParagraphSmall color="#6b6b6b">Saved to {selectedBookMeta?.label} • {selectedLektions.length? selectedLektions.join(', ') : 'Whole book'}</ParagraphSmall>
        <Block display="flex" flexDirection="column" gridGap="10px" marginTop="12px">
          <Input value={newCard.german} onChange={(e)=> setNewCard({...newCard, german: e.target.value})} placeholder="German word (e.g. Mädchen)" overrides={{ Root: { style: { borderRadius: '12px' } } }} />
          <Input value={newCard.english} onChange={(e)=> setNewCard({...newCard, english: e.target.value})} placeholder="English (e.g. girl)" overrides={{ Root: { style: { borderRadius: '12px' } } }} />
          <Input value={newCard.englishFa} onChange={(e)=> setNewCard({...newCard, englishFa: e.target.value})} placeholder="فارسی (e.g. دختر)" overrides={{ Root: { style: { borderRadius: '12px' } } }} />
          <Block display="flex" gridGap="8px">
            <Select options={[{id:'', label:'— no article'},{id:'der', label:'der (m)'},{id:'die', label:'die (f)'},{id:'das', label:'das (n)'}]} value={newCard.article ? [{id:newCard.article, label:newCard.article}] : []} placeholder="Article" onChange={({value})=> setNewCard({...newCard, article: value[0]?.id || ''})} size="compact" />
            <Input value={newCard.plural} onChange={e=> setNewCard({...newCard, plural:e.target.value})} placeholder="Plural" overrides={{Root:{style:{borderRadius:'12px'}}}} />
          </Block>
          <Input value={newCard.example} onChange={(e)=> setNewCard({...newCard, example: e.target.value})} placeholder="Example sentence (optional)" />
          <Block display="flex" gridGap="8px" marginTop="8px">
            <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={onClose}>Cancel</Button>
            <Button shape={SHAPE.pill} onClick={onAdd}>Add card</Button>
          </Block>
        </Block>
      </Block>
    </Block>
  );
}
