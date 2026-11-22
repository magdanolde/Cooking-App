import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIngredientBlock } from '../src/lib/ingredients';
import { buildShoppingList, shoppingListToText, nameKey } from '../src/lib/shopping';

const gulasch = parseIngredientBlock(
  ['600 g Rindergulasch', '40 g Tomatenmark', '2-3 EL Butterschmalz', '1 Knoblauchzehe', '2 TL Paprikapulver', '1 Prise Salz'].join('\n'),
);
const chili = parseIngredientBlock(
  ['2 Dosen Kidneybohnen', '40 g Tomatenmark', '2 Knoblauchzehen', '2 TL Paprikapulver', 'Salz'].join('\n'),
);

test('adds up a week, scaled to the planned servings', () => {
  const lines = buildShoppingList([
    { recipeTitle: 'Rindergulasch', recipeServings: 4, servings: 6, ingredients: gulasch },
    { recipeTitle: 'Rindergulasch', recipeServings: 4, servings: 2, isLeftover: true, ingredients: gulasch },
    { recipeTitle: 'Chili sin Carne', recipeServings: 4, servings: 4, ingredients: chili },
  ]);
  const by = (name: string) => lines.find((l) => l.name.startsWith(name))!;

  assert.equal(by('Rindergulasch').amount, '900 g'); // leftovers not counted
  assert.equal(by('Tomatenmark').amount, '100 g');
  assert.equal(by('Tomatenmark').detail, 'Rindergulasch 60 g + Chili sin Carne 40 g');
  assert.equal(by('Knoblauchzehe').amount, '4'); // 1.5 + 2 = 3.5 → rounded up
  assert.equal(by('Kidneybohnen').amount, '2 Dose');
  assert.equal(by('Paprikapulver').amount, '5 TL');
  assert.equal(by('Paprikapulver').pantry, true);
  assert.equal(by('Butterschmalz').amount, '3–4½ EL');
  assert.equal(by('Salz').amount, '');
  assert.equal(by('Salz').pantry, true);
  assert.equal(by('Rindergulasch').pantry, false);
});

test('different unit families stay separate lines', () => {
  const lines = buildShoppingList([
    { recipeTitle: 'A', recipeServings: 2, servings: 2, ingredients: parseIngredientBlock('200 g Sahne') },
    { recipeTitle: 'B', recipeServings: 2, servings: 2, ingredients: parseIngredientBlock('0,2 l Sahne\n100 ml Sahne') },
  ]);
  const sahne = lines.filter((l) => l.name === 'Sahne').map((l) => l.amount).sort();
  assert.deepEqual(sahne, ['200 g', '300 ml']);
});

test('plural and singular share a key', () => {
  assert.equal(nameKey('Zwiebeln'), nameKey('Zwiebel'));
  assert.equal(nameKey('Knoblauchzehen'), nameKey('Knoblauchzehe'));
  assert.equal(nameKey('Rote Linsen'), nameKey('rote Linse'));
});

test('text export puts pantry items last', () => {
  const lines = buildShoppingList([
    { recipeTitle: 'Chili', recipeServings: 4, servings: 4, ingredients: chili },
  ]);
  const text = shoppingListToText(lines, ['Milch']);
  assert.ok(text.startsWith('- Milch\n'));
  assert.ok(text.indexOf('Check at home:') > text.indexOf('Kidneybohnen'));
});
