/**
 * A1 Mock Exam — reading bank, part 1 (texts r5-r16, 30 questions).
 *
 * ORIGINAL A1-level texts inspired by everyday situations (no external
 * content scraped; everything stored locally, works offline).
 * Same conventions as src/data/exam.js: every question has exactly
 * 4 options with options[0] correct in source; the engine shuffles at
 * runtime and samples a fresh mix (2 x 3-question texts + 2 x 2-question
 * texts) for every run. Content words verified against the Menschen
 * A1.1 / A1.2 vocabulary datasets.
 */

export const READING_BANK_2 = [
  {
    id: 'r5',
    kind: 'Notiz',
    title: 'Notiz an Lisa',
    lektion: 'Lektion 20',
    text: 'Hallo Lisa!\nIch kaufe heute Brot und Milch. Das Geschirr ist sauber. Bitte bring den Müll raus!\nDanke! Anna',
    questions: [
      {
        id: 'r5a',
        prompt: 'Wer schreibt die Notiz?',
        options: ['Anna', 'Lisa', 'Maria', 'Paul'],
        answer: 'Anna',
        explanation: 'The note is signed: “Danke! Anna”. Lisa receives it.',
      },
      {
        id: 'r5b',
        prompt: 'Was kauft Anna?',
        options: ['Brot und Milch', 'Käse und Äpfel', 'Fisch und Suppe', 'Fleisch und Kuchen'],
        answer: 'Brot und Milch',
        explanation: 'The text says: “Ich kaufe heute Brot und Milch.”',
      },
      {
        id: 'r5c',
        prompt: 'Was soll Lisa machen?',
        options: ['Den Müll rausbringen', 'Das Geschirr spülen', 'Brot kaufen', 'Kochen'],
        answer: 'Den Müll rausbringen',
        explanation: 'The text says: “Bitte bring den Müll raus!” The Geschirr is already sauber.',
      },
    ],
  },
  {
    id: 'r6',
    kind: 'Brief',
    title: 'Brief aus Spanien',
    lektion: 'Lektion 15',
    text: 'Lieber Paul,\nmein Urlaub in Spanien war super. Das Wetter war warm und die Sonne hat geschienen. Das Hotel war klein, aber schön. Nächsten Sommer fahren wir zusammen ans Meer!\nDein Tom',
    questions: [
      {
        id: 'r6a',
        prompt: 'Wo war Tom im Urlaub?',
        options: ['In Spanien', 'In Italien', 'In Frankreich', 'In Deutschland'],
        answer: 'In Spanien',
        explanation: 'The text says: “mein Urlaub in Spanien war super.”',
      },
      {
        id: 'r6b',
        prompt: 'Wie war das Wetter?',
        options: ['Warm', 'Schlecht', 'Kalt', 'Regnerisch'],
        answer: 'Warm',
        explanation: 'The text says: “Das Wetter war warm und die Sonne hat geschienen.”',
      },
      {
        id: 'r6c',
        prompt: 'Was plant Tom?',
        options: [
          'Nächsten Sommer ans Meer fahren',
          'Im Winter Ski fahren',
          'Ein neues Auto kaufen',
          'Eine neue Arbeit suchen',
        ],
        answer: 'Nächsten Sommer ans Meer fahren',
        explanation: 'The text says: “Nächsten Sommer fahren wir zusammen ans Meer!”',
      },
    ],
  },
  {
    id: 'r7',
    kind: 'E-Mail',
    title: 'E-Mail vom Hotel',
    lektion: 'Lektion 16',
    text: 'Sehr geehrte Frau Schmidt,\nIhr Zimmer ist am Freitag ab 15 Uhr frei. Das Zimmer hat eine Dusche und einen Balkon. Das Frühstück kostet 10 Euro. Bitte rufen Sie uns an!\nHotel Sonne',
    questions: [
      {
        id: 'r7a',
        prompt: 'Ab wann ist das Zimmer frei?',
        options: ['Ab Freitag 15 Uhr', 'Ab Montag 10 Uhr', 'Ab Samstag 18 Uhr', 'Ab Sonntag 12 Uhr'],
        answer: 'Ab Freitag 15 Uhr',
        explanation: 'The text says: “Ihr Zimmer ist am Freitag ab 15 Uhr frei.”',
      },
      {
        id: 'r7b',
        prompt: 'Was hat das Zimmer?',
        options: [
          'Eine Dusche und einen Balkon',
          'Eine Küche und eine Garage',
          'Ein Telefon und ein Radio',
          'Einen Garten und einen Hund',
        ],
        answer: 'Eine Dusche und einen Balkon',
        explanation: 'The text says: “Das Zimmer hat eine Dusche und einen Balkon.”',
      },
      {
        id: 'r7c',
        prompt: 'Was kostet das Frühstück?',
        options: ['10 Euro', '15 Euro', '5 Euro', '20 Euro'],
        answer: '10 Euro',
        explanation: 'The text says: “Das Frühstück kostet 10 Euro.”',
      },
    ],
  },
  {
    id: 'r8',
    kind: 'Anzeige',
    title: 'Wohnungsanzeige Nordstadt',
    lektion: 'Lektion 14',
    text: 'Wohnung zu vermieten!\nGroße 3-Zimmer-Wohnung mit Küche und Bad. Die Wohnung ist 80 Quadratmeter groß. Die Miete ist 900 Euro im Monat. Die Wohnung hat keinen Balkon. Telefon: 0151 / 987 654.',
    questions: [
      {
        id: 'r8a',
        prompt: 'Wie groß ist die Wohnung?',
        options: ['3 Zimmer', '2 Zimmer', '4 Zimmer', '1 Zimmer'],
        answer: '3 Zimmer',
        explanation: 'The text says: “Große 3-Zimmer-Wohnung”.',
      },
      {
        id: 'r8b',
        prompt: 'Wie hoch ist die Miete?',
        options: ['900 Euro im Monat', '800 Euro im Monat', '900 Euro im Jahr', '90 Euro im Monat'],
        answer: '900 Euro im Monat',
        explanation: 'The text says: “Die Miete ist 900 Euro im Monat.” Watch Monat vs. Jahr.',
      },
      {
        id: 'r8c',
        prompt: 'Was hat die Wohnung nicht?',
        options: ['Keinen Balkon', 'Kein Bad', 'Keine Küche', 'Kein Telefon'],
        answer: 'Keinen Balkon',
        explanation: 'The text says: “Die Wohnung hat keinen Balkon.” Küche and Bad are listed.',
      },
    ],
  },
  {
    id: 'r9',
    kind: 'Wegbeschreibung',
    title: 'So finden Sie uns',
    lektion: 'Lektion 13',
    text: 'So finden Sie uns:\nGehen Sie geradeaus bis zur Ampel. Dann gehen Sie links in die Bahnhofstraße. Das Hotel ist neben der Post, gegenüber vom Kino.',
    questions: [
      {
        id: 'r9a',
        prompt: 'Wie geht man zuerst?',
        options: ['Geradeaus bis zur Ampel', 'Links bis zur Bank', 'Rechts bis zum Markt', 'Zurück zum Bahnhof'],
        answer: 'Geradeaus bis zur Ampel',
        explanation: 'The text says: “Gehen Sie geradeaus bis zur Ampel.”',
      },
      {
        id: 'r9b',
        prompt: 'Wohin geht man dann links?',
        options: ['In die Bahnhofstraße', 'In die Parkstraße', 'In die Schulstraße', 'In die Gartenstraße'],
        answer: 'In die Bahnhofstraße',
        explanation: 'The text says: “Dann gehen Sie links in die Bahnhofstraße.”',
      },
      {
        id: 'r9c',
        prompt: 'Wo ist das Hotel?',
        options: ['Neben der Post', 'Neben der Bank', 'Neben dem Museum', 'Neben der Schule'],
        answer: 'Neben der Post',
        explanation: 'The text says: “Das Hotel ist neben der Post, gegenüber vom Kino.”',
      },
    ],
  },
  {
    id: 'r10',
    kind: 'Hotel',
    title: 'Hotel Stern — Information',
    lektion: 'Lektion 16',
    text: 'Hotel Stern — Information:\nDas Frühstück gibt es von 7 bis 10 Uhr. Der Aufzug ist kaputt. Bitte nehmen Sie die Treppe! Das Rauchen ist im Hotel verboten.',
    questions: [
      {
        id: 'r10a',
        prompt: 'Wann gibt es Frühstück?',
        options: ['Von 7 bis 10 Uhr', 'Von 6 bis 9 Uhr', 'Von 8 bis 11 Uhr', 'Von 7 bis 12 Uhr'],
        answer: 'Von 7 bis 10 Uhr',
        explanation: 'The text says: “Das Frühstück gibt es von 7 bis 10 Uhr.”',
      },
      {
        id: 'r10b',
        prompt: 'Was ist kaputt?',
        options: ['Der Aufzug', 'Die Heizung', 'Die Dusche', 'Das Telefon'],
        answer: 'Der Aufzug',
        explanation: 'The text says: “Der Aufzug ist kaputt. Bitte nehmen Sie die Treppe!”',
      },
      {
        id: 'r10c',
        prompt: 'Was ist verboten?',
        options: ['Das Rauchen', 'Das Frühstück', 'Die Treppe', 'Das Telefon'],
        answer: 'Das Rauchen',
        explanation: 'The text says: “Das Rauchen ist im Hotel verboten.”',
      },
    ],
  },
  {
    id: 'r11',
    kind: 'Angebot',
    title: 'Mittagsangebot',
    lektion: 'Lektion 9',
    text: 'Mittagsangebot!\nSuppe: 3 Euro. Salat: 4 Euro. Fisch: 8 Euro. Kuchen: 2 Euro. Jeden Tag von 11 bis 14 Uhr!',
    questions: [
      {
        id: 'r11a',
        prompt: 'Was kostet der Salat?',
        options: ['4 Euro', '3 Euro', '8 Euro', '2 Euro'],
        answer: '4 Euro',
        explanation: 'The text says: “Salat: 4 Euro.” (3 Euro is the Suppe, 8 Euro the Fisch.)',
      },
      {
        id: 'r11b',
        prompt: 'Wann gibt es das Angebot?',
        options: ['Von 11 bis 14 Uhr', 'Von 10 bis 12 Uhr', 'Von 12 bis 15 Uhr', 'Abends ab 18 Uhr'],
        answer: 'Von 11 bis 14 Uhr',
        explanation: 'The text says: “Täglich von 11 bis 14 Uhr!”',
      },
    ],
  },
  {
    id: 'r12',
    kind: 'Programm',
    title: 'Stadtfest am Samstag',
    lektion: 'Lektion 12',
    text: 'Stadtfest am Samstag!\nUm 14 Uhr: Musik auf dem Platz. Um 16 Uhr: Theater für Kinder. Um 20 Uhr: Party mit Tanz. Kommt alle! Die Party kostet nichts.',
    questions: [
      {
        id: 'r12a',
        prompt: 'Was gibt es um 16 Uhr?',
        options: ['Theater für Kinder', 'Musik auf dem Platz', 'Party mit Tanz', 'Fußball im Park'],
        answer: 'Theater für Kinder',
        explanation: 'The text says: “Um 16 Uhr: Theater für Kinder.” Musik is at 14 Uhr.',
      },
      {
        id: 'r12b',
        prompt: 'Was kostet die Party?',
        options: ['Nichts', '5 Euro', '10 Euro', '20 Euro'],
        answer: 'Nichts',
        explanation: 'The text says: “Die Party kostet nichts.”',
      },
    ],
  },
  {
    id: 'r13',
    kind: 'Blog',
    title: 'Mein Blog: Berlin',
    lektion: 'Lektion 15',
    text: 'Mein Blog: Berlin!\nBerlin ist groß und interessant. Das Museum ist super, aber teuer. Der Park ist schön und ruhig. Ich liebe diese Stadt!',
    questions: [
      {
        id: 'r13a',
        prompt: 'Wie ist Berlin?',
        options: ['Groß und interessant', 'Klein und langweilig', 'Teuer und laut', 'Schmutzig und hässlich'],
        answer: 'Groß und interessant',
        explanation: 'The text says: “Berlin ist groß und interessant.”',
      },
      {
        id: 'r13b',
        prompt: 'Was ist teuer?',
        options: ['Das Museum', 'Der Park', 'Das Hotel', 'Das Essen'],
        answer: 'Das Museum',
        explanation: 'The text says: “Das Museum ist super, aber teuer.” The Park is schön und ruhig.',
      },
    ],
  },
  {
    id: 'r14',
    kind: 'Einladung',
    title: 'Einladung zur Hochzeit',
    lektion: 'Lektion 24',
    text: 'Einladung!\nWir feiern Hochzeit! Die Feier ist am Samstag um 15 Uhr in der Kirche. Danach gibt es eine Party im Garten. Bitte ruft uns bis Freitag an!',
    questions: [
      {
        id: 'r14a',
        prompt: 'Wann ist die Feier?',
        options: ['Am Samstag um 15 Uhr', 'Am Sonntag um 14 Uhr', 'Am Freitag um 18 Uhr', 'Am Samstag um 10 Uhr'],
        answer: 'Am Samstag um 15 Uhr',
        explanation: 'The text says: “Die Feier ist am Samstag um 15 Uhr in der Kirche.”',
      },
      {
        id: 'r14b',
        prompt: 'Wo ist die Party?',
        options: ['Im Garten', 'In der Kirche', 'Im Hotel', 'Im Restaurant'],
        answer: 'Im Garten',
        explanation: 'The text says: “Danach gibt es eine Party im Garten.” The Kirche is for the Feier.',
      },
    ],
  },
  {
    id: 'r15',
    kind: 'Wetter',
    title: 'Wetter am Wochenende',
    lektion: 'Lektion 23',
    text: 'Wetter am Wochenende:\nAm Samstag ist es kalt und bewölkt. Es gibt Schnee und Wind. Am Sonntag scheint die Sonne. Es ist 0 Grad.',
    questions: [
      {
        id: 'r15a',
        prompt: 'Wie ist das Wetter am Samstag?',
        options: ['Kalt und bewölkt', 'Warm und sonnig', 'Kühl und windig', 'Kalt und windig'],
        answer: 'Kalt und bewölkt',
        explanation: 'The text says: “Am Samstag ist es kalt und bewölkt.” Sonne is on Sonntag.',
      },
      {
        id: 'r15b',
        prompt: 'Wie viel Grad ist es?',
        options: ['0 Grad', '10 Grad', 'Minus 10 Grad', '25 Grad'],
        answer: '0 Grad',
        explanation: 'The text says: “Es ist 0 Grad.”',
      },
    ],
  },
  {
    id: 'r16',
    kind: 'Wetter',
    title: 'Wetter im Sommer',
    lektion: 'Lektion 23',
    text: 'Wetter im Sommer:\nEs ist warm und sonnig. Die Temperatur ist 28 Grad. Es gibt keinen Regen und keine Wolken. Perfekt für den Park!',
    questions: [
      {
        id: 'r16a',
        prompt: 'Wie ist das Wetter?',
        options: ['Warm und sonnig', 'Kalt und windig', 'Kühl und bewölkt', 'Warm und windig'],
        answer: 'Warm und sonnig',
        explanation: 'The text says: “Es ist warm und sonnig.” No Regen, no Wolken.',
      },
      {
        id: 'r16b',
        prompt: 'Wie viel Grad ist es?',
        options: ['28 Grad', '18 Grad', '8 Grad', '38 Grad'],
        answer: '28 Grad',
        explanation: 'The text says: “Die Temperatur ist 28 Grad.” 18 and 38 only sound similar.',
      },
    ],
  },
];
