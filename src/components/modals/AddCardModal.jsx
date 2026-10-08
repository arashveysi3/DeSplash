export default function AddCardModal({ show, onClose, newCard, setNewCard, onAdd, selectedBookMeta, selectedLektions }) {
  if (!show) return null;
  return (
    <div className="mdl-overlay" onClick={onClose}>
      <div className="mdl-card" role="dialog" aria-modal="true" aria-label="Add custom card" onClick={(e)=> e.stopPropagation()}>
        <h2 className="mdl-title">Add custom card</h2>
        <p className="mdl-sub">Saved to {selectedBookMeta?.label} • {selectedLektions.length? selectedLektions.join(', ') : 'Whole book'}</p>
        <form className="mdl-form" onSubmit={(e)=> { e.preventDefault(); onAdd(); }}>
          <input className="mdl-input" value={newCard.german} onChange={(e)=> setNewCard({...newCard, german: e.target.value})} placeholder="German word (e.g. Mädchen)" />
          <input className="mdl-input" value={newCard.english} onChange={(e)=> setNewCard({...newCard, english: e.target.value})} placeholder="English (e.g. girl)" />
          <input className="mdl-input" value={newCard.englishFa} onChange={(e)=> setNewCard({...newCard, englishFa: e.target.value})} placeholder="فارسی (e.g. دختر)" />
          <div className="mdl-row">
            <select className="mdl-input mdl-select" value={newCard.article || ''} onChange={e=> setNewCard({...newCard, article: e.target.value})} aria-label="Article">
              <option value="">— no article</option>
              <option value="der">der (m)</option>
              <option value="die">die (f)</option>
              <option value="das">das (n)</option>
            </select>
            <input className="mdl-input" value={newCard.plural} onChange={e=> setNewCard({...newCard, plural:e.target.value})} placeholder="Plural" />
          </div>
          <input className="mdl-input" value={newCard.example} onChange={(e)=> setNewCard({...newCard, example: e.target.value})} placeholder="Example sentence (optional)" />
          <div className="mdl-actions">
            <button type="button" className="btn light" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn dark">Add card</button>
          </div>
        </form>
      </div>
    </div>
  );
}
