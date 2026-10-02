import a11Raw from '../../menschen_a1_1_vocabulary.json';
import a12Raw from '../../menschen_a1_2_vocabulary.json';
import a21Raw from '../../menchen-a2.1-lernwortchatz.json';

// Raw JSON per book id — single source of truth for lektionen + metadata.
const RAW_BY_BOOK = {
  'a1.1': a11Raw,
  'a1.2': a12Raw,
  'a2.1': a21Raw,
};

// Book definitions
export const BOOKS = [
  {
    id: 'a1.1',
    key: 'a1.1',
    label: 'Menschen A1.1',
    shortLabel: 'A1.1',
    title: a11Raw.metadata.book,
    publisher: a11Raw.metadata.publisher,
    isbn: a11Raw.metadata.isbn,
    levels: a11Raw.metadata.levels,
    total: a11Raw.metadata.total_words,
    note: a11Raw.metadata.note,
    color: '#4f46e5',
    color2: '#06b6d4',
    gradient: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 45%,#06b6d4 100%)',
    accent: '#4f46e5',
    coverIcon: 'book',
    lektionKeys: Object.keys(a11Raw.lektionen),
    lektionCount: Object.keys(a11Raw.lektionen).length,
  },
  {
    id: 'a1.2',
    key: 'a1.2',
    label: 'Menschen A1.2',
    shortLabel: 'A1.2',
    title: a12Raw.metadata.book,
    publisher: a12Raw.metadata.publisher,
    isbn: a12Raw.metadata.isbn,
    levels: a12Raw.metadata.levels,
    total: a12Raw.metadata.total_words,
    note: a12Raw.metadata.note,
    color: '#ea580c',
    color2: '#f59e0b',
    gradient: 'linear-gradient(135deg,#ea580c 0%,#f59e0b 55%,#eab308 100%)',
    accent: '#ea580c',
    coverIcon: 'book',
    lektionKeys: Object.keys(a12Raw.lektionen),
    lektionCount: Object.keys(a12Raw.lektionen).length,
  },
  {
    id: 'a2.1',
    key: 'a2.1',
    label: 'Menschen A2.1',
    shortLabel: 'A2.1',
    title: a21Raw.metadata.book,
    publisher: a21Raw.metadata.publisher,
    isbn: a21Raw.metadata.isbn,
    levels: a21Raw.metadata.levels,
    total: a21Raw.metadata.total_words,
    note: a21Raw.metadata.note,
    color: '#059669',
    color2: '#14b8a6',
    gradient: 'linear-gradient(135deg,#059669 0%,#10b981 45%,#84cc16 100%)',
    accent: '#059669',
    coverIcon: 'book',
    lektionKeys: Object.keys(a21Raw.lektionen),
    lektionCount: Object.keys(a21Raw.lektionen).length,
  },
];

// Lektion metadata (title/theme) keyed by `${book}::${lektion}` — book-scoped
// because every Menschen book reuses "Lektion 1".."Lektion 12".
export const LEKTION_META = {};
for (const [bookId, raw] of Object.entries(RAW_BY_BOOK)) {
  for (const [lektion, data] of Object.entries(raw.lektionen)) {
    LEKTION_META[`${bookId}::${lektion}`] = {
      title: data.title || '',
      theme: data.theme || '',
    };
  }
}

// helper to derive pos
function derivePos(article) {
  if (article === 'der' || article === 'die' || article === 'das') return 'noun';
  return 'other';
}

// Build flat words array
// Per-book ID bases to keep A1.2 IDs stable after A1.1 expansion.
// Old sequential: A1.1 10001-10437 (437), A1.2 10438-11635 (1198).
// New A1.1 has 704 items -> would overlap if sequential. To keep A1.2 exactly
// unchanged (10438-11635) and ensure unique IDs, put A1.1 in a separate high range.
// A1.1 is being replaced, so its IDs will change and be migrated via lexical keys;
// A1.2 must remain untouched per spec.
const ID_BASE = {
  'a1.1': 50001,
  'a1.2': 10438,
  // A2.1 sits far above A1.1's range (50001-50704) so IDs never collide.
  'a2.1': 70001,
};
const idCounters = {
  'a1.1': ID_BASE['a1.1'],
  'a1.2': ID_BASE['a1.2'],
  'a2.1': ID_BASE['a2.1'],
};
const rawMap = {
  'a1.1': a11Raw.lektionen,
  'a1.2': a12Raw.lektionen,
  'a2.1': a21Raw.lektionen,
};

export const ALL_MENSCHEN_WORDS = [];

for (const book of BOOKS) {
  const lekMap = rawMap[book.id];
  for (const [lektion, data] of Object.entries(lekMap)) {
    for (const w of data.words) {
      const article = w.article || null;
      const rawGerman = w.german;
      // JSON stores "der Name" for nouns — strip article for base display to avoid duplicate "der der Name"
      let german = rawGerman;
      let fullGerman = rawGerman;
      if (article) {
        const lower = rawGerman.toLowerCase();
        const artLower = article.toLowerCase();
        if (lower.startsWith(artLower + ' ')) {
          german = rawGerman.slice(article.length + 1);
          fullGerman = rawGerman;
        } else {
          german = rawGerman;
          fullGerman = `${article} ${rawGerman}`;
        }
      }
      // Preserve canonical lesson + appearsInLessons for A1.2 deduplication
      const canonicalLesson = w.canonicalLesson || lektion;
      const appearsInLessons = w.appearsInLessons || [lektion];
      ALL_MENSCHEN_WORDS.push({
        id: idCounters[book.id]++,
        german,
        fullGerman,
        english: w.meaning_en,
        meaning_en: w.meaning_en,
        meaning_fa: w.meaning_fa,
        article,
        plural: w.plural || '',
        example: w.example || '',
        exampleEn: w.meaning_en,
        exampleFa: w.meaning_fa,
        pos: derivePos(article),
        level: book.shortLabel,
        book: book.id,
        bookLabel: book.label,
        lektion,
        // canonicalLesson is the first lesson where word appears; lektion === canonicalLesson for deduped data
        canonicalLesson,
        appearsInLessons,
        page: w.page || '',
        type: w.type || '',
        isCustom: 0,
      });
    }
  }
}

export const LEKTION_LIST = [];
for (const book of BOOKS) {
  for (const lektion of book.lektionKeys) {
    const meta = rawMap[book.id]?.[lektion] || {};
    LEKTION_LIST.push({
      key: `${book.id}::${lektion}`,
      book: book.id,
      bookLabel: book.label,
      lektion,
      title: meta.title || '',
      theme: meta.theme || '',
      count: ALL_MENSCHEN_WORDS.filter((x) => x.book === book.id && x.lektion === lektion).length,
    });
  }
}

// helpers
export function wordsForScope(book, lektion) {
  if (!book) return ALL_MENSCHEN_WORDS;
  if (!lektion || lektion === 'all') return ALL_MENSCHEN_WORDS.filter((w) => w.book === book);
  return ALL_MENSCHEN_WORDS.filter((w) => w.book === book && w.lektion === lektion);
}

export function lektionenForBook(book) {
  return LEKTION_LIST.filter((l) => l.book === book);
}

export default ALL_MENSCHEN_WORDS;
