// Grounding tests for the Menschen A2.1 Final Mock: every Wortschatz answer
// must be a real A2.1 vocabulary item, tagged with a Lektion where it actually
// appears. No invented words, no off-book answers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { VOCAB_BANK_A21 } from '../data/examA21V.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const A21_PATH = join(HERE, '..', '..', 'menchen-a2.1-lernwortchatz.json');

/** Lowercased lemma-ish form: no article, no reflexive marker, no punctuation. */
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\(sich\)/g, ' ')
    .replace(/\bsich\b/g, ' ')
    .replace(/^(der|die|das)\s+/, '')
    .replace(/[^a-zäöüß]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Forms of one dataset entry: nouns store the article inside `german`. */
function formsOf(word) {
  const out = [norm(word.german)];
  if (word.plural) out.push(...String(word.plural).split(/[,/]/).map(norm));
  return out.filter(Boolean);
}

/** Tolerant lemma match: exact, prefix (>=5), or differing only by an ending. */
function matches(answer, form) {
  if (!answer || !form) return false;
  if (answer === form) return true;
  const [short, long] = answer.length <= form.length ? [answer, form] : [form, answer];
  if (short.length >= 5 && long.startsWith(short)) return true;
  if (short.length >= 6) {
    let i = 0;
    while (i < short.length && answer[i] === form[i]) i += 1;
    if (i >= short.length - 1) return true;
  }
  return false;
}

function buildIndex() {
  const raw = JSON.parse(readFileSync(A21_PATH, 'utf8'));
  const byLektion = new Map();
  for (const [lektion, data] of Object.entries(raw.lektionen)) {
    const list = [];
    for (const w of data.words || []) list.push(...formsOf(w));
    byLektion.set(lektion, list);
  }
  const all = [...byLektion.values()].flat();
  return { byLektion, all };
}

const { byLektion, all } = buildIndex();

test('every A2.1 Wortschatz answer is a real A2.1 vocabulary item', () => {
  for (const q of VOCAB_BANK_A21) {
    const answer = norm(q.answer);
    assert.ok(answer, `${q.id}: empty answer`);
    assert.ok(
      all.some((form) => matches(answer, form)),
      `${q.id}: "${q.answer}" is not in the A2.1 vocabulary`,
    );
  }
});

test('every A2.1 Wortschatz answer appears in the Lektion it is tagged with', () => {
  for (const q of VOCAB_BANK_A21) {
    const answer = norm(q.answer);
    const forms = byLektion.get(q.lektion) || [];
    assert.ok(
      forms.length > 0,
      `${q.id}: ${q.lektion} has no vocabulary in the A2.1 book`,
    );
    assert.ok(
      forms.some((form) => matches(answer, form)),
      `${q.id}: "${q.answer}" not found in ${q.lektion}`,
    );
  }
});
