/**
 * A1 Final Mock Exam — grammar bank, part 4: A1.1 top-up (g142-g150).
 *
 * These questions strengthen thinly covered A1.1 grammar (Lektion 1-12),
 * especially Lektion 2 (previously only 1 question) and core topics with
 * a single question (Possessivartikel, Imperativ).
 *
 * Same conventions as src/data/exam.js:
 *  - every question: exactly 4 options, exactly one correct answer.
 *  - `options[0]` is the correct answer in SOURCE order; the exam engine
 *    shuffles a copy at runtime (src/utils/exam.js).
 *  - `answer` is the exact correct option string (no index drift).
 *  - every content word is basic A1 vocabulary inside Menschen scope.
 */

export const GRAMMAR_BANK_5 = [
  // --- Lektion 2: sein + Artikel + Negation mit nicht (g142-g144) ---
  {
    id: 'g142',
    section: 'grammatik',
    topic: 'haben / sein',
    lektion: 'Lektion 2',
    prompt: 'Er ___ Lehrer.',
    options: ['ist', 'bin', 'bist', 'sind'],
    answer: 'ist',
    explanation: 'sein → er ist. Bin is ich, Bist is du, Sind is wir/sie/Sie.',
  },
  {
    id: 'g143',
    section: 'grammatik',
    topic: 'Artikel',
    lektion: 'Lektion 2',
    prompt: '___ Apfel ist rot.',
    options: ['Der', 'Die', 'Das', 'Den'],
    answer: 'Der',
    explanation: 'der Apfel is maskulin → Nominativ: Der Apfel ist … Den would be Akkusativ.',
  },
  {
    id: 'g144',
    section: 'grammatik',
    topic: 'Negation',
    lektion: 'Lektion 2',
    prompt: 'Er kommt heute ___.',
    options: ['nicht', 'kein', 'keine', 'nichts'],
    answer: 'nicht',
    explanation: 'nicht negates a verb (Er kommt nicht). Kein/keine need a noun after them.',
  },
  // --- Lektion 3: Possessivartikel im Nominativ (g145-g146) ---
  {
    id: 'g145',
    section: 'grammatik',
    topic: 'Possessivartikel',
    lektion: 'Lektion 3',
    prompt: 'Das ist ___ Bruder.',
    options: ['mein', 'meine', 'meinen', 'meiner'],
    answer: 'mein',
    explanation: 'der Bruder is maskulin + Nominativ → mein Bruder. Meinen would be Akkusativ.',
  },
  {
    id: 'g146',
    section: 'grammatik',
    topic: 'Possessivartikel',
    lektion: 'Lektion 3',
    prompt: 'Wo ist ___ Pass?',
    options: ['dein', 'deine', 'deinen', 'deiner'],
    answer: 'dein',
    explanation: 'der Pass is maskulin + Nominativ → dein Pass. Deine would be feminin (deine Tasche).',
  },
  // --- Lektion 4: bestimmter Artikel im Akkusativ (g147) ---
  {
    id: 'g147',
    section: 'grammatik',
    topic: 'Akkusativ',
    lektion: 'Lektion 4',
    prompt: 'Ich kaufe ___ Käse.',
    options: ['den', 'der', 'dem', 'das'],
    answer: 'den',
    explanation: 'der Käse is maskulin → Akkusativ: den Käse. Dem is Dativ.',
  },
  // --- Lektion 5: Sie-Imperativ (g148) ---
  {
    id: 'g148',
    section: 'grammatik',
    topic: 'Imperativ',
    lektion: 'Lektion 5',
    prompt: '___ Sie bitte langsam!',
    options: ['Sprechen', 'Sprich', 'Sprecht', 'Spricht'],
    answer: 'Sprechen',
    explanation: 'Sie-Imperativ = Infinitiv: Sprechen Sie …! Sprich is du, Sprecht is ihr.',
  },
  // --- Lektion 7: Modalverb müssen im Plural (g149) ---
  {
    id: 'g149',
    section: 'grammatik',
    topic: 'Modalverben',
    lektion: 'Lektion 7',
    prompt: 'Wir ___ heute viel lernen.',
    options: ['müssen', 'muss', 'müsst', 'müsse'],
    answer: 'müssen',
    explanation: 'müssen → wir müssen (umlaut returns in plural). Muss is ich/er, Müsst is ihr.',
  },
  // --- Lektion 12: seit + Dativ für andauernde Zeit (g150) ---
  {
    id: 'g150',
    section: 'grammatik',
    topic: 'Zeitangaben',
    lektion: 'Lektion 12',
    prompt: 'Er lernt ___ einem Jahr Deutsch.',
    options: ['seit', 'von', 'nach', 'für'],
    answer: 'seit',
    explanation: 'Andauernde Zeit + Dativ = seit: seit einem Jahr (still learning). Für wäre eine abgeschlossene Dauer.',
  },
];
