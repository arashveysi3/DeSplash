import test from 'node:test';
import assert from 'node:assert/strict';
import { filterWordsByScope, getMeaningDisplay, buildChallengeChoices } from './gameUtils.js';

test('multiple lessons can be selected together for the same book', () => {
  const words = [
    { id: 1, book: 'a1.2', lektion: 'l1', german: 'Hallo', meaning_en: 'hello', meaning_fa: 'سلام' },
    { id: 2, book: 'a1.2', lektion: 'l2', german: 'Buch', meaning_en: 'book', meaning_fa: 'کتاب' },
    { id: 3, book: 'a1.1', lektion: 'l1', german: 'Haus', meaning_en: 'house', meaning_fa: 'خانه' },
  ];

  const scoped = filterWordsByScope(words, 'a1.2', ['l1', 'l2']);
  assert.deepEqual(scoped.map((w) => w.id), [1, 2]);
});

test('German side stays separate from combined English/Persian meaning side', () => {
  const display = getMeaningDisplay({ meaning_en: 'hello', meaning_fa: 'سلام' });
  assert.equal(display, 'hello • سلام');
});

test('challenge choices include Persian and English meanings', () => {
  const word = { id: 1, meaning_en: 'hello', meaning_fa: 'سلام' };
  const pool = [
    { id: 1, meaning_en: 'hello', meaning_fa: 'سلام' },
    { id: 2, meaning_en: 'book', meaning_fa: 'کتاب' },
    { id: 3, meaning_en: 'door', meaning_fa: 'در' },
    { id: 4, meaning_en: 'house', meaning_fa: 'خانه' },
  ];

  const options = buildChallengeChoices(word, pool);
  assert.ok(options.includes('hello'));
  assert.ok(options.includes('سلام'));
  assert.equal(options.length, 4);
});
