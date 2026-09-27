/**
 * A1 Final Mock Exam — static question bank (GermanSplash).
 *
 * Knowledge boundary: the Menschen A1.1 (Lektion 1-12) + A1.2 (Lektion 13-24)
 * vocabulary datasets in this repo. Every content word used in prompts,
 * options and reading texts was verified against
 * menschen_a1_1_vocabulary.json / menschen_a1_2_vocabulary.json before
 * storing (see verification scripts). Standard A1 function words
 * (articles, pronouns, prepositions, connectors like weil/dass) are core A1
 * grammar and intentionally allowed — they are not "B1 vocabulary".
 *
 * Reading texts are ORIGINAL A1-level texts (Anzeige, E-Mail, Angebot,
 * Durchsage) inspired by everyday situations. No external content is
 * scraped; everything is stored locally so the exam works offline.
 *
 * Conventions:
 *  - every question: exactly 4 options, exactly one correct answer.
 *  - `options[0]` is the correct answer in SOURCE order; the exam engine
 *    shuffles a copy at runtime (src/utils/exam.js) so positions vary.
 *  - `answer` is the exact correct option string (no index drift).
 *  - Diktation questions are NOT stored here: they are generated at exam
 *    start from the full A1 word pool with the existing Diktat-Check engine
 *    (src/utils/diktat.js), stratified across A1.1 + A1.2.
 *
 * Counts: Grammatik 15, Wortschatz 15, Lesen 10, Diktation 15 → total 55.
 *
 * BANKS (no fixed sets — every run samples a fresh mix, better for learning):
 *  - Grammatik bank: 110 questions (below + examG2.js + examG3.js)
 *  - Wortschatz bank: 105 questions (below + examV2.js + examV3.js)
 *  - Lesen bank: 100 questions across 40 texts (below + examR2/R3/R4.js),
 *    split into 20 x 3-question texts + 20 x 2-question texts so every run
 *    can sample exactly 10 (2 x 3Q + 2 x 2Q) with texts kept together.
 *  - Diktation: generated at runtime from the full A1 word pool (infinite).
 */

import { GRAMMAR_BANK_2 } from './examG2.js';
import { GRAMMAR_BANK_3 } from './examG3.js';
import { VOCAB_BANK_2 } from './examV2.js';
import { VOCAB_BANK_3 } from './examV3.js';
import { READING_BANK_2 } from './examR2.js';
import { READING_BANK_3 } from './examR3.js';
import { READING_BANK_4 } from './examR4.js';

export const EXAM_META = {
  id: 'a1-final-mock-1',
  title: 'A1 Final Mock Exam',
  version: 1,
  note: 'Hören is excluded: the app has no audio exam infrastructure.',
  sections: [
    { key: 'diktation', label: 'Diktation', count: 15 },
    { key: 'grammatik', label: 'Grammatik', count: 15 },
    { key: 'wortschatz', label: 'Wortschatz', count: 15 },
    { key: 'lesen', label: 'Lesen', count: 10 },
  ],
  total: 55,
};

export const EXAM_DIKTATION_COUNT = 15;

/** Derive book id from a "Lektion N" tag (1-12 → a1.1, 13-24 → a1.2). */
export function bookForLektion(lektion) {
  const m = /(\d+)/.exec(lektion || '');
  const n = m ? Number(m[1]) : 0;
  return n >= 13 ? 'a1.2' : 'a1.1';
}

// ---------------------------------------------------------------------------
// Grammatik — 15 questions (hardest legitimate A1, all inside Menschen scope)
// ---------------------------------------------------------------------------
export const GRAMMAR_QUESTIONS = [
  {
    id: 'g1',
    section: 'grammatik',
    topic: 'Verbkonjugation',
    lektion: 'Lektion 2',
    prompt: 'Er ___ jeden Tag mit dem Bus zur Schule.',
    options: ['fährt', 'fahrt', 'fahret', 'fähren'],
    answer: 'fährt',
    explanation: 'fahren → er fährt. Strong verbs like fahren, schlafen and fallen change a → ä in du / er, sie, es.',
  },
  {
    id: 'g2',
    section: 'grammatik',
    topic: 'Perfekt mit sein',
    lektion: 'Lektion 19',
    prompt: 'Gestern ___ wir nach Hause ___.',
    options: ['sind … gefahren', 'haben … gefahren', 'sind … gefahrt', 'haben … gefahrt'],
    answer: 'sind … gefahren',
    explanation: 'fahren expresses movement, so Perfekt uses sein: sind gefahren. The Partizip II is gefahren (never gefahrt).',
  },
  {
    id: 'g3',
    section: 'grammatik',
    topic: 'Akkusativ',
    lektion: 'Lektion 4',
    prompt: 'Ich möchte bitte ___ Apfel.',
    options: ['einen', 'ein', 'einem', 'einer'],
    answer: 'einen',
    explanation: 'der Apfel is maskulin → Akkusativ: einen Apfel. ein is Nominativ, einem is Dativ, einer is feminin.',
  },
  {
    id: 'g4',
    section: 'grammatik',
    topic: 'Präpositionen mit Dativ',
    lektion: 'Lektion 10',
    prompt: 'Ich fahre jeden Morgen ___ dem Bus zur Arbeit.',
    options: ['mit', 'bei', 'aus', 'zu'],
    answer: 'mit',
    explanation: 'mit always takes Dativ: mit dem Bus. aus = origin (aus Spanien), bei = at a person or place, zu = direction.',
  },
  {
    id: 'g5',
    section: 'grammatik',
    topic: 'Modalverben',
    lektion: 'Lektion 21',
    prompt: 'Hier ___ man nicht rauchen!',
    options: ['darf', 'muss', 'kann', 'will'],
    answer: 'darf',
    explanation: 'A prohibition (Verbot) uses dürfen … nicht. muss … nicht would mean there is no obligation — the opposite of a ban.',
  },
  {
    id: 'g6',
    section: 'grammatik',
    topic: 'Trennbare Verben',
    lektion: 'Lektion 7',
    prompt: 'Er ___ seine Mutter jeden Sonntag ___.',
    options: ['ruft … an', 'anruft', 'ruft … anrufen', 'an … ruft'],
    answer: 'ruft … an',
    explanation: 'anrufen is separable: the conjugated verb stands in position 2, the prefix an goes to the end.',
  },
  {
    id: 'g7',
    section: 'grammatik',
    topic: 'Partizip II',
    lektion: 'Lektion 19',
    prompt: 'Hast du das Buch schon ___?',
    options: ['gelesen', 'gelest', 'geliesen', 'lies'],
    answer: 'gelesen',
    explanation: 'lesen → gelesen. Irregular Partizip II forms (lesen – las – gelesen) must be memorized.',
  },
  {
    id: 'g8',
    section: 'grammatik',
    topic: 'Präteritum',
    lektion: 'Lektion 19',
    prompt: 'Gestern ___ ich beim Arzt.',
    options: ['war', 'bin', 'habe', 'hatte'],
    answer: 'war',
    explanation: 'Stories use Präteritum for sein/haben: ich war, ich hatte. bin and habe need a Partizip II (bin gewesen) or an object.',
  },
  {
    id: 'g9',
    section: 'grammatik',
    topic: 'Imperativ',
    lektion: 'Lektion 16',
    prompt: '___ Sie mir bitte das Brot!',
    options: ['Geben', 'Gib', 'Gebt', 'Gibt'],
    answer: 'Geben',
    explanation: 'Sie-Imperativ = Infinitiv: Geben Sie …! Gib is du, Gebt is ihr, Gibt is er/sie/es (not an imperative).',
  },
  {
    id: 'g10',
    section: 'grammatik',
    topic: 'Satzstellung',
    lektion: 'Lektion 6',
    prompt: 'Welcher Satz ist richtig?',
    options: [
      'Ich gehe morgen ins Kino.',
      'Ich gehe ins Kino morgen.',
      'Morgen ich gehe ins Kino.',
      'Ich morgen gehe ins Kino.',
    ],
    answer: 'Ich gehe morgen ins Kino.',
    explanation: 'The verb is always in position 2. Time comes before place: morgen (Zeit) vor ins Kino (Ort).',
  },
  {
    id: 'g11',
    section: 'grammatik',
    topic: 'Negation',
    lektion: 'Lektion 5',
    prompt: 'Ich habe ___ Auto.',
    options: ['kein', 'nicht', 'keinen', 'keine'],
    answer: 'kein',
    explanation: 'kein negates a noun: das Auto → kein Auto. keinen is maskulin Akkusativ (keinen Hund), keine is feminin/Plural, nicht negates verbs.',
  },
  {
    id: 'g12',
    section: 'grammatik',
    topic: 'Possessivartikel',
    lektion: 'Lektion 14',
    prompt: 'Er besucht ___ Eltern jeden Sommer.',
    options: ['seine', 'seinen', 'seiner', 'sein'],
    answer: 'seine',
    explanation: 'die Eltern is Plural + Akkusativ → seine Eltern. seinen would be maskulin (seinen Vater).',
  },
  {
    id: 'g13',
    section: 'grammatik',
    topic: 'Wechselpräpositionen',
    lektion: 'Lektion 13',
    prompt: 'Die Kinder sind ___ Schule.',
    options: ['in der', 'in die', 'in den', 'ins'],
    answer: 'in der',
    explanation: 'Wo? (position) → Dativ: in der Schule (feminin). Wohin? (movement) → in die Schule.',
  },
  {
    id: 'g14',
    section: 'grammatik',
    topic: 'W-Fragen',
    lektion: 'Lektion 1',
    prompt: '— ___ gehst du? — In die Schule.',
    options: ['Wohin', 'Wo', 'Woher', 'Wann'],
    answer: 'Wohin',
    explanation: 'Wohin? asks for direction: In die Schule. Wo? asks for position (Wo bist du? — In der Schule).',
  },
  {
    id: 'g15',
    section: 'grammatik',
    topic: 'Nebensatz mit weil',
    lektion: 'Lektion 12',
    prompt: 'Ich bleibe zu Hause, ___ ich krank ___.',
    options: ['weil ich krank bin', 'weil bin ich krank', 'denn ich krank bin', 'weil ich bin krank'],
    answer: 'weil ich krank bin',
    explanation: 'After weil the verb moves to the end: …, weil ich krank bin. denn keeps normal order (…, denn ich bin krank) — so denn with verb-at-end is wrong.',
  },
];

// ---------------------------------------------------------------------------
// Wortschatz — 15 contextual questions (all tested words in Menschen scope)
// ---------------------------------------------------------------------------
export const VOCAB_QUESTIONS = [
  {
    id: 'v1',
    section: 'wortschatz',
    topic: 'Reisen',
    lektion: 'Lektion 10',
    prompt: 'Der Bus kommt in fünf Minuten an der ___ an.',
    options: ['Haltestelle', 'Gleis', 'Rechnung', 'Geburtstag'],
    answer: 'Haltestelle',
    explanation: 'Correct answer: Haltestelle — meaning: (bus) stop. A Bus stops at a Haltestelle; a Gleis is only for trains.',
  },
  {
    id: 'v2',
    section: 'wortschatz',
    topic: 'Reisen',
    lektion: 'Lektion 10',
    prompt: 'Der Zug fährt nicht weiter. Du musst ___.',
    options: ['umsteigen', 'mitbringen', 'fernsehen', 'einkaufen'],
    answer: 'umsteigen',
    explanation: 'Correct answer: umsteigen — meaning: to change (trains). The train ends here, so you must change.',
  },
  {
    id: 'v3',
    section: 'wortschatz',
    topic: 'Essen und Trinken',
    lektion: 'Lektion 5',
    prompt: 'Wir haben großen Hunger. Wir möchten bitte ___!',
    options: ['bestellen', 'bleiben', 'lesen', 'fahren'],
    answer: 'bestellen',
    explanation: 'Correct answer: bestellen — meaning: to order. In a restaurant you order (bestellen) food and drinks.',
  },
  {
    id: 'v4',
    section: 'wortschatz',
    topic: 'Termine',
    lektion: 'Lektion 16',
    prompt: 'Der Termin ist um 9 Uhr. Bitte sei ___!',
    options: ['pünktlich', 'schnell', 'günstig', 'bewölkt'],
    answer: 'pünktlich',
    explanation: 'Correct answer: pünktlich — meaning: on time. schnell means fast (speed); pünktlich means exactly at 9 Uhr.',
  },
  {
    id: 'v5',
    section: 'wortschatz',
    topic: 'Wetter',
    lektion: 'Lektion 15',
    prompt: 'Es regnet und es ist kalt. Das ___ ist schlecht heute.',
    options: ['Wetter', 'Urlaub', 'Beruf', 'Ausflug'],
    answer: 'Wetter',
    explanation: 'Correct answer: Wetter — meaning: weather. Regen and kalt describe the Wetter.',
  },
  {
    id: 'v6',
    section: 'wortschatz',
    topic: 'Gesundheit',
    lektion: 'Lektion 18',
    prompt: 'Ich bin krank. Der Arzt gibt mir ein ___ für die Apotheke.',
    options: ['Rezept', 'Angebot', 'Termin', 'Koffer'],
    answer: 'Rezept',
    explanation: 'Correct answer: Rezept — meaning: prescription. You take it to the Apotheke to get medicine.',
  },
  {
    id: 'v7',
    section: 'wortschatz',
    topic: 'Gesundheit',
    lektion: 'Lektion 18',
    prompt: 'Aua, mein Kopf! Ich habe große ___.',
    options: ['Schmerzen', 'Möbel', 'Prüfung', 'Rechnung'],
    answer: 'Schmerzen',
    explanation: 'Correct answer: Schmerzen — meaning: pain. Aua and Kopf point to pain, not furniture (Möbel) or a bill (Rechnung).',
  },
  {
    id: 'v8',
    section: 'wortschatz',
    topic: 'Feste',
    lektion: 'Lektion 12',
    prompt: 'Vielen Dank für die ___ zu deiner Hochzeit!',
    options: ['Einladung', 'Rechnung', 'Hausaufgabe', 'Miete'],
    answer: 'Einladung',
    explanation: 'Correct answer: Einladung — meaning: invitation. You thank someone for an invitation, not for a bill (Rechnung).',
  },
  {
    id: 'v9',
    section: 'wortschatz',
    topic: 'Arbeit',
    lektion: 'Lektion 6',
    prompt: '— Wo ist dein ___? — In der Schule, ich bin Lehrer.',
    options: ['Arbeitsplatz', 'Urlaub', 'Wetter', 'Ausflug'],
    answer: 'Arbeitsplatz',
    explanation: 'Correct answer: Arbeitsplatz — meaning: workplace. A Lehrer works at the Schule.',
  },
  {
    id: 'v10',
    section: 'wortschatz',
    topic: 'Wohnen',
    lektion: 'Lektion 14',
    prompt: 'Die Wohnung kostet 800 Euro ___ im Monat.',
    options: ['Miete', 'Rechnung', 'Prüfung', 'Einladung'],
    answer: 'Miete',
    explanation: 'Correct answer: Miete — meaning: rent. A Wohnung costs Miete pro Monat.',
  },
  {
    id: 'v11',
    section: 'wortschatz',
    topic: 'Reisen',
    lektion: 'Lektion 10',
    prompt: 'Der ___ ist zu schwer für das Flugzeug.',
    options: ['Koffer', 'Chef', 'Beruf', 'Termin'],
    answer: 'Koffer',
    explanation: 'Correct answer: Koffer — meaning: suitcase. Only luggage travels on a Flugzeug.',
  },
  {
    id: 'v12',
    section: 'wortschatz',
    topic: 'Einkaufen',
    lektion: 'Lektion 16',
    prompt: 'Dieses Handy kostet nur 99 Euro. Das ist ein gutes ___.',
    options: ['Angebot', 'Rezept', 'Fieber', 'Durst'],
    answer: 'Angebot',
    explanation: 'Correct answer: Angebot — meaning: offer. A low price is a good Angebot.',
  },
  {
    id: 'v13',
    section: 'wortschatz',
    topic: 'Termine',
    lektion: 'Lektion 6',
    prompt: 'Haben Sie morgen einen freien ___? Es ist sehr wichtig.',
    options: ['Termin', 'Urlaub', 'Ausflug', 'Koffer'],
    answer: 'Termin',
    explanation: 'Correct answer: Termin — meaning: appointment. You ask for a freien Termin, not a freien Koffer.',
  },
  {
    id: 'v14',
    section: 'wortschatz',
    topic: 'Freunde',
    lektion: 'Lektion 8',
    prompt: 'Ich ___ dich zu meinem Geburtstag ___. Kommst du?',
    options: ['lade … ein', 'rufe … an', 'bringe … mit', 'kaufe … ein'],
    answer: 'lade … ein',
    explanation: 'Correct answer: einladen — meaning: to invite. You invite (einladen) someone to a Geburtstag; anrufen means to call.',
  },
  {
    id: 'v15',
    section: 'wortschatz',
    topic: 'Essen und Trinken',
    lektion: 'Lektion 9',
    prompt: 'Der Kaffee kostet nur 1 Euro. Er ist sehr ___.',
    options: ['günstig', 'teuer', 'wichtig', 'schnell'],
    answer: 'günstig',
    explanation: 'Correct answer: günstig — meaning: cheap / good value. teuer is the opposite (expensive).',
  },
];

// ---------------------------------------------------------------------------
// Lesen — 4 original A1 texts, 10 questions (3 + 3 + 2 + 2)
// ---------------------------------------------------------------------------
export const READING_TEXTS = [
  {
    id: 'r1',
    kind: 'Anzeige',
    title: 'Wohnungsanzeige',
    lektion: 'Lektion 14',
    text: 'Wohnung zu vermieten!\nSchöne 2-Zimmer-Wohnung in der Stadt, nah bei der Schule. Die Wohnung hat ein Wohnzimmer, ein Schlafzimmer, eine Küche und ein Bad. Die Miete ist 700 Euro im Monat. Telefon: 0172 / 345 678. Bitte rufen Sie ab 18 Uhr an!',
    questions: [
      {
        id: 'r1a',
        prompt: 'Wie viele Zimmer hat die Wohnung?',
        options: ['2 Zimmer', '3 Zimmer', '4 Zimmer', '5 Zimmer'],
        answer: '2 Zimmer',
        explanation: 'The text says: “Schöne 2-Zimmer-Wohnung”.',
      },
      {
        id: 'r1b',
        prompt: 'Wie hoch ist die Miete?',
        options: ['700 Euro im Monat', '7000 Euro im Monat', '70 Euro im Monat', '700 Euro im Jahr'],
        answer: '700 Euro im Monat',
        explanation: 'The text says: “Die Miete ist 700 Euro im Monat.” Watch Monat vs. Jahr and 700 vs. 7000.',
      },
      {
        id: 'r1c',
        prompt: 'Wann kann man anrufen?',
        options: ['ab 18 Uhr', 'vor 18 Uhr', 'nur morgens', 'nur am Wochenende'],
        answer: 'ab 18 Uhr',
        explanation: 'The text says: “Bitte rufen Sie ab 18 Uhr an!” — ab (from) is not vor (before).',
      },
    ],
  },
  {
    id: 'r2',
    kind: 'E-Mail',
    title: 'E-Mail von Maria',
    lektion: 'Lektion 12',
    text: 'Liebe Anna,\nam Samstag habe ich Geburtstag. Ich mache eine Party. Kommst du? Wir essen Kuchen und trinken Kaffee. Die Party beginnt um 19 Uhr bei mir zu Hause. Bitte bring nichts mit!\nDeine Maria',
    questions: [
      {
        id: 'r2a',
        prompt: 'Warum schreibt Maria?',
        options: [
          'Sie lädt Anna zu ihrem Geburtstag ein.',
          'Sie sucht eine Wohnung.',
          'Sie verkauft ein Handy.',
          'Sie bestellt einen Tisch im Restaurant.',
        ],
        answer: 'Sie lädt Anna zu ihrem Geburtstag ein.',
        explanation: 'Maria hat Geburtstag, macht eine Party and asks “Kommst du?” — that is an invitation (Einladung).',
      },
      {
        id: 'r2b',
        prompt: 'Um wie viel Uhr beginnt die Party?',
        options: ['um 19 Uhr', 'um 9 Uhr', 'um 7 Uhr', 'um 21 Uhr'],
        answer: 'um 19 Uhr',
        explanation: 'The text says: “Die Party beginnt um 19 Uhr.” 19 Uhr is evening (abends), not 9 Uhr morgens.',
      },
      {
        id: 'r2c',
        prompt: 'Was soll Anna mitbringen?',
        options: ['nichts', 'Kuchen', 'Kaffee', 'Geschenke'],
        answer: 'nichts',
        explanation: 'The text says: “Bitte bring nichts mit!” Kuchen and Kaffee are already at the Party.',
      },
    ],
  },
  {
    id: 'r3',
    kind: 'Angebot',
    title: 'Angebot der Woche',
    lektion: 'Lektion 9',
    text: 'Angebot der Woche!\nÄpfel: nur 2 Euro. Brot: nur 1 Euro. Käse: nur 3 Euro. Milch: nur 1 Euro. Nur am Freitag und Samstag!',
    questions: [
      {
        id: 'r3a',
        prompt: 'Was kostet das Brot?',
        options: ['1 Euro', '2 Euro', '3 Euro', '4 Euro'],
        answer: '1 Euro',
        explanation: 'The text says: “Brot: nur 1 Euro.” (2 Euro are the Äpfel, 3 Euro is the Käse.)',
      },
      {
        id: 'r3b',
        prompt: 'Wann gilt das Angebot?',
        options: ['am Freitag und Samstag', 'nur am Montag', 'die ganze Woche', 'am Sonntag'],
        answer: 'am Freitag und Samstag',
        explanation: 'The text says: “Nur am Freitag und Samstag!” — not the whole week.',
      },
    ],
  },
  {
    id: 'r4',
    kind: 'Durchsage',
    title: 'Durchsage am Bahnhof',
    lektion: 'Lektion 10',
    text: 'Achtung, liebe Gäste! Der Zug fährt heute von Gleis 5, nicht von Gleis 3. Bitte steigen Sie schnell ein. Der Zug wartet nicht lange.',
    questions: [
      {
        id: 'r4a',
        prompt: 'Von welchem Gleis fährt der Zug?',
        options: ['Gleis 5', 'Gleis 3', 'Gleis 15', 'Gleis 50'],
        answer: 'Gleis 5',
        explanation: 'The text says: “von Gleis 5, nicht von Gleis 3.” 15 and 50 only sound similar.',
      },
      {
        id: 'r4b',
        prompt: 'Was sollen die Gäste tun?',
        options: ['schnell einsteigen', 'lange warten', 'zum Gleis 3 gehen', 'den Bahnhof verlassen'],
        answer: 'schnell einsteigen',
        explanation: 'The text says: “Bitte steigen Sie schnell ein. Der Zug wartet nicht lange.”',
      },
    ],
  },
];

/** Flat list of all 40 stored questions (Grammatik + Wortschatz + Lesen). */
export function getStaticExamQuestions() {
  const reading = READING_TEXTS.flatMap((t) =>
    t.questions.map((q) => ({
      ...q,
      section: 'lesen',
      topic: t.kind,
      lektion: t.lektion,
      textId: t.id,
    })),
  );
  return [
    ...GRAMMAR_QUESTIONS.map((q) => ({ ...q })),
    ...VOCAB_QUESTIONS.map((q) => ({ ...q })),
    ...reading,
  ];
}

/** Total number of stored (non-Diktation) questions. Must be 40. */
export const EXAM_STATIC_COUNT =
  GRAMMAR_QUESTIONS.length + VOCAB_QUESTIONS.length + READING_TEXTS.reduce((a, t) => a + t.questions.length, 0);

// ---------------------------------------------------------------------------
// Question banks — every run samples a fresh mix (no fixed sets).
// ---------------------------------------------------------------------------

/** All 110 Grammatik questions (Set-1 plus bank parts 1-2). */
export const GRAMMAR_BANK = [...GRAMMAR_QUESTIONS, ...GRAMMAR_BANK_2, ...GRAMMAR_BANK_3];

/** All 105 Wortschatz questions (Set-1 plus bank parts 1-2). */
export const VOCAB_BANK = [...VOCAB_QUESTIONS, ...VOCAB_BANK_2, ...VOCAB_BANK_3];

/** All 40 Lesen texts (100 questions): the 4 originals plus bank parts 1-3. */
export const READING_BANK_ALL = [...READING_TEXTS, ...READING_BANK_2, ...READING_BANK_3, ...READING_BANK_4];

/** Texts with exactly 3 questions (20). Sample 2 of these per run. */
export const READING_THREE_Q = READING_BANK_ALL.filter((t) => t.questions.length === 3);

/** Texts with exactly 2 questions (20). Sample 2 of these per run. */
export const READING_TWO_Q = READING_BANK_ALL.filter((t) => t.questions.length === 2);

/** Bank sizes for UI display (Diktation is generated, effectively infinite). */
export const BANK_META = {
  grammatik: GRAMMAR_BANK.length,
  wortschatz: VOCAB_BANK.length,
  lesen: READING_BANK_ALL.reduce((a, t) => a + t.questions.length, 0),
  lesenTexts: READING_BANK_ALL.length,
};

/** Find a reading text by id across the whole bank (all 40 texts). */
export function findReadingText(textId) {
  return READING_BANK_ALL.find((t) => t.id === textId) || null;
}

/** Flat list of ALL bank questions (Grammatik + Wortschatz + Lesen). */
export function getFullBankQuestions() {
  const reading = READING_BANK_ALL.flatMap((t) =>
    t.questions.map((q) => ({
      ...q,
      section: 'lesen',
      topic: t.kind,
      lektion: t.lektion,
      textId: t.id,
    })),
  );
  return [
    ...GRAMMAR_BANK.map((q) => ({ ...q })),
    ...VOCAB_BANK.map((q) => ({ ...q })),
    ...reading,
  ];
}
