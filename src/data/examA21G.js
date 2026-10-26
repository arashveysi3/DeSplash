/**
 * Menschen A2.1 Final Mock — Grammatik bank.
 *
 * Knowledge boundary: the Menschen A2.1 vocabulary dataset
 * (menchen-a2.1-lernwortchatz.json, Lektion 1-12) plus core A1 function
 * words (articles, pronouns, common prepositions and connectors). Every
 * content word in a prompt or option was checked against the A2.1 word
 * list (see the verification script in src/utils/examA21.test.js).
 *
 * Coverage contract (enforced by src/utils/examBank.test.js):
 *  - every topic in GRAMMAR_TOPICS_A21 has at least two questions, so a
 *    Final Mock run can sample one question per topic with variety left;
 *  - every Lektion 1-12 of the book has at least one grammar question.
 *
 * Same conventions as src/data/exam.js:
 *  - exactly 4 options, exactly one correct answer;
 *  - `options[0]` is the correct answer in SOURCE order — the exam engine
 *    shuffles a copy at runtime (src/utils/exam.js);
 *  - `answer` is the exact correct option string (no index drift);
 *  - `lektion` is the A2.1 lesson tag; exam.js tags these items with
 *    book 'a2.1' because A2.1 reuses "Lektion 1-12" like A1.1 does.
 */

export const GRAMMAR_BANK_A21 = [
  // --- Perfekt (a2g1-a2g2) ---
  {
    id: 'a2g1',
    section: 'grammatik',
    topic: 'Perfekt',
    lektion: 'Lektion 1',
    prompt: 'Der kleine Junge ___ in einem Jahr schnell ___.',
    options: ['ist … gewachsen', 'hat … gewachsen', 'ist … gewachst', 'hat … gewachst'],
    answer: 'ist … gewachsen',
    explanation: 'wachsen shows a change of state, so Perfekt uses sein: ist gewachsen. The Partizip II is gewachsen, never gewachst.',
  },
  {
    id: 'a2g2',
    section: 'grammatik',
    topic: 'Perfekt',
    lektion: 'Lektion 5',
    prompt: 'Der Tourist ___ das Museum schon zweimal ___.',
    options: ['hat … besichtigt', 'hat … besichtiget', 'ist … besichtigt', 'hat … gesichtigt'],
    answer: 'hat … besichtigt',
    explanation: 'Verbs on -ieren (besichtigen, fotografieren) form the Partizip II without ge-: besichtigt. With an Akkusativ object the auxiliary is haben.',
  },

  // --- Plusquamperfekt (a2g3-a2g4) ---
  {
    id: 'a2g3',
    section: 'grammatik',
    topic: 'Plusquamperfekt',
    lektion: 'Lektion 8',
    prompt: 'Als der Krankenwagen ankam, ___ die Frau schon nach Hause ___.',
    options: ['war … gegangen', 'hatte … gegangen', 'ist … gegangen', 'war … gehen'],
    answer: 'war … gegangen',
    explanation: 'The earlier past event needs Plusquamperfekt. gehen takes sein, so the form is war gegangen; hatte gegangen is the common mistake.',
  },
  {
    id: 'a2g4',
    section: 'grammatik',
    topic: 'Plusquamperfekt',
    lektion: 'Lektion 8',
    prompt: 'Die Operation war ein Erfolg, denn die Ärzte ___ den Patienten vorher genau ___.',
    options: ['hatten … untersucht', 'hatten … untersuchet', 'haben … untersucht', 'war … untersucht'],
    answer: 'hatten … untersucht',
    explanation: 'untersuchen is untrennbar, so there is no ge-: untersucht. Plusquamperfekt with haben = hatten + Partizip II.',
  },

  // --- Modalverben im Präteritum (a2g5-a2g6) ---
  {
    id: 'a2g5',
    section: 'grammatik',
    topic: 'Modalverben im Präteritum',
    lektion: 'Lektion 8',
    prompt: 'Gestern ___ die Ärztin die Sprechstunde wegen eines Notfalls beenden.',
    options: ['musste', 'muss', 'müsst', 'mussten'],
    answer: 'musste',
    explanation: 'müssen → musste, with no umlaut in the Präteritum stem. muss/müsst are present tense, mussten is plural — and gestern forces the past.',
  },
  {
    id: 'a2g6',
    section: 'grammatik',
    topic: 'Modalverben im Präteritum',
    lektion: 'Lektion 6',
    prompt: 'Wir ___ keine Eintrittskarten bekommen, deshalb waren wir nicht beim Festival.',
    options: ['konnten', 'kannten', 'konntet', 'gekonnt'],
    answer: 'konnten',
    explanation: 'können → konnten. kannten is the Präteritum of kennen (to know a person), konntet is ihr.',
  },

  // --- Reflexive Verben mit Akkusativ (a2g7-a2g8) ---
  {
    id: 'a2g7',
    section: 'grammatik',
    topic: 'Reflexive Verben (Akkusativ)',
    lektion: 'Lektion 7',
    prompt: 'Der Trainer sagt: „Jeder Sportler muss ___ regelmäßig ausruhen.“',
    options: ['sich', 'mich', 'dich', 'uns'],
    answer: 'sich',
    explanation: 'sich ausruhen is reflexive. The subject jeder Sportler is dritte Person, so the reflexive pronoun is sich.',
  },
  {
    id: 'a2g8',
    section: 'grammatik',
    topic: 'Reflexive Verben (Akkusativ)',
    lektion: 'Lektion 1',
    prompt: 'Meine Schwester und ich ___ oft über Kleinigkeiten.',
    options: ['streiten uns', 'streiten sich', 'streiten euch', 'streiten mich'],
    answer: 'streiten uns',
    explanation: 'Meine Schwester und ich = wir, and wir streiten uns. sich belongs to er/sie/es/Sie.',
  },

  // --- Reflexive Verben mit Dativ (a2g9-a2g10) ---
  {
    id: 'a2g9',
    section: 'grammatik',
    topic: 'Reflexive Verben (Dativ)',
    lektion: 'Lektion 2',
    prompt: 'Ich kaufe ___ ein neues Regal für die Ecke.',
    options: ['mir', 'mich', 'dir', 'dich'],
    answer: 'mir',
    explanation: 'The sentence already has an Akkusativ object (ein neues Regal), so the reflexive pronoun stands in Dativ: ich kaufe mir ….',
  },
  {
    id: 'a2g10',
    section: 'grammatik',
    topic: 'Reflexive Verben (Dativ)',
    lektion: 'Lektion 12',
    prompt: 'Der Junge putzt ___ jeden Morgen die Zähne.',
    options: ['sich', 'mich', 'dich', 'uns'],
    answer: 'sich',
    explanation: 'die Zähne is the Akkusativ object, so the reflexive is Dativ. For er/sie/es the Dativ form is also sich.',
  },

  // --- Verben mit Präpositionen + Akkusativ (a2g11-a2g13) ---
  {
    id: 'a2g11',
    section: 'grammatik',
    topic: 'Verben mit Präpositionen (Akkusativ)',
    lektion: 'Lektion 5',
    prompt: 'Die Gruppe wartet ___ den Reiseleiter.',
    options: ['auf', 'an', 'über', 'bei'],
    answer: 'auf',
    explanation: 'warten auf + Akkusativ (auf wen?). an, über and bei do not combine with warten.',
  },
  {
    id: 'a2g12',
    section: 'grammatik',
    topic: 'Verben mit Präpositionen (Akkusativ)',
    lektion: 'Lektion 7',
    prompt: 'Der Arzt rät: „Achten Sie bitte ___ Ihre Ernährung!“',
    options: ['auf', 'über', 'an', 'für'],
    answer: 'auf',
    explanation: 'achten auf + Akkusativ (auf was?). Ihre Ernährung is Akkusativ feminin, which fits auf.',
  },
  {
    id: 'a2g13',
    section: 'grammatik',
    topic: 'Verben mit Präpositionen (Akkusativ)',
    lektion: 'Lektion 9',
    prompt: 'Die Mitarbeiter sprechen lange ___ die neuen Arbeitsbedingungen.',
    options: ['über', 'auf', 'von', 'an'],
    answer: 'über',
    explanation: 'sprechen über + Akkusativ = to talk about something. von would require Dativ (von den Arbeitsbedingungen).',
  },

  // --- Verben mit Präpositionen + Dativ (a2g14-a2g16) ---
  {
    id: 'a2g14',
    section: 'grammatik',
    topic: 'Verben mit Präpositionen (Dativ)',
    lektion: 'Lektion 11',
    prompt: 'Die Gäste ___ am Abend mit dem Chef über das Projekt.',
    options: ['unterhalten sich', 'unterhalten uns', 'unterhalten euch', 'unterhalten mich'],
    answer: 'unterhalten sich',
    explanation: 'The fixed pairing is sich unterhalten mit + Dativ. The subject die Gäste is dritte Person Plural, so the pronoun is sich.',
  },
  {
    id: 'a2g15',
    section: 'grammatik',
    topic: 'Verben mit Präpositionen (Dativ)',
    lektion: 'Lektion 11',
    prompt: 'Wir gratulieren ___ zur Pensionierung.',
    options: ['dem Chef', 'den Chef', 'der Chef', 'des Chefs'],
    answer: 'dem Chef',
    explanation: 'gratulieren takes a Dativ object (wem?): dem Chef. zur Pensionierung is already the second part of the pairing.',
  },
  {
    id: 'a2g16',
    section: 'grammatik',
    topic: 'Verben mit Präpositionen (Dativ)',
    lektion: 'Lektion 11',
    prompt: 'Die Kunden bedanken sich ___ der Verkäuferin für die Beratung.',
    options: ['bei', 'für', 'an', 'über'],
    answer: 'bei',
    explanation: 'sich bedanken bei + Dativ for the person, für + Akkusativ for the thing. The person (die Verkäuferin) needs bei.',
  },

  // --- Präpositionen mit Artikel (a2g17-a2g18) ---
  {
    id: 'a2g17',
    section: 'grammatik',
    topic: 'Präpositionen mit Artikel',
    lektion: 'Lektion 12',
    prompt: 'Die Mutter legt die Milch ___ Kühlschrank.',
    options: ['in den', 'im', 'ins', 'an den'],
    answer: 'in den',
    explanation: 'legen answers Wohin? and takes Akkusativ: in den Kühlschrank (maskulin). im = in dem would be a position (Wo?).',
  },
  {
    id: 'a2g18',
    section: 'grammatik',
    topic: 'Präpositionen mit Artikel',
    lektion: 'Lektion 2',
    prompt: 'Der Spiegel hängt ___ Wand über dem Sofa.',
    options: ['an der', 'an die', 'am', 'in der'],
    answer: 'an der',
    explanation: 'hängen describes a position (Wo?) and takes Dativ: an der Wand (feminin). am = an dem is only for maskulin/neuter nouns.',
  },

  // --- Temporale Präpositionen (a2g19-a2g20) ---
  {
    id: 'a2g19',
    section: 'grammatik',
    topic: 'Temporale Präpositionen',
    lektion: 'Lektion 9',
    prompt: 'Die Firma besteht schon ___ 30 Jahren.',
    options: ['seit', 'für', 'ab', 'bis'],
    answer: 'seit',
    explanation: 'seit + Dativ marks a period that started in the past and is still true (seit 30 Jahren). ab points to a future start.',
  },
  {
    id: 'a2g20',
    section: 'grammatik',
    topic: 'Temporale Präpositionen',
    lektion: 'Lektion 7',
    prompt: '___ nächstem Monat trainiert die Familie zweimal pro Woche.',
    options: ['Ab', 'Seit', 'Bis', 'Während'],
    answer: 'Ab',
    explanation: 'ab = starting point in the future, with Dativ (ab nächstem Monat). seit would need a start in the past.',
  },

  // --- Adjektivdeklination nach bestimmtem Artikel (a2g21-a2g23) ---
  {
    id: 'a2g21',
    section: 'grammatik',
    topic: 'Adjektivdeklination (bestimmter Artikel)',
    lektion: 'Lektion 2',
    prompt: 'Die ___ Wohnung ist hell und gemütlich.',
    options: ['neue', 'neuer', 'neues', 'neuem'],
    answer: 'neue',
    explanation: 'After the definite article die (Nominativ feminin) the adjective takes -e: die neue Wohnung.',
  },
  {
    id: 'a2g22',
    section: 'grammatik',
    topic: 'Adjektivdeklination (bestimmter Artikel)',
    lektion: 'Lektion 11',
    prompt: 'Die Chefin lobt die ___ Mitarbeiterin.',
    options: ['fleißige', 'fleißigen', 'fleißig', 'fleißigem'],
    answer: 'fleißige',
    explanation: 'loben takes Akkusativ; die Mitarbeiterin is feminin, and after the article the ending is -e: die fleißige Mitarbeiterin.',
  },
  {
    id: 'a2g23',
    section: 'grammatik',
    topic: 'Adjektivdeklination (bestimmter Artikel)',
    lektion: 'Lektion 2',
    prompt: 'Ich koche gern mit ___ neuen Herd.',
    options: ['dem', 'den', 'der', 'des'],
    answer: 'dem',
    explanation: 'mit takes Dativ, and der Herd is maskulin → dem. The adjective then also ends in -en: mit dem neuen Herd.',
  },

  // --- Adjektivdeklination nach ein / Possessivartikel (a2g24-a2g26) ---
  {
    id: 'a2g24',
    section: 'grammatik',
    topic: 'Adjektivdeklination (ein / Possessivartikel)',
    lektion: 'Lektion 4',
    prompt: 'Die Mutter kocht ein ___ Ei.',
    options: ['frisches', 'frische', 'frischem', 'frisch'],
    answer: 'frisches',
    explanation: 'kochen takes Akkusativ; das Ei is Neutrum, and after ein the strong ending -es appears: ein frisches Ei.',
  },
  {
    id: 'a2g25',
    section: 'grammatik',
    topic: 'Adjektivdeklination (ein / Possessivartikel)',
    lektion: 'Lektion 1',
    prompt: 'Mein Onkel hat einen ___ Beruf.',
    options: ['spannenden', 'spannend', 'spannende', 'spannendem'],
    answer: 'spannenden',
    explanation: 'After einen the Akkusativ maskulin ending is -en: einen spannenden Beruf. -em is the Dativ ending.',
  },
  {
    id: 'a2g26',
    section: 'grammatik',
    topic: 'Adjektivdeklination (ein / Possessivartikel)',
    lektion: 'Lektion 3',
    prompt: 'Wir machen eine ___ Führung durch die Altstadt.',
    options: ['spannende', 'spannend', 'spannendem', 'spannender'],
    answer: 'spannende',
    explanation: 'eine + Akkusativ feminin takes the ending -e: eine spannende Führung.',
  },

  // --- Adjektivdeklination ohne Artikel (a2g27-a2g28) ---
  {
    id: 'a2g27',
    section: 'grammatik',
    topic: 'Adjektivdeklination (ohne Artikel)',
    lektion: 'Lektion 4',
    prompt: 'Zum Frühstück esse ich gern ___ Käse.',
    options: ['frischen', 'frische', 'frisch', 'frischem'],
    answer: 'frischen',
    explanation: 'Without an article the adjective carries the case signal: Akkusativ maskulin → -en (frischen Käse), like den.',
  },
  {
    id: 'a2g28',
    section: 'grammatik',
    topic: 'Adjektivdeklination (ohne Artikel)',
    lektion: 'Lektion 12',
    prompt: 'Zum Abendessen mache ich ___ Kartoffeln in der Pfanne.',
    options: ['gebratene', 'gebratenen', 'gebraten', 'gebratenem'],
    answer: 'gebratene',
    explanation: 'Ohne Artikel im Plural takes the ending -e: gebratene Kartoffeln. -en is the Dativ Plural ending.',
  },

  // --- Komparativ (a2g29-a2g31) ---
  {
    id: 'a2g29',
    section: 'grammatik',
    topic: 'Komparativ',
    lektion: 'Lektion 4',
    prompt: 'Buttermilch ist gesünder ___ Vollmilch.',
    options: ['als', 'wie', 'dann', 'so'],
    answer: 'als',
    explanation: 'A comparison with a Komparativ uses als (gesünder als). wie only appears with gleich or so … wie.',
  },
  {
    id: 'a2g30',
    section: 'grammatik',
    topic: 'Komparativ',
    lektion: 'Lektion 3',
    prompt: 'Die Fahrt mit dem Fahrrad ist ___ als mit dem Bus.',
    options: ['langsamer', 'langsam', 'am langsamsten', 'mehr langsam'],
    answer: 'langsamer',
    explanation: 'The Komparativ of langsam is langsamer (used with als). am langsamsten is the Superlativ.',
  },
  {
    id: 'a2g31',
    section: 'grammatik',
    topic: 'Komparativ',
    lektion: 'Lektion 12',
    prompt: 'Die Durchschnittsfamilie kauft doppelt so viel Milch ___ letzte Woche.',
    options: ['wie', 'als', 'danach', 'denn'],
    answer: 'wie',
    explanation: 'Equal comparisons use so … wie, also after doppelt / dreimal: doppelt so viel wie.',
  },

  // --- Superlativ (a2g32-a2g33) ---
  {
    id: 'a2g32',
    section: 'grammatik',
    topic: 'Superlativ',
    lektion: 'Lektion 5',
    prompt: 'Von allen Museen ist das Filmmuseum ___ .',
    options: ['am interessantesten', 'der interessanteste', 'am interessiertesten', 'interessantste'],
    answer: 'am interessantesten',
    explanation: 'After sein the Superlativ appears as am …sten: ist am interessantesten. der interessanteste is the attributive form.',
  },
  {
    id: 'a2g33',
    section: 'grammatik',
    topic: 'Superlativ',
    lektion: 'Lektion 11',
    prompt: 'Der Mai war ___ Monat des Jahres: Die Firma hatte viel Erfolg.',
    options: ['der erfolgreichste', 'am erfolgreichsten', 'die erfolgreichste', 'des erfolgreichsten'],
    answer: 'der erfolgreichste',
    explanation: 'Attributive Superlativ with the article: der erfolgreichste Monat (maskulin Nominativ). am erfolgreichsten is used without a noun.',
  },

  // --- Relativsatz (Nominativ) (a2g34-a2g35) ---
  {
    id: 'a2g34',
    section: 'grammatik',
    topic: 'Relativsatz (Nominativ)',
    lektion: 'Lektion 5',
    prompt: 'Der Reiseleiter, ___ die Gruppe durch die Altstadt führt, ist sehr sympathisch.',
    options: ['der', 'den', 'dem', 'die'],
    answer: 'der',
    explanation: 'The relative pronoun is the subject of führt, so it stands in Nominativ: der (maskulin, referring to der Reiseleiter).',
  },
  {
    id: 'a2g35',
    section: 'grammatik',
    topic: 'Relativsatz (Nominativ)',
    lektion: 'Lektion 1',
    prompt: 'Die Großmutter, ___ ihren Enkeln Geschichten erzählt, wird neunzig Jahre alt.',
    options: ['die', 'den', 'dem', 'deren'],
    answer: 'die',
    explanation: 'The relative pronoun is the subject (sie erzählt) → die. ihren Enkeln is already the Dativ object inside the clause.',
  },

  // --- Relativsatz (Akkusativ) (a2g36-a2g37) ---
  {
    id: 'a2g36',
    section: 'grammatik',
    topic: 'Relativsatz (Akkusativ)',
    lektion: 'Lektion 5',
    prompt: 'Das Museum, ___ wir gestern besichtigt haben, ist wirklich sehenswert.',
    options: ['das', 'den', 'der', 'dem'],
    answer: 'das',
    explanation: 'Here the pronoun is the object (wir besichtigen es), so it takes Akkusativ: das (Neutrum, referring to das Museum).',
  },
  {
    id: 'a2g37',
    section: 'grammatik',
    topic: 'Relativsatz (Akkusativ)',
    lektion: 'Lektion 12',
    prompt: 'Der Kuchen, ___ die Oma gebacken hat, schmeckt fantastisch.',
    options: ['den', 'der', 'dem', 'das'],
    answer: 'den',
    explanation: 'The object of gebacken hat is the cake → Akkusativ maskulin: den.',
  },

  // --- Relativsatz mit Präposition (a2g38-a2g40) ---
  {
    id: 'a2g38',
    section: 'grammatik',
    topic: 'Relativsatz mit Präposition',
    lektion: 'Lektion 11',
    prompt: 'Der Kunde, ___ die Chefin wartet, ist noch nicht im Lokal.',
    options: ['auf den', 'der den', 'auf die', 'dem'],
    answer: 'auf den',
    explanation: 'warten auf + Akkusativ, and the preposition moves in front of the relative pronoun: der Kunde → auf den.',
  },
  {
    id: 'a2g39',
    section: 'grammatik',
    topic: 'Relativsatz mit Präposition',
    lektion: 'Lektion 11',
    prompt: 'Der Kollege, ___ ich mich am Wochenende unterhalten habe, kommt aus Portugal.',
    options: ['mit dem', 'den', 'über den', 'zu dem'],
    answer: 'mit dem',
    explanation: 'sich unterhalten mit + Dativ: der Kollege → mit dem. The preposition stays with the relative pronoun.',
  },
  {
    id: 'a2g40',
    section: 'grammatik',
    topic: 'Relativsatz mit Präposition',
    lektion: 'Lektion 9',
    prompt: 'Die Werkstatt, ___ das Fahrzeug repariert wird, ist ganz in der Nähe.',
    options: ['in der', 'bei der', 'mit der', 'auf die'],
    answer: 'in der',
    explanation: 'reparieren happens in a place (Wo?) → in + Dativ: die Werkstatt → in der.',
  },

  // --- Konnektor obwohl (a2g41-a2g42) ---
  {
    id: 'a2g41',
    section: 'grammatik',
    topic: 'Konnektor obwohl',
    lektion: 'Lektion 8',
    prompt: 'Der Patient geht joggen, ___ er noch Schmerzen im Knie hat.',
    options: ['obwohl', 'weil', 'damit', 'dass'],
    answer: 'obwohl',
    explanation: 'obwohl introduces a concession (contrary expectation) and sends the verb to the end. weil would claim the pain is the reason.',
  },
  {
    id: 'a2g42',
    section: 'grammatik',
    topic: 'Konnektor obwohl',
    lektion: 'Lektion 7',
    prompt: '___ die Familie wenig Zeit hat, trainiert sie dreimal pro Woche.',
    options: ['Obwohl', 'Wegen', 'Trotz', 'Damit'],
    answer: 'Obwohl',
    explanation: 'Only obwohl is a conjunction here and can start a clause with the verb at the end. trotz and wegen are prepositions (+ Dativ / + Genitiv).',
  },

  // --- Konnektor damit (a2g43-a2g44) ---
  {
    id: 'a2g43',
    section: 'grammatik',
    topic: 'Konnektor damit',
    lektion: 'Lektion 9',
    prompt: 'Die Chefin kauft neue Maschinen, damit die Produktion schneller ___ .',
    options: ['wächst', 'wachsen', 'zu wachsen', 'wachsen wird können'],
    answer: 'wächst',
    explanation: 'After damit the conjugated verb stands at the end, and die Produktion is singular → wächst.',
  },
  {
    id: 'a2g44',
    section: 'grammatik',
    topic: 'Konnektor damit',
    lektion: 'Lektion 6',
    prompt: 'Die Stadt organisiert ein historisches Fest, ___ Touristen aus aller Welt kommen.',
    options: ['damit', 'obwohl', 'seit', 'als'],
    answer: 'damit',
    explanation: 'A purpose clause with its own subject (die Touristen) needs damit + verb at the end.',
  },

  // --- um … zu (a2g45-a2g46) ---
  {
    id: 'a2g45',
    section: 'grammatik',
    topic: 'um … zu',
    lektion: 'Lektion 10',
    prompt: 'Die Familie kocht viel Gemüse, ___ gesund ___ .',
    options: ['um … zu essen', 'für … zu essen', 'weil … zu essen', 'damit … zu essen'],
    answer: 'um … zu essen',
    explanation: 'Purpose with the same subject in both parts = um … zu + Infinitiv. damit would need a second clause with its own subject.',
  },
  {
    id: 'a2g46',
    section: 'grammatik',
    topic: 'um … zu',
    lektion: 'Lektion 7',
    prompt: 'Die Trainerin macht eine Pause, ___ neue Energie zu haben.',
    options: ['um', 'für', 'damit', 'wenn'],
    answer: 'um',
    explanation: 'The Infinitiv group with zu is introduced by um: um neue Energie zu haben.',
  },

  // --- Infinitiv mit zu (a2g47-a2g48) ---
  {
    id: 'a2g47',
    section: 'grammatik',
    topic: 'Infinitiv mit zu',
    lektion: 'Lektion 12',
    prompt: 'Die Kinder lernen, das Frühstück selbst ___ .',
    options: ['zu kochen', 'kochen zu', 'zum kochen', 'dass kochen'],
    answer: 'zu kochen',
    explanation: 'After lernen comes the Infinitiv with zu, and zu stands directly before the verb: selbst zu kochen.',
  },
  {
    id: 'a2g48',
    section: 'grammatik',
    topic: 'Infinitiv mit zu',
    lektion: 'Lektion 12',
    prompt: 'Paul hat vergessen, die Zutaten für den Kuchen ___ .',
    options: ['vorzubereiten', 'vor zu bereiten', 'zubereiten vor', 'vorzubereiten zu'],
    answer: 'vorzubereiten',
    explanation: 'With separable verbs zu goes between the prefix and the stem: vor + zu + bereiten = vorzubereiten.',
  },

  // --- als / wenn (a2g49-a2g50) ---
  {
    id: 'a2g49',
    section: 'grammatik',
    topic: 'als / wenn',
    lektion: 'Lektion 1',
    prompt: '___ ich ein Kind war, habe ich gern mit Puppen gespielt.',
    options: ['Als', 'Wenn', 'Ob', 'Wann'],
    answer: 'Als',
    explanation: 'One single event in the past uses als. wenn is for repeated events and for present or future conditions.',
  },
  {
    id: 'a2g50',
    section: 'grammatik',
    topic: 'als / wenn',
    lektion: 'Lektion 6',
    prompt: 'Immer ___ das Festival stattfindet, kommen die Jugendlichen aus der ganzen Stadt.',
    options: ['wenn', 'als', 'ob', 'seit'],
    answer: 'wenn',
    explanation: 'immer wenn marks a repeated event. als only refers to something that happened once in the past.',
  },

  // --- Indirekte Fragen (a2g51-a2g52) ---
  {
    id: 'a2g51',
    section: 'grammatik',
    topic: 'Indirekte Fragen',
    lektion: 'Lektion 5',
    prompt: 'Der Tourist fragt, ___ der Kaiserdom auch im Winter geöffnet ist.',
    options: ['ob', 'wenn', 'dass', 'was'],
    answer: 'ob',
    explanation: 'An indirect Ja/Nein question uses ob, and the verb stays at the end. wenn is not used for indirect questions.',
  },
  {
    id: 'a2g52',
    section: 'grammatik',
    topic: 'Indirekte Fragen',
    lektion: 'Lektion 11',
    prompt: 'Der Kunde fragt, ___ viel der Rucksack kostet.',
    options: ['wie', 'was', 'ob', 'dass'],
    answer: 'wie',
    explanation: 'The question word stays in the indirect question: wie viel … kostet (verb at the end). ob would ask a Ja/Nein question.',
  },

  // --- Futur I mit werden (a2g53-a2g54) ---
  {
    id: 'a2g53',
    section: 'grammatik',
    topic: 'Futur I mit werden',
    lektion: 'Lektion 3',
    prompt: 'Nächsten Sommer ___ die Gruppe eine Wanderung durch den Wald machen.',
    options: ['wird', 'werden', 'bist', 'hast'],
    answer: 'wird',
    explanation: 'Futur I = werden + Infinitiv. The subject die Gruppe is singular → wird.',
  },
  {
    id: 'a2g54',
    section: 'grammatik',
    topic: 'Futur I mit werden',
    lektion: 'Lektion 5',
    prompt: '___ ihr im Urlaub die Entspannung ___ ?',
    options: ['Werdet … genießen', 'Wird … genießen', 'Werdet … genossen', 'Habt … genießen'],
    answer: 'Werdet … genießen',
    explanation: 'ihr takes werdet, and the second position keeps the Infinitiv: Werdet ihr … genießen?',
  },

  // --- Passiv mit werden (a2g55-a2g56) ---
  {
    id: 'a2g55',
    section: 'grammatik',
    topic: 'Passiv mit werden',
    lektion: 'Lektion 9',
    prompt: 'Die Fahrzeuge in diesem Werk ___ von Robotern ___.',
    options: ['werden … hergestellt', 'wird … hergestellt', 'werden … herstellen', 'haben … hergestellt'],
    answer: 'werden … hergestellt',
    explanation: 'Passiv = werden + Partizip II. The subject die Fahrzeuge is plural → werden hergestellt.',
  },
  {
    id: 'a2g56',
    section: 'grammatik',
    topic: 'Passiv mit werden',
    lektion: 'Lektion 2',
    prompt: 'Nächste Woche ___ die alte Wohnung renoviert.',
    options: ['wird', 'werden', 'wurde', 'hat'],
    answer: 'wird',
    explanation: 'die Wohnung is singular → wird renoviert. wurde is Präteritum and does not fit next week (nächste Woche).',
  },

  // --- N-Deklination (a2g57-a2g58) ---
  {
    id: 'a2g57',
    section: 'grammatik',
    topic: 'N-Deklination',
    lektion: 'Lektion 11',
    prompt: 'Die Verkäuferin schreibt ___ eine kurze Antwort.',
    options: ['dem Kunden', 'den Kunden', 'der Kunde', 'die Kunde'],
    answer: 'dem Kunden',
    explanation: 'schreiben takes Dativ (wem?), and der Kunde is an n-declension noun: dem Kunden. den Kunden would be Akkusativ.',
  },
  {
    id: 'a2g58',
    section: 'grammatik',
    topic: 'N-Deklination',
    lektion: 'Lektion 11',
    prompt: 'Am Montag trifft der neue Mitarbeiter zum ersten Mal ___ .',
    options: ['den Kollegen', 'der Kollege', 'dem Kollege', 'des Kollege'],
    answer: 'den Kollegen',
    explanation: 'treffen takes Akkusativ (wen?), and n-declension adds -n in every case but Nominativ singular: den Kollegen.',
  },
];
