import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRecipe, safeHttpUrl } from '../src/lib/validate';

test('accepts a normal recipe and fills in the total time', () => {
  const r = validateRecipe({
    title: '  Linsensuppe ',
    servings: '4',
    prepMinutes: '15',
    cookMinutes: '30',
    tags: ['Soup', 'Soup', ' '],
    ingredients: [
      { quantity: 250, unit: 'g', name: 'Rote Linsen', note: '' },
      { quantity: null, unit: '', name: '   ' },
    ],
    steps: ['Kochen.', ''],
  });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.value.title, 'Linsensuppe');
  assert.equal(r.value.servings, 4);
  assert.equal(r.value.totalMinutes, 45);
  assert.deepEqual(r.value.tags, ['Soup']);
  assert.equal(r.value.ingredients.length, 1);
  assert.deepEqual(r.value.steps, ['Kochen.']);
});

test('rejects bad input with a readable message', () => {
  assert.equal(validateRecipe({ title: '' }).ok, false);
  const bad = validateRecipe({ title: 'X', sourceUrl: 'javascript:alert(1)' });
  assert.ok(!bad.ok && bad.error.includes('link'));
  assert.equal(validateRecipe({ title: 'X', servings: 'many' }).ok, false);
});

test('only http(s) links are imported', () => {
  assert.equal(safeHttpUrl('https://emmikochteinfach.de/klassisches-rindergulasch/'), 'https://emmikochteinfach.de/klassisches-rindergulasch/');
  assert.equal(safeHttpUrl('file:///etc/passwd'), null);
  assert.equal(safeHttpUrl('not a url'), null);
});
