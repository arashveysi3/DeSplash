import Icon from '../shell/Icon.jsx';
import { BOOKS } from '../../data/menschen.js';
import { speakGerman } from '../../utils/speak';

export default function SucheTab({ search, setSearch, setSelectedBook, selectedBook, filteredWordsForSearch, handleDeleteCustom }) {
  return (
    <div className="page srch-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">DE · EN · فارسی</span>
          <h1>Suche</h1>
          <p>Alle Wörter deiner Bücher auf einen Blick.</p>
        </div>
      </div>

      <div className="srch-search">
        <Icon name="search" size={20} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche German, English, فارسی oder Lektion..."
          aria-label="Bucheintrag durchsuchen"
        />
        {search && (
          <button type="button" className="srch-clear" onClick={() => setSearch('')} aria-label="Suche löschen">
            <Icon name="close" size={16} />
          </button>
        )}
      </div>

      <div className="srch-filters">
        {BOOKS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`srch-filter${selectedBook === b.id ? ' active' : ''}`}
            onClick={() => setSelectedBook(b.id)}
          >
            {b.label}
          </button>
        ))}
        <button type="button" className="srch-filter" onClick={() => setSearch('')}>
          Clear
        </button>
      </div>

      <p className="srch-count">{filteredWordsForSearch.length} results {search && `for “${search}”`}</p>

      <div className="srch-list">
        {filteredWordsForSearch.slice(0, 80).map((w) => {
          const rawG = w.german || '';
          const displayG = rawG.includes(' / ') ? rawG.split(' / ')[0].trim() : rawG;
          const isLong = rawG.split(/\s+/).length > 8 && /[?!.]/.test(rawG);
          return (
            <div
              key={w.id}
              className={`srch-row${w.article ? ` is-${w.article}` : ''}${isLong ? ' is-long' : ''}`}
              onClick={() => speakGerman(displayG)}
            >
              <div className="srch-words">
                <div className="srch-word">
                  {w.article && <span className="srch-art">{w.article}</span>}
                  <b>{displayG}</b>
                  <span className="srch-en">— {w.meaning_en || w.english}</span>
                  <span className="srch-fa" dir="rtl">— {w.meaning_fa}</span>
                  {w.isCustom ? <span className="srch-custom">custom</span> : null}
                </div>
                {isLong && rawG !== displayG && <div className="srch-full">Full: {rawG.slice(0, 100)}{rawG.length > 100 ? '…' : ''}</div>}
                <div className="srch-meta">{w.lektion} • {w.bookLabel} {w.plural ? `• Pl: ${w.plural}` : ''}</div>
                {w.example ? <div className="srch-example">{w.example}</div> : null}
              </div>
              <div className="srch-side">
                <span className="srch-lek">{w.lektion}</span>
                {w.isCustom && (
                  <button
                    type="button"
                    className="srch-del"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCustom(w.id);
                    }}
                    aria-label={`${w.german} löschen`}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredWordsForSearch.length > 80 && <p className="srch-more">Showing 80 of {filteredWordsForSearch.length}. Refine search.</p>}
      </div>
    </div>
  );
}