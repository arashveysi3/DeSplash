import a11Raw from '../../menschen_a1_1_vocabulary.json';
import a12Raw from '../../menschen_a1_2_vocabulary.json';

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
    coverEmoji: '📘',
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
    total: 448,
    note: a12Raw.metadata.note,
    color: '#ea580c',
    color2: '#f59e0b',
    gradient: 'linear-gradient(135deg,#ea580c 0%,#f59e0b 55%,#eab308 100%)',
    accent: '#ea580c',
    coverEmoji: '📙',
    lektionKeys: Object.keys(a12Raw.lektionen),
    lektionCount: Object.keys(a12Raw.lektionen).length,
  },
];

export const LEKTION_META = {
  ...a11Raw.lektionen,
  ...a12Raw.lektionen,
};

// helper to derive pos
function derivePos(article) {
  if (article === 'der' || article === 'die' || article === 'das') return 'noun';
  return 'other';
}

// Build flat words array
let _id = 10001;
const rawMap = {
  'a1.1': a11Raw.lektionen,
  'a1.2': a12Raw.lektionen,
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
      ALL_MENSCHEN_WORDS.push({
        id: _id++,
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
        lektionTitle: data.title,
        theme: data.theme,
        isCustom: 0,
      });
    }
  }
}

export const LEKTION_LIST = ALL_MENSCHEN_WORDS.reduce((acc, w) => {
  const key = `${w.book}::${w.lektion}`;
  if (!acc.find((x) => x.key === key)) {
    acc.push({
      key,
      book: w.book,
      bookLabel: w.bookLabel,
      lektion: w.lektion,
      title: w.lektionTitle,
      theme: w.theme,
      count: ALL_MENSCHEN_WORDS.filter((x) => x.book === w.book && x.lektion === w.lektion).length,
    });
  }
  return acc;
}, []);

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
