/**
 * Menschen A2.1 Final Mock — Lesen bank.
 *
 * 12 ORIGINAL A2-level texts (Anzeige, E-Mail, Prospekt, Plakat, Info,
 * Speisekarte, Stellenanzeige, Aushang, Umfrage, Brief) with 30 questions:
 * six texts with 3 questions and six texts with 2 questions, so the engine
 * can always sample 2 x 3-question + 2 x 2-question texts per run
 * (src/utils/exam.js keeps each text's questions together).
 *
 * Content words were checked against menchen-a2.1-lernwortchatz.json plus
 * core A1 function words. Nothing is scraped — everything is stored locally
 * so the exam works offline.
 *
 * Same conventions as src/data/exam.js: options[0] is correct in SOURCE
 * order, the engine shuffles a copy at runtime, `answer` is the exact
 * option string, `lektion` is the A2.1 lesson tag (exam.js adds book 'a2.1').
 */

export const READING_BANK_A21 = [
  // --- 3-question texts (a2r1-a2r6) ---
  {
    id: 'a2r1',
    kind: 'Anzeige',
    title: 'Kleinanzeige: Möbel abzugeben',
    lektion: 'Lektion 2',
    text: 'Zu verschenken!\nUnsere Wohnung wird renoviert, deshalb brauchen wir die alten Möbel nicht mehr: ein Regal für die Bücher, eine Lampe für das Wohnzimmer und ein kleiner Tisch für die Küche. Alles ist hübsch, aber dunkel. Der Tisch steht in der Ecke neben dem Fenster.\nBitte holen Sie die Sachen bis Samstag, 18 Uhr ab. Frau Klein, Telefon 0171 / 55 44 33.',
    questions: [
      {
        id: 'a2r1a',
        prompt: 'Was gibt es in der Anzeige?',
        options: [
          'ein Regal, eine Lampe und ein Tisch',
          'ein Sofa, ein Kissen und ein Teppich',
          'ein Schrank, ein Bett und eine Tür',
          'ein Spiegel, ein Vorhang und ein Licht',
        ],
        answer: 'ein Regal, eine Lampe und ein Tisch',
        explanation: 'The text lists exactly three things: „ein Regal für die Bücher, eine Lampe für das Wohnzimmer und ein kleiner Tisch für die Küche“.',
      },
      {
        id: 'a2r1b',
        prompt: 'Warum gibt Frau Klein die Möbel ab?',
        options: [
          'Die Wohnung wird renoviert.',
          'Sie zieht in ein anderes Dorf.',
          'Die Möbel sind kaputt.',
          'Sie braucht Platz für das neue Sofa.',
        ],
        answer: 'Die Wohnung wird renoviert.',
        explanation: 'The text says: „Unsere Wohnung wird renoviert, deshalb brauchen wir die alten Möbel nicht mehr.“',
      },
      {
        id: 'a2r1c',
        prompt: 'Bis wann muss man die Sachen holen?',
        options: ['bis Samstag, 18 Uhr', 'bis Sonntag, 18 Uhr', 'bis Freitag, 12 Uhr', 'bis Montag, 8 Uhr'],
        answer: 'bis Samstag, 18 Uhr',
        explanation: 'The text says: „Bitte holen Sie die Sachen bis Samstag, 18 Uhr ab.“',
      },
    ],
  },
  {
    id: 'a2r2',
    kind: 'E-Mail',
    title: 'E-Mail von Maria',
    lektion: 'Lektion 1',
    text: 'Liebe Anna,\nnächstes Wochenende feiern wir bei meinen Großeltern: Opa wird neunzig! Meine Schwester und ich kommen mit unseren Kindern. Als Kinder haben wir im Garten gespielt und später Puppen gesammelt — heute übernachten die Jugendlichen bei mir und spielen Computerspiele.\nMeine Mutter backt einen großen Kuchen, mein Onkel erzählt Witze. Bitte komm auch! Zum Schluss machen wir ein Foto mit der ganzen Familie.\nDeine Maria',
    questions: [
      {
        id: 'a2r2a',
        prompt: 'Warum schreibt Maria diese E-Mail?',
        options: [
          'Sie lädt Anna zum Geburtstag ihres Opas ein.',
          'Sie verkauft alte Puppen.',
          'Sie sucht eine neue Wohnung.',
          'Sie fragt nach Annas Beruf.',
        ],
        answer: 'Sie lädt Anna zum Geburtstag ihres Opas ein.',
        explanation: 'Opa wird neunzig, Maria describes the Feier and says „Bitte komm auch!“ — that is an invitation.',
      },
      {
        id: 'a2r2b',
        prompt: 'Wer wird neunzig Jahre alt?',
        options: ['Der Großvater', 'Der Onkel', 'Die Schwester', 'Der Jugendliche'],
        answer: 'Der Großvater',
        explanation: 'The text says: „wir feiern bei meinen Großeltern: Opa wird neunzig“. Opa = der Großvater.',
      },
      {
        id: 'a2r2c',
        prompt: 'Was macht die Mutter bei der Feier?',
        options: ['Sie backt einen Kuchen.', 'Sie erzählt Witze.', 'Sie macht das Foto.', 'Sie spielt Computerspiele.'],
        answer: 'Sie backt einen Kuchen.',
        explanation: 'The text says: „Meine Mutter backt einen großen Kuchen.“ The Witze are the Onkel, das Foto macht Maria am Schluss.',
      },
    ],
  },
  {
    id: 'a2r3',
    kind: 'Prospekt',
    title: 'Wanderwoche im Tal',
    lektion: 'Lektion 3',
    text: 'Wanderwoche im Tal\nSie lieben die Natur? Dann sind Sie bei uns richtig: sieben Tage Wandern im Wald, am Fluss und auf dem Hügel. Jeden Morgen gibt es Frühstück, nachmittags ist Zeit für die Sauna oder für das Zelt am See.\nPreis: 320 Euro pro Person, mit Ausrüstung und Beratung. Die Gruppe hat maximal zwölf Gäste. Wer nicht wandern möchte, macht einen Stadtbummel mit. Anmeldung bis 15. Mai.',
    questions: [
      {
        id: 'a2r3a',
        prompt: 'Wie lange dauert die Wanderwoche?',
        options: ['sieben Tage', 'zwölf Tage', 'fünf Tage', 'einen Monat'],
        answer: 'sieben Tage',
        explanation: 'The text says: „sieben Tage Wandern im Wald, am Fluss und auf dem Hügel“. The number zwölf belongs to the Gruppe.',
      },
      {
        id: 'a2r3b',
        prompt: 'Was kostet die Woche pro Person?',
        options: ['320 Euro', '15 Euro', '32 Euro', '700 Euro'],
        answer: '320 Euro',
        explanation: 'The text says: „Preis: 320 Euro pro Person“. 15. Mai is the deadline for the Anmeldung.',
      },
      {
        id: 'a2r3c',
        prompt: 'Was kann man machen, statt zu wandern?',
        options: ['einen Stadtbummel machen', 'in der Werkstatt arbeiten', 'ein Kajak kaufen', 'im Restaurant bestellen'],
        answer: 'einen Stadtbummel machen',
        explanation: 'The text says: „Wer nicht wandern möchte, macht einen Stadtbummel mit.“',
      },
    ],
  },
  {
    id: 'a2r4',
    kind: 'Prospekt',
    title: 'Stadtbesichtigung am Wochenende',
    lektion: 'Lektion 5',
    text: 'Stadtbesichtigung am Wochenende\nEntdecken Sie unsere Stadt! Am Samstag beginnt der Rundgang um 10 Uhr am Rathaus. Der Reiseleiter zeigt den Dom, das Filmmuseum und das alte Brauhaus. Die Fahrt mit dem Schiff auf dem Fluss dauert eine Stunde und ist im Preis von 25 Euro dabei. Für Kinder kostet der Eintritt nichts, mit Ermäßigung zahlt man 15 Euro.\nTreffpunkt ist vor dem Rathaus. Der Höhepunkt des Tages ist die Dom-Führung um 16 Uhr.',
    questions: [
      {
        id: 'a2r4a',
        prompt: 'Wann beginnt der Rundgang am Samstag?',
        options: ['um 10 Uhr', 'um 16 Uhr', 'um 12 Uhr', 'um 19 Uhr'],
        answer: 'um 10 Uhr',
        explanation: 'The text says: „Am Samstag beginnt der Rundgang um 10 Uhr am Rathaus.“ 16 Uhr is the time of the Dom-Führung.',
      },
      {
        id: 'a2r4b',
        prompt: 'Was ist im Preis von 25 Euro dabei?',
        options: ['die Fahrt mit dem Schiff', 'das Hotel', 'das Abendessen', 'die Sauna'],
        answer: 'die Fahrt mit dem Schiff',
        explanation: 'The text says: „Die Fahrt mit dem Schiff auf dem Fluss … ist im Preis von 25 Euro dabei.“',
      },
      {
        id: 'a2r4c',
        prompt: 'Wie viel zahlt ein Kind für den Eintritt?',
        options: ['nichts', '15 Euro', '25 Euro', '10 Euro'],
        answer: 'nichts',
        explanation: 'The text says: „Für Kinder kostet der Eintritt nichts.“ 15 Euro is the price mit Ermäßigung.',
      },
    ],
  },
  {
    id: 'a2r5',
    kind: 'Plakat',
    title: 'Internationales Theaterfestival',
    lektion: 'Lektion 6',
    text: '9. Internationales Theaterfestival\nVom 3. bis 6. Juli zeigt die Stadt wieder Theater aus aller Welt: 20 Gruppen, 40 Veranstaltungen, Musik, Tanz und digitale Kunst. Am Freitag beginnt das Mittelalterfest auf dem Platz vor dem Rathaus — alle tragen Originalkostüme und spielen historische Szenen nach.\nDer Eintritt kostet 12 Euro, mit Karte nur 8 Euro; Schüler bekommen eine Ermäßigung. Das Festival dauert vier Tage und findet bei Regen im Theater statt.',
    questions: [
      {
        id: 'a2r5a',
        prompt: 'Wie viele Tage dauert das Festival?',
        options: ['vier Tage', 'drei Tage', 'neun Tage', 'zwanzig Tage'],
        answer: 'vier Tage',
        explanation: 'Vom 3. bis 6. Juli sind vier Tage, and the text says too: „Das Festival dauert vier Tage“. 20 is the number of Gruppen.',
      },
      {
        id: 'a2r5b',
        prompt: 'Was kostet der Eintritt mit Karte?',
        options: ['8 Euro', '12 Euro', '9 Euro', '40 Euro'],
        answer: '8 Euro',
        explanation: 'The text says: „Der Eintritt kostet 12 Euro, mit Karte nur 8 Euro.“',
      },
      {
        id: 'a2r5c',
        prompt: 'Was passiert, wenn es regnet?',
        options: [
          'Die Veranstaltungen finden im Theater statt.',
          'Das Festival fällt aus.',
          'Das Festival beginnt später.',
          'Der Eintritt wird billiger.',
        ],
        answer: 'Die Veranstaltungen finden im Theater statt.',
        explanation: 'The text says: „Das Festival … findet bei Regen im Theater statt.“',
      },
    ],
  },
  {
    id: 'a2r6',
    kind: 'Info',
    title: 'Info im Fitnessverein',
    lektion: 'Lektion 7',
    text: 'Fit im Verein\nSie wollen abnehmen oder einfach fitter werden? Bei uns trainieren Sie regelmäßig: Montag bis Freitag von 7 bis 22 Uhr, am Wochenende von 9 bis 18 Uhr. Im Preis sind das Fitnesstraining, die Aqua-Fitness und ein Ernährungsplan für Ihre Ernährung.\nAm Anfang sind zweimal pro Woche genug. Unser Trainer stellt mit Ihnen einen Fitnessplan zusammen. Wer sich verletzt, bekommt einen Ratschlag und trainiert später wieder. Der Kurs beginnt mit mindestens acht Teilnehmern. Kommen Sie vorbei — das erste Training kostet nichts!',
    questions: [
      {
        id: 'a2r6a',
        prompt: 'Wann ist das Studio am Samstag offen?',
        options: ['von 9 bis 18 Uhr', 'von 7 bis 22 Uhr', 'den ganzen Tag', 'gar nicht'],
        answer: 'von 9 bis 18 Uhr',
        explanation: 'The text says: „am Wochenende von 9 bis 18 Uhr“. Saturday is part of the weekend; 7 to 22 Uhr is Monday to Friday.',
      },
      {
        id: 'a2r6b',
        prompt: 'Was ist im Preis enthalten?',
        options: [
          'Fitnesstraining, Aqua-Fitness und ein Ernährungsplan',
          'ein Arztbesuch und ein Verband',
          'ein neues Fahrrad',
          'das Mittagessen im Restaurant',
        ],
        answer: 'Fitnesstraining, Aqua-Fitness und ein Ernährungsplan',
        explanation: 'The text says: „Im Preis sind das Fitnesstraining, die Aqua-Fitness und ein Ernährungsplan.“',
      },
      {
        id: 'a2r6c',
        prompt: 'Wie oft soll man am Anfang trainieren?',
        options: ['zweimal pro Woche', 'jeden Tag', 'fünfmal pro Woche', 'einmal im Monat'],
        answer: 'zweimal pro Woche',
        explanation: 'The text says: „Am Anfang sind zweimal pro Woche genug.“',
      },
    ],
  },

  // --- 2-question texts (a2r7-a2r12) ---
  {
    id: 'a2r7',
    kind: 'Speisekarte',
    title: 'Speisekarte: Restaurant „Zur alten Küche“',
    lektion: 'Lektion 10',
    text: 'Restaurant „Zur alten Küche“\nVorspeisen: Tomatensuppe 4,50 € · Salat mit Hähnchen 6,90 €\nHauptgerichte: Schnitzel mit Pommes frites und Soße 11,50 € · vegetarische Pizza mit Käse und Paprika 9,90 € · Rindfleisch mit Kartoffeln und Gemüse 13,90 €\nNachttisch: Kuchen 4,90 € · Smoothie 3,50 €\nGetränke: ein Glas Saft 3,00 € · ein Liter Mineralwasser 4,00 €\nDie Bedienung ist im Preis. Das Lokal ist täglich ab 12 Uhr geöffnet.',
    questions: [
      {
        id: 'a2r7a',
        prompt: 'Was kostet das vegetarische Hauptgericht?',
        options: ['9,90 €', '11,50 €', '13,90 €', '4,50 €'],
        answer: '9,90 €',
        explanation: 'The only vegetarische Hauptgericht is the Pizza mit Käse und Paprika: 9,90 €. The other prices belong to Schnitzel, Rindfleisch and the Suppe.',
      },
      {
        id: 'a2r7b',
        prompt: 'Muss man für die Bedienung extra zahlen?',
        options: ['nein, die Bedienung ist im Preis', 'ja, 3,00 € pro Person', 'ja, aber nur am Abend', 'nur für das Mineralwasser'],
        answer: 'nein, die Bedienung ist im Preis',
        explanation: 'The card says: „Die Bedienung ist im Preis.“ 3,00 € is the price of ein Glas Saft.',
      },
    ],
  },
  {
    id: 'a2r8',
    kind: 'Anzeige',
    title: 'Stellenanzeige: IT-Abteilung',
    lektion: 'Lektion 9',
    text: 'Die Firma Nordwind sucht zum 1. September eine Mitarbeiterin oder einen Mitarbeiter für die IT-Abteilung.\nIhre Arbeit: die Reparatur der Maschine organisieren und mit dem Team produzieren. Die Wochenarbeitszeit sind 38 Stunden, Montag bis Freitag, pünktlich ab 8 Uhr. Wir bieten eine Festanstellung und ein Team von zehn Kolleginnen und Kollegen. Eine Bedingung ist Berufserfahrung. Bewerbung bis 15. August per E-Mail.',
    questions: [
      {
        id: 'a2r8a',
        prompt: 'Was ist eine Bedingung für die Stelle?',
        options: ['Berufserfahrung', 'ein eigenes Auto', 'zehn Jahre im Betrieb', 'Arbeit am Wochenende'],
        answer: 'Berufserfahrung',
        explanation: 'The ad says: „Eine Bedingung ist Berufserfahrung.“ The number zehn belongs to the Team.',
      },
      {
        id: 'a2r8b',
        prompt: 'Wie viele Stunden arbeitet man pro Woche?',
        options: ['38 Stunden', '30 Stunden', '40 Stunden', '8 Stunden'],
        answer: '38 Stunden',
        explanation: 'The ad says: „Die Wochenarbeitszeit sind 38 Stunden“. 8 Uhr is only the start of the day.',
      },
    ],
  },
  {
    id: 'a2r9',
    kind: 'Aushang',
    title: 'Aushang im Krankenhaus',
    lektion: 'Lektion 8',
    text: 'Besuch in der Notaufnahme\nBesuchszeiten sind täglich von 14 bis 18 Uhr, pro Patient zwei Besucher. Bitte warten Sie vor der Tür und fragen Sie die Ärztin, wenn Sie etwas brauchen. Bei einem Notfall sind Besuche nicht möglich: Dann untersuchen die Ärzte den Patienten. Wer Fragen zur Operation hat, spricht mit der Ärztin in der Ambulanz. Kinder unter sechs Jahren dürfen nicht mitkommen.',
    questions: [
      {
        id: 'a2r9a',
        prompt: 'Wann darf man einen Patienten besuchen?',
        options: ['täglich von 14 bis 18 Uhr', 'nur am Wochenende', 'den ganzen Tag', 'nur vormittags'],
        answer: 'täglich von 14 bis 18 Uhr',
        explanation: 'The Aushang says: „Besuchszeiten sind täglich von 14 bis 18 Uhr“.',
      },
      {
        id: 'a2r9b',
        prompt: 'Wie viele Besucher sind pro Patient erlaubt?',
        options: ['zwei', 'sechs', 'vier', 'keine'],
        answer: 'zwei',
        explanation: 'The Aushang says: „pro Patient zwei Besucher“. The number sechs belongs to the children who may not come.',
      },
    ],
  },
  {
    id: 'a2r10',
    kind: 'Umfrage',
    title: 'Umfrage: Was isst die Familie?',
    lektion: 'Lektion 12',
    text: 'Umfrage: Was isst die Familie?\nDie Durchschnittsfamilie kocht viermal pro Woche selbst. 30 % kaufen lieber ein fertiges Gericht, und rund 20 % essen selten Fleisch: vegetarisch oder nur Fisch.\nDie meisten sagen: Zu viel Zucker und zu viel Salz schaden, deshalb kaufen sie mehr Obst und Gemüse. 65 % trinken jeden Tag Mineralwasser, nur 10 % trinken Limonade oder Alkohol.',
    questions: [
      {
        id: 'a2r10a',
        prompt: 'Wie oft kocht die Durchschnittsfamilie selbst?',
        options: ['viermal pro Woche', 'einmal pro Woche', 'jeden Abend', 'nie'],
        answer: 'viermal pro Woche',
        explanation: 'The text says: „Die Durchschnittsfamilie kocht viermal pro Woche selbst.“',
      },
      {
        id: 'a2r10b',
        prompt: 'Wie viele Prozent trinken jeden Tag Mineralwasser?',
        options: ['65 %', '30 %', '20 %', '10 %'],
        answer: '65 %',
        explanation: 'The text says: „65 % trinken jeden Tag Mineralwasser“. 30 % buy fertige Gerichte, 20 % eat rarely meat, 10 % drink Limonade or Alkohol.',
      },
    ],
  },
  {
    id: 'a2r11',
    kind: 'Brief',
    title: 'Brief zum Firmenjubiläum',
    lektion: 'Lektion 11',
    text: 'Sehr geehrte Frau Berg,\nglückwunsch! Ihre Firma wird dieses Jahr zehn Jahre alt. Wir gratulieren Ihnen und allen Mitarbeiterinnen und Mitarbeitern zum Firmenjubiläum.\nWir schenken Ihnen ein Gästebuch für die Firma und einen Korb mit Obst und Saft. Für die nächsten zehn Jahre wünschen wir Ihnen viel Erfolg und viel Glück für die Zusammenarbeit mit unseren Geschäftspartnern.\nMit freundlichen Grüßen\nIhr Team von SüdTech',
    questions: [
      {
        id: 'a2r11a',
        prompt: 'Warum schreiben die Kollegen diesen Brief?',
        options: [
          'Sie gratulieren zum Firmenjubiläum.',
          'Sie beschweren sich über eine Lieferung.',
          'Sie suchen einen Job in der Firma.',
          'Sie wollen die Firma verkaufen.',
        ],
        answer: 'Sie gratulieren zum Firmenjubiläum.',
        explanation: 'The letter says: „glückwunsch! Ihre Firma wird dieses Jahr zehn Jahre alt. Wir gratulieren … zum Firmenjubiläum.“',
      },
      {
        id: 'a2r11b',
        prompt: 'Was bekommt Frau Berg als Geschenk?',
        options: [
          'ein Gästebuch und einen Korb mit Obst und Saft',
          'ein Regal und eine Lampe',
          'ein Interview in der Zeitung',
          'eine Eintrittskarte für das Festival',
        ],
        answer: 'ein Gästebuch und einen Korb mit Obst und Saft',
        explanation: 'The letter says: „Wir schenken Ihnen ein Gästebuch für die Firma und einen Korb mit Obst und Saft.“',
      },
    ],
  },
  {
    id: 'a2r12',
    kind: 'E-Mail',
    title: 'E-Mail: Der Einkaufszettel',
    lektion: 'Lektion 4',
    text: 'Hallo Tom,\nder Mitbewohner hat den Einkaufszettel vergessen: kein Brot, keine Milch, kein Ei! Ich gehe jetzt in den Supermarkt und kaufe eine Packung Butter, ein Kilo Äpfel, eine Flasche Orangensaft und zwei Packungen Nudeln. Für den Kuchen am Sonntag brauchen wir außerdem Mehl und Zucker.\nKannst du unterwegs die frischen Brötchen mitbringen? Ich hätte gern auch eine Tüte Magermilch.\nDanke und bis später! Lena',
    questions: [
      {
        id: 'a2r12a',
        prompt: 'Was ist das Problem?',
        options: [
          'Der Mitbewohner hat den Einkaufszettel vergessen, es gibt nichts zu essen.',
          'Der Supermarkt ist am Wochenende zu.',
          'Lena kann nicht kochen.',
          'Tom hat den Kuchen gegessen.',
        ],
        answer: 'Der Mitbewohner hat den Einkaufszettel vergessen, es gibt nichts zu essen.',
        explanation: 'The mail says: „der Mitbewohner hat den Einkaufszettel vergessen: kein Brot, keine Milch, kein Ei!“',
      },
      {
        id: 'a2r12b',
        prompt: 'Was soll Tom mitbringen?',
        options: ['frische Brötchen', 'ein Kilo Äpfel', 'zwei Packungen Nudeln', 'Mehl und Zucker'],
        answer: 'frische Brötchen',
        explanation: 'Lena asks: „Kannst du unterwegs die frischen Brötchen mitbringen?“ The Äpfel, Nudeln, Mehl and Zucker buys she herself.',
      },
    ],
  },
];
