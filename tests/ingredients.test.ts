import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIngredientLine,
  parseIngredientBlock,
  parseNumber,
  formatAmount,
  formatServings,
  formatFactor,
  factorFor,
  quantityToText,
} from '../src/lib/ingredients';

test('parses amount, unit, name and note', () => {
  const i = parseIngredientLine('600 g Rindergulasch - ca. 3x3 cm große Stücke');
  assert.equal(i.quantity, 600);
  assert.equal(i.unit, 'g');
  assert.equal(i.name, 'Rindergulasch');
  assert.equal(i.note, 'ca. 3x3 cm große Stücke');
});

test('parses ranges, fractions and German decimals', () => {
  const r = parseIngredientLine('2-3 EL Butterschmalz (alternativ Pflanzenöl)');
  assert.deepEqual([r.quantity, r.quantityMax, r.unit, r.name, r.note], [2, 3, 'EL', 'Butterschmalz', 'alternativ Pflanzenöl']);

  assert.equal(parseIngredientLine('1/2 TL Majoran, getrocknet').quantity, 0.5);
  assert.equal(parseIngredientLine('1/2 TL Majoran, getrocknet').name, 'Majoran, getrocknet');
  assert.equal(parseIngredientLine('½ TL Salz').quantity, 0.5);
  assert.equal(parseIngredientLine('1 ½ kg Kartoffeln').quantity, 1.5);
  assert.equal(parseIngredientLine('1½ kg Kartoffeln').unit, 'kg');
  assert.equal(parseIngredientLine('1,5 l Milch').quantity, 1.5);
  assert.equal(parseIngredientLine('2 bis 3 Zwiebeln').quantityMax, 3);
  assert.equal(parseIngredientLine('500g Mehl').unit, 'g');
});

test('handles unit words and lines without amounts', () => {
  assert.equal(parseIngredientLine('1 Msp. Cayennepfeffer').unit, 'Msp.');
  assert.equal(parseIngredientLine('1 Prise Salz').unit, 'Prise');
  assert.equal(parseIngredientLine('2 Esslöffel Öl').unit, 'EL');
  assert.equal(parseIngredientLine('2 tbsp olive oil').unit, 'EL');
  const garlic = parseIngredientLine('1 Knoblauchzehe');
  assert.deepEqual([garlic.quantity, garlic.unit, garlic.name], [1, '', 'Knoblauchzehe']);
  const none = parseIngredientLine('Salz und Pfeffer');
  assert.deepEqual([none.quantity, none.unit, none.name], [null, '', 'Salz und Pfeffer']);
  // a word that only starts like a unit is part of the name
  assert.equal(parseIngredientLine('2 Glasnudeln').unit, '');
});

test('pasted blocks keep group headings', () => {
  const list = parseIngredientBlock('Für den Teig:\n200 g Mehl\n1 Ei\n\nFür die Sauce:\n200 ml Sahne');
  assert.equal(list.length, 3);
  assert.equal(list[0].group, 'Für den Teig');
  assert.equal(list[2].group, 'Für die Sauce');
});

test('unscaled amounts are shown exactly as written', () => {
  assert.equal(formatAmount(parseIngredientLine('125 g Butter')), '125 g');
  assert.equal(formatAmount(parseIngredientLine('2-3 EL Öl')), '2–3 EL');
  assert.equal(formatAmount(parseIngredientLine('1/2 TL Majoran')), '½ TL');
  assert.equal(formatAmount(parseIngredientLine('1,25 kg Kartoffeln')), '1,25 kg');
  assert.equal(formatAmount(parseIngredientLine('Salz')), '');
});

test('scales the Gulasch by 1.5 with tidy rounding', () => {
  const f = factorFor(parseIngredientLine('600 g Rindergulasch'), 900)!;
  assert.equal(f, 1.5);
  const at = (line: string) => formatAmount(parseIngredientLine(line), f);
  assert.equal(at('600 g Rindergulasch'), '900 g');
  assert.equal(at('400 ml Rinderfond'), '600 ml');
  assert.equal(at('40 g Tomatenmark'), '60 g');
  assert.equal(at('2-3 EL Butterschmalz'), '3–4½ EL');
  assert.equal(at('1 Knoblauchzehe'), '1½');
  assert.equal(at('1/2 TL Majoran'), '¾ TL');
  assert.equal(at('2 TL Paprikapulver'), '3 TL');
  // pinches stay as they are
  assert.equal(at('1 Prise Salz'), '1 Prise');
  assert.equal(at('1 Msp. Cayennepfeffer'), '1 Msp.');
});

test('big amounts switch units, many teaspoons become tablespoons', () => {
  assert.equal(formatAmount(parseIngredientLine('800 g Kartoffeln'), 2), '1,6 kg');
  assert.equal(formatAmount(parseIngredientLine('750 ml Wasser'), 2), '1,5 l');
  assert.equal(formatAmount(parseIngredientLine('3 TL Zucker'), 4), '4 EL');
});

test('number input and labels', () => {
  assert.equal(parseNumber('1,5'), 1.5);
  assert.equal(parseNumber('900'), 900);
  assert.equal(parseNumber('abc'), null);
  assert.equal(parseNumber('9 g'), null);
  assert.equal(formatServings(6), '6 servings');
  assert.equal(formatServings(1), '1 serving');
  assert.equal(formatServings(4.5), '4½ servings');
  assert.equal(formatFactor(1.5), '×1,5');
  assert.equal(quantityToText({ quantity: 2, quantityMax: 3 }), '2–3');
  assert.equal(quantityToText({ quantity: 0.5, quantityMax: null }), '0,5');
});

test('factorFor refuses non-scalable lines', () => {
  assert.equal(factorFor(parseIngredientLine('1 Prise Salz'), 2), null);
  assert.equal(factorFor(parseIngredientLine('Salz'), 2), null);
  assert.equal(factorFor(parseIngredientLine('600 g Fleisch'), 0), null);
});
